import { expect, test } from '@playwright/test'

test('VLSM packing: size each team, place it on a legal spot, pick one up again', async ({
  page,
}) => {
  await page.goto('./#/play/subnet-sprint/vlsm-pack-more?seed=2')
  const check = page.getByRole('button', { name: /to place|Check answer/ })
  // One screen is the phone goal (390×844); the desktop window is shorter but wider.
  if (test.info().project.name === 'phone') {
    const box = await check.boundingBox()
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)
  }
  const caption = (await page.locator('.place-board figcaption').textContent()) ?? ''
  const block = Number(caption.split(',')[0]?.split('/')[1])
  const chips = page.locator('button.place-chip')
  const count = await chips.count()
  for (let i = 0; i < count; i++) {
    const chip = chips.first()
    const [name, rest] = ((await chip.textContent()) ?? '').split(' · ') as [string, string]
    const hosts = Number(rest.split(' ')[0])
    let need = 30
    while (2 ** (32 - need) - 2 < hosts) need--
    await chip.click()
    // Sizes run biggest first from half the block: click Smaller exactly enough times.
    for (let p = block + 1; p < need; p++)
      await page.getByRole('button', { name: 'Smaller' }).click()
    await expect(page.locator('.place-size strong')).toHaveText(`${name} /${need}`)
    await page.locator('.place-cell.is-anchor').first().click()
  }
  // Pick the first piece up and put it back.
  const piece = page.locator('button.place-piece').first()
  await piece.click()
  await expect(page.getByRole('button', { name: '1 to place' })).toBeVisible()
  await page.locator('.place-cell.is-anchor').first().click()
  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.locator('button.place-piece.is-right')).toHaveCount(count)
})
