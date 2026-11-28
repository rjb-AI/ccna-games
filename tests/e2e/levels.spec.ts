/**
 * Smoke test over every game screen and every level link on them: each opens and shows a
 * question. Catches a crashing generator or view on phone and desktop sizes without
 * game-specific code.
 */
import { type Page, expect, test } from '@playwright/test'

async function noSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow, `${where} scrolls sideways`).toBe(false)
}

test('every level opens and shows a question', async ({ page }) => {
  await page.goto('./')
  await noSidewaysScroll(page, 'hub')
  const gameLinks = page.getByRole('link', { name: 'Levels', exact: true })
  await expect(gameLinks.first()).toBeVisible()
  const games = await gameLinks.evaluateAll((els) =>
    els.map((e) => e.getAttribute('href') as string),
  )
  expect(games.length).toBeGreaterThan(10)

  const hrefs: string[] = []
  for (const game of games) {
    await page.goto(`./${game}`)
    const links = page.locator('a.hub-level')
    await expect(links.first(), game).toBeVisible()
    await noSidewaysScroll(page, game)
    hrefs.push(
      ...(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href') as string))),
    )
    await page.goto(`./${game}/options`)
    await expect(page.getByRole('heading', { name: 'How to play' }), game).toBeVisible()
    await noSidewaysScroll(page, `${game}/options`)
  }
  expect(hrefs.length).toBeGreaterThan(50)

  for (const href of hrefs) {
    await page.goto(`./${href}?seed=42`)
    await expect(page.locator('#question-prompt'), href).toBeVisible()
    await expect(page.getByText('Question 1 of'), href).toBeVisible()
    await noSidewaysScroll(page, href)
  }
})

test('a multiple-choice question gives feedback with an explanation', async ({ page }) => {
  await page.goto('./#/play/hex-garden/types?seed=5')
  await page.locator('.choice-btn').first().click()
  await expect(page.getByRole('status')).toContainText(/Correct|Not quite/)
  await expect(page.locator('.feedback p').nth(1)).not.toBeEmpty()
})
