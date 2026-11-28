/**
 * Swipe deck: the ACL door. The test decides each packet itself from the standard ACL lines on
 * screen (first match wins, implicit deny), swipes the first card by dragging and the rest with
 * the buttons, reading each reason card in between.
 */
import { expect, test } from '@playwright/test'

const ip = (s: string) => s.split('.').reduce((n, o) => n * 256 + Number(o), 0)

/** Does a standard ACL source spec (any | host A | A WILDCARD) match the address? */
function matches(spec: string[], addr: number): boolean {
  if (spec[0] === 'any') return true
  if (spec[0] === 'host') return ip(spec[1] as string) === addr
  const base = ip(spec[0] as string)
  const wild = spec[1] ? ip(spec[1]) : 0
  return ((base ^ addr) & ~wild & 0xffffffff) === 0
}

test('ACL door: swipe each packet permit or deny', async ({ page }) => {
  await page.goto('./#/play/acl-bouncer/door-standard?seed=4')
  await expect(page.locator('.swipe-card')).toBeVisible()
  const lines = (await page.locator('.qcode code').allInnerTexts())
    .map((l) => l.trim())
    .filter((l) => /^access-list \d+ (permit|deny)/.test(l))
  expect(lines.length).toBeGreaterThan(0)
  const verdict = (src: number) => {
    for (const l of lines) {
      const [, , action, ...spec] = l.split(/\s+/)
      if (matches(spec, src)) return action === 'permit' ? 'Permit' : 'Deny'
    }
    return 'Deny'
  }

  for (let i = 0; i < 5; i++) {
    const text = await page.locator('.swipe-card-text').innerText()
    const src = ip(text.split(/\s+/)[1] as string)
    const want = verdict(src)
    if (i === 0) {
      // Drag the first card past the commit point.
      const box = await page.locator('.swipe-card').boundingBox()
      if (!box) throw new Error('no card')
      const y = box.y + box.height / 2
      await page.mouse.move(box.x + box.width / 2, y)
      await page.mouse.down()
      await page.mouse.move(
        box.x + box.width / 2 + (want === 'Permit' ? 1 : -1) * box.width * 0.6,
        y,
        { steps: 8 },
      )
      await page.mouse.up()
    } else {
      await page.getByRole('button', { name: want === 'Permit' ? 'Permit →' : '← Deny' }).click()
    }
    await expect(page.locator('.swipe-reason')).toContainText('✓')
    await page.locator('.swipe-reason button').click()
  }
  await expect(page.getByRole('status')).toContainText('Correct')
})
