/**
 * Tap the diagram: the test works out the root bridge itself from the bridge table shown
 * (lowest priority, then lowest MAC), taps that switch on the drawing, and checks.
 */
import { expect, test } from '@playwright/test'

test('Root Wars: tap the root bridge on the diagram', async ({ page }) => {
  await page.goto('./#/play/root-wars/root?seed=3')
  await expect(page.locator('table tbody tr').first()).toBeVisible()
  const rows = await page
    .locator('table tbody tr')
    .evaluateAll((trs) =>
      trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '')),
    )
  const [root] = [...rows].sort(
    (a, b) => Number(a[1]) - Number(b[1]) || (a[2] as string).localeCompare(b[2] as string),
  )
  const name = (root as string[])[0] as string
  await page.locator('.topo-device', { hasText: new RegExp(`^${name}$`) }).click()
  await expect(page.getByRole('button', { name: `Check: ${name}` })).toBeVisible()
  await page.getByRole('button', { name: `Check: ${name}` }).click()
  await expect(page.getByRole('status')).toContainText('Correct')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

test('tapping a port dot names it under the drawing', async ({ page }) => {
  await page.goto('./#/play/root-wars/root-port?seed=1')
  // Neighbouring 48px tap circles can overlap on short links; click this port's own circle.
  const port = page.getByRole('button', { name: /^SW-C Gi0\/1 to / })
  await port.click({ force: true })
  await expect(page.locator('.topo-info')).toContainText(/^SW-C Gi0\/1 to SW-/)
})
