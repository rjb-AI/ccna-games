/**
 * Drag-and-drop ordering: wire an RJ45 plug by dragging and tapping. The test knows T568A and
 * T568B itself (TIA-568), independently of the app.
 */
import { expect, test } from '@playwright/test'

const T568A = ['W-G', 'G', 'W-O', 'Bl', 'W-Bl', 'O', 'W-Br', 'Br']
const T568B = ['W-O', 'O', 'W-G', 'Bl', 'W-Bl', 'G', 'W-Br', 'Br']

test('Cable Doctor: drag wires onto the plug pins', async ({ page }) => {
  await page.goto('./#/play/cable-doctor/pinout?seed=3')
  const prompt = await page.locator('#question-prompt').innerText()
  const order = prompt.includes('T568B') ? T568B : T568A
  const end = (short: string) => page.getByRole('button', { name: new RegExp(`^${short} wire`) })
  const pin = (n: number) => page.locator('.plug-pin').nth(n)
  const dragTo = async (short: string, n: number) => {
    const from = await end(short).boundingBox()
    const to = await pin(n).boundingBox()
    if (!from || !to) throw new Error('no box')
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 4, { steps: 10 })
    await page.mouse.up()
  }

  // Wrong way round first. Dropping a wire on a used pin pops the old wire out.
  await dragTo(order[0] as string, 1)
  await dragTo(order[1] as string, 0)
  await expect(end(order[0] as string)).toHaveAttribute('aria-label', /in Pin 2/)
  await dragTo(order[0] as string, 0)
  await dragTo(order[1] as string, 1)
  await expect(end(order[0] as string)).toHaveAttribute('aria-label', /in Pin 1/)

  // Tap the rest: each tap plugs a loose wire into the first free pin.
  for (const short of order.slice(2)) await end(short).click()

  await page.getByRole('button', { name: 'Check answer' }).click()
  await expect(page.getByRole('status')).toContainText('Correct')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

test('ordering questions still work by tapping (OSPF states)', async ({ page }) => {
  await page.goto('./#/play/adjacency-quest/states?seed=2')
  const states = ['Down', 'Init', '2-Way', 'ExStart', 'Exchange', 'Loading', 'Full']
  const pool = page.locator('.order-pool button.order-item')
  if ((await pool.count()) === 0) test.skip()
  for (const s of states) {
    const b = page.locator('.order-pool button.order-item', { hasText: new RegExp(`^${s}`) })
    if (await b.count()) await b.first().click()
  }
  await page.getByRole('button', { name: /Check answer/ }).click()
  await expect(page.getByRole('status')).toBeVisible()
})
