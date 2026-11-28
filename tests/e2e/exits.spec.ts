import { expect, test } from '@playwright/test'

test('be the switch: tap exits on the faceplate; result marks and the replay show', async ({
  page,
}) => {
  await page.goto('./#/play/frame-run/be-switch?seed=1')
  const ports = page.locator('button.port-card')
  await expect(ports.first()).toBeVisible()
  // Pick one port (not where it arrived), then send.
  await page.locator('button.port-card:not(.is-arrived)').first().click()
  await expect(page.locator('button.port-card.is-picked')).toHaveCount(1)
  await page.getByRole('button', { name: /^Send out/ }).click()
  await expect(
    page.locator('button.port-card.is-right, button.port-card.is-wrong').first(),
  ).toBeVisible()
  await expect(page.getByText(/^Out: |Filter or drop it/).first()).toBeVisible()
  // Fits one phone screen side to side.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  )
})

test('be the switch: "Filter or drop it" answers with no exits', async ({ page }) => {
  await page.goto('./#/play/frame-run/be-switch?seed=1')
  await page.getByRole('button', { name: 'Filter or drop it' }).click()
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
})
