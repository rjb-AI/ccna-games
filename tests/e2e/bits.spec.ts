/**
 * Bit board: the test works out the mask or wildcard for /p itself and taps those bits; in a
 * Drill the board checks itself as soon as it matches.
 */
import { expect, test } from '@playwright/test'

test('build a mask or wildcard on the bit board', async ({ page }) => {
  await page.goto('./#/play/subnet-sprint/bits-mask?seed=3')
  const prompt = await page.locator('#question-prompt').innerText()
  const p = Number(/\/(\d+)/.exec(prompt)?.[1])
  const wildcard = /wildcard/i.test(prompt)
  const bits = page.locator('button.bit')
  await expect(bits).toHaveCount(32)
  for (let i = 0; i < 32; i++) {
    const on = wildcard ? i >= p : i < p
    if (on) await bits.nth(i).click()
  }
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByRole('status')).toContainText('Correct')
})

test('a broken mask rule is named while you build', async ({ page }) => {
  await page.goto('./#/play/subnet-sprint/bits-mask?seed=2')
  const prompt = await page.locator('#question-prompt').innerText()
  test.skip(/wildcard/i.test(prompt), 'this seed asks for a wildcard')
  await page.locator('button.bit').nth(1).click() // 0 then 1: not a mask
  await expect(page.locator('.bit-issue')).toContainText('bit 1 is 0 but bit 2 is 1')
})

test('drill: the board checks itself when the bits match', async ({ page }) => {
  await page.goto('./#/play/subnet-sprint/bits-rush?seed=2')
  const n = Number(/make (\d+)/.exec(await page.locator('#question-prompt').innerText())?.[1])
  const places = [128, 64, 32, 16, 8, 4, 2, 1]
  for (const [i, v] of places.entries()) if (n & v) await page.locator('button.bit').nth(i).click()
  await expect(page.getByRole('status')).toContainText('Correct')
})
