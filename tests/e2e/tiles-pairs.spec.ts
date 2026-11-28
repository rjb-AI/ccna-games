import { expect, test } from '@playwright/test'

test('code tiles: chips fill blanks in order, a filled blank sends its chip back', async ({
  page,
}) => {
  await page.goto('./#/play/playbook-runner/fill-tiles?seed=3')
  const chip = (name: string) =>
    page.locator('button.tile-chip', { hasText: new RegExp(`^${name}$`) })
  await chip('cisco.ios.ios_config').click()
  await expect(page.getByRole('button', { name: 'Blank 1: cisco.ios.ios_config' })).toBeVisible()
  // Tapping the filled blank empties it and returns the chip to the bank.
  await page.getByRole('button', { name: 'Blank 1: cisco.ios.ios_config' }).click()
  await expect(chip('cisco.ios.ios_config')).toBeVisible()
  for (const w of ['cisco.ios.ios_command', 'commands', 'register', 'ansible.builtin.debug'])
    await chip(w).click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByText('Correct', { exact: false }).first()).toBeVisible()
})

test('match pairs: tap one on each side; a wrong pair is marked after checking', async ({
  page,
}) => {
  await page.goto('./#/play/port-defender/match-pairs?seed=3')
  const left = page.locator('.pairs-col').first().locator('button')
  const right = page.locator('.pairs-col').nth(1).locator('button')
  await expect(left).toHaveCount(4)
  // Pair every left card with the right card in the same row (likely some wrong).
  for (let i = 0; i < 4; i++) {
    await left.nth(i).click()
    await right.nth(i).click()
  }
  await expect(left.first().locator('.pair-num')).toHaveText('1')
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.locator('.pair-card.is-right, .pair-card.is-wrong')).toHaveCount(4)
})

test('passport journey: stamp the first link with interface chips; fits one screen', async ({
  page,
}) => {
  await page.goto('./#/play/packet-passport/journey?seed=4')
  const chip = (n: string) => page.locator('button.tile-chip', { hasText: new RegExp(`^${n}$`) })
  // Chips stay in the bank (PC is used twice).
  for (const n of ['PC', 'R1 Gi0/0', 'PC', 'Server']) await chip(n).click()
  const check = page.getByRole('button', { name: 'Check answer' })
  // One screen is the phone goal (390×844); the desktop window is shorter but wider.
  if (test.info().project.name === 'phone') {
    const box = await check.boundingBox()
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)
  }
  await check.click()
  await expect(page.locator('button.tile-slot.is-right')).toHaveCount(4)
})
