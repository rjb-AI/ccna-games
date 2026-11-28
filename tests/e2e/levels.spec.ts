/**
 * Smoke test over every level link on the hub: each one opens and shows a question.
 * Catches a crashing generator or view on phone and desktop sizes without game-specific code.
 */
import { expect, test } from '@playwright/test'

test('every level opens and shows a question', async ({ page }) => {
  await page.goto('./')
  const links = page.locator('a.hub-level')
  await expect(links.first()).toBeVisible()
  const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href') as string))
  expect(hrefs.length).toBeGreaterThan(10)

  for (const href of hrefs) {
    await page.goto(`./${href}?seed=42`)
    await expect(page.locator('#question-prompt'), href).toBeVisible()
    await expect(page.getByText('Question 1 of'), href).toBeVisible()
    // Nothing overflows sideways at this viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow, `${href} scrolls sideways`).toBe(false)
  }
})

test('a multiple-choice question gives feedback with an explanation', async ({ page }) => {
  await page.goto('./#/play/hex-garden/types?seed=5')
  await page.locator('.choice-btn').first().click()
  await expect(page.getByRole('status')).toContainText(/Correct|Not quite/)
  await expect(page.locator('.feedback p').nth(1)).not.toBeEmpty()
})
