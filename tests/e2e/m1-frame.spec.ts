import { type Page, expect, test } from '@playwright/test'

/** Read "What is a + b?" and return the right answer. The test does its own maths on purpose. */
async function rightAnswer(page: Page): Promise<string> {
  const prompt = await page.locator('.choice-prompt').innerText()
  const m = /What is (\d+) \+ (\d+)\?/.exec(prompt)
  if (!m) throw new Error(`Unexpected prompt: ${prompt}`)
  return String(Number(m[1]) + Number(m[2]))
}

async function answer(page: Page, correct: boolean): Promise<string> {
  const prompt = await page.locator('.choice-prompt').innerText()
  const right = await rightAnswer(page)
  const buttons = page.locator('.choice-btn')
  const texts = await buttons.allInnerTexts()
  const index = texts.findIndex((t) => (t.trim() === right) === correct)
  await buttons.nth(index).click()
  return prompt
}

test('a miss goes to reviews and progress survives closing the app', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()

  // Play the demo Learn level: miss question 1, get the other 4 right.
  await page.getByRole('link', { name: /Learn: small sums/ }).click()
  const missedPrompt = await answer(page, false)
  await expect(page.getByRole('status')).toContainText('Not quite')
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
  await page.getByRole('button', { name: 'Next' }).click()
  for (let i = 0; i < 4; i++) {
    await answer(page, true)
    await expect(page.getByRole('status')).toContainText('Correct')
    await page.getByRole('button', { name: /Next|See results/ }).click()
  }

  // Results screen.
  await expect(page.getByRole('heading', { level: 1, name: 'Passed' })).toBeVisible()
  await expect(page.getByText('80%').first()).toBeVisible()
  const missed = page.locator('.missed li')
  await expect(missed).toHaveCount(1)
  await expect(missed).toContainText(missedPrompt)

  // Close the app completely and open it again.
  await page.close()
  const again = await context.newPage()
  await again.goto('./')
  await expect(again.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()
  await expect(
    again
      .getByRole('link', { name: /Learn: small sums/ })
      .getByRole('img', { name: '1 of 3 stars' }),
  ).toBeVisible()

  // The missed question comes back, rebuilt from its seed.
  await again.getByRole('link', { name: 'Reviews: 1 due' }).click()
  await expect(again.locator('.choice-prompt')).toHaveText(missedPrompt)
  await answer(again, true)
  await expect(again.getByRole('status')).toContainText('Correct')
  await again.getByRole('button', { name: 'Finish' }).click()
  await expect(again.getByRole('heading', { name: 'Review done' })).toBeVisible()
  await again.getByRole('link', { name: 'Back to hub' }).click()
  await expect(again.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()
})

test('progress export and import round trip', async ({ page }) => {
  await page.goto('./#/play/demo/learn?seed=7')
  await answer(page, false)
  await page.goto('./#/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export progress' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ccna-games-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = await download.path()
  await expect(page.getByRole('status')).toContainText('1 review cards')

  // Wipe, then import the file back.
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
