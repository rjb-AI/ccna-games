/**
 * Game frame end to end: play, results, review queue, saving, backup.
 * Uses Subnet Sprint's /24 warm-up because the test can work out /24 answers itself.
 */
import { type Page, expect, test } from '@playwright/test'

const LEVEL = './#/play/subnet-sprint/basics-24'

/** "192.168.10.77/24" -> the five right answers, worked out here independently. */
async function rightAnswers(page: Page): Promise<string[]> {
  const value = await page.locator('.facts dd').first().innerText()
  const base = (value.split('/')[0] as string).split('.').slice(0, 3).join('.')
  return [`${base}.0`, `${base}.255`, `${base}.1`, `${base}.254`, '254']
}

/** Type all five fields and submit. Returns the question's facts text (stable per question). */
async function answer(page: Page, correct: boolean): Promise<string> {
  const facts = await page.locator('.facts dd').first().innerText()
  const values = await rightAnswers(page)
  if (!correct) values[0] = values[2] as string // network := first host (wrong)
  for (const v of values) {
    await page.keyboard.type(v)
    await page.keyboard.press('Enter')
  }
  return facts
}

test('a miss goes to reviews and progress survives closing the app', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()

  const card = page.getByRole('article', { name: 'Subnet Sprint' })
  await card.getByRole('link', { name: '▶ Start' }).click()
  const missedFacts = await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Not quite')
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
  await expect(page.locator('.field.is-wrong')).toHaveCount(1)
  await page.getByRole('button', { name: 'Next' }).click()
  for (let i = 0; i < 4; i++) {
    await answer(page, true)
    await expect(page.getByRole('status')).toContainText('Correct')
    await page.getByRole('button', { name: /Next|See results/ }).click()
  }

  await expect(page.getByRole('heading', { level: 1, name: 'Passed' })).toBeVisible()
  const missed = page.locator('.missed li')
  await expect(missed).toHaveCount(1)

  await page.close()
  const again = await context.newPage()
  await again.goto('./')
  await expect(again.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()
  const card2 = again.getByRole('article', { name: 'Subnet Sprint' })
  await expect(card2.getByRole('img', { name: /^1 of \d+ stars$/ })).toBeVisible()
  await expect(card2).toContainText('1 of 8 levels passed')
  await expect(card2).toContainText('1 to review')
  await expect(card2.getByRole('link', { name: '▶ Continue' })).toBeVisible()

  // The game's own screen: stars per level, and its reviews.
  await card2.getByRole('link', { name: 'Levels' }).click()
  await expect(again.getByRole('heading', { level: 1, name: 'Subnet Sprint' })).toBeVisible()
  await expect(
    again.getByRole('link', { name: /\/24 warm-up/ }).getByRole('img', { name: '1 of 3 stars' }),
  ).toBeVisible()

  // The missed question comes back, rebuilt from its seed.
  await again.getByRole('link', { name: 'Review this game: 1 due' }).click()
  await expect(again.locator('.facts dd').first()).toHaveText(missedFacts)
  await answer(again, true)
  await expect(again.getByRole('status')).toContainText('Correct')
  await again.getByRole('button', { name: 'Finish' }).click()
  await expect(again.getByRole('heading', { name: 'Review done' })).toBeVisible()
  await again.getByRole('link', { name: 'Back to levels' }).click()
  await expect(again.getByText('No reviews due for this game.')).toBeVisible()
  await again.getByRole('link', { name: 'Back to hub' }).click()
  await expect(again.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()
})

test('the on-screen keypad types into the active field', async ({ page }) => {
  await page.goto(`${LEVEL}?seed=3`)
  const [network] = await rightAnswers(page)
  for (const ch of network as string) {
    await page.locator(`.keypad button[data-key="${ch}"]`).click()
  }
  await expect(page.locator('.field').first()).toContainText(network as string)
  await page.locator('.keypad button[data-key="Backspace"]').click()
  await expect(page.locator('.field').first()).toContainText((network as string).slice(0, -1))
  // Submitting with empty fields is blocked with a message, not marked wrong.
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByRole('alert')).toContainText(/not a valid IPv4|empty/)
})

test('a review answered wrong is asked again until it is right', async ({ page }) => {
  await page.goto(`${LEVEL}?seed=7`)
  const facts = await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Added to your reviews')

  await page.goto('./#/review')
  await expect(page.locator('.facts dd').first()).toHaveText(facts)
  await answer(page, false)
  await expect(page.getByRole('status')).toContainText('get this one again at the end')
  await page.getByRole('button', { name: 'Next' }).click()

  await expect(page.getByText('Card 2 of 2')).toBeVisible()
  await expect(page.locator('.facts dd').first()).toHaveText(facts)
  await answer(page, true)
  await page.getByRole('button', { name: 'Finish' }).click()
  await expect(page.getByText('got 0 right first time')).toBeVisible()

  await page.getByRole('link', { name: 'Back to hub' }).click()
  await expect(page.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()
  await page.getByRole('link', { name: 'Reviews: 0 due' }).click()
  await expect(page.getByText(/Next review is due in \d+ minutes/)).toBeVisible()
})

test('quitting after a wrong review keeps the card due', async ({ page }) => {
  await page.goto(`${LEVEL}?seed=7`)
  await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
  await page.goto('./#/')
  await expect(page.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()

  await page.getByRole('link', { name: 'Reviews: 1 due' }).click()
  await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Not quite')
  await page.getByRole('link', { name: 'Quit' }).click()
  await expect(page.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()
})

test('progress export and import round trip', async ({ page }) => {
  await page.goto(`${LEVEL}?seed=7`)
  await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
  await page.goto('./#/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ccna-games-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = await download.path()
  await expect(page.getByRole('status')).toContainText('1 review cards')

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('ccna-games')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      }),
  )
  await page.reload()
  page.once('dialog', (d) => void d.accept())
  await page.locator('input[type=file]').setInputFiles(file)
  await expect(page.getByRole('status')).toContainText(
    'Imported 0 level results and 1 review cards',
  )
  await page.getByRole('link', { name: 'Back to hub' }).click()
  await expect(page.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()
})
