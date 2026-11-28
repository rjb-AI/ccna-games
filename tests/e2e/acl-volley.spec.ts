import { expect, type Page, test } from '@playwright/test'

/** One screen is the phone goal (390×844); the desktop window is shorter but wider. */
async function fitsPhone(page: Page, name: RegExp) {
  if (test.info().project.name !== 'phone') return
  const box = await page.getByRole('button', { name }).boundingBox()
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)
}

test('place it and test it: every port can be tapped, then the test volley plays', async ({
  page,
}) => {
  await page.goto('./#/play/acl-bouncer/place-test?seed=4')
  await fitsPhone(page, /^Tap the diagram/)
  const ports = page.locator('.topo-hit')
  await expect(ports).toHaveCount(7)
  // No port hides under a neighbour's tap target: each one can be picked.
  for (let i = 0; i < 7; i++) {
    await ports.nth(i).click()
    await expect(page.getByRole('button', { name: /^Check: R\d Gi0\/\d (in|out)$/ })).toBeVisible()
  }
  await page.getByRole('button', { name: /^Check/ }).click()
  await expect(page.locator('.exits-result', { hasText: 'Test volley' })).toBeVisible()
  await expect(page.locator('.qtable tbody tr')).toHaveCount(3)
  await expect(page.locator('.topo-packet').first()).toBeAttached()
  await page.getByRole('button', { name: '▶ Replay' }).click()
  await expect(page.locator('.topo-packet').first()).toBeAttached()
})

test('build the ACL: a wrong tile is fired at the test packets', async ({ page }) => {
  await page.goto('./#/play/acl-bouncer/build-tiles?seed=4')
  await fitsPhone(page, /blanks? left/)
  // Fill every blank with "permit" (chips stay in the bank): some blanks need deny or an
  // address, so the answer is wrong and each wrong tile says what it does to the test packets.
  const blanks = Number(
    (await page.getByRole('button', { name: /blanks left/ }).textContent())?.split(' ')[0],
  )
  for (let i = 0; i < blanks; i++)
    await page.locator('button.tile-chip', { hasText: /^permit$/ }).click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText(/test packets go the wrong way/).first()).toBeVisible()
})
