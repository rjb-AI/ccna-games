/**
 * The mini command line end to end: typing, chips, errors, help, and a full work order solved
 * from what the screen shows (the test works out the commands itself from the work order).
 */
import { type Page, expect, test } from '@playwright/test'

async function type(page: Page, line: string) {
  const input = page.locator('#cli-input')
  await input.fill(line)
  await input.press('Enter')
}

test('Port Architect: solve a work order in the command line', async ({ page }) => {
  await page.goto('./#/play/port-architect/access?seed=11')
  const orderList = page.getByRole('list', { name: 'Work order' })
  await expect(orderList.locator('li').first()).toBeVisible()
  const order = await orderList.locator('li').allInnerTexts()
  expect(order.length).toBeGreaterThan(0)

  await type(page, 'conf t')
  await expect(page.locator('.cli-prompt')).toHaveText(/\(config\)#$/)

  // A typo gets the real IOS error with a caret.
  await type(page, 'vlna 10')
  await expect(page.locator('.cli-out').last()).toContainText(
    "% Invalid input detected at '^' marker.",
  )

  for (const line of order) {
    const vlan = /^VLAN (\d+) named (\S+)$/.exec(line)
    const port = /^(Gi\S+): end device in VLAN (\d+)(, set up as an edge port)?$/.exec(line)
    if (vlan) {
      await type(page, `vlan ${vlan[1]}`)
      await type(page, `name ${vlan[2]}`)
      await type(page, 'exit')
    } else if (port) {
      await type(page, `int ${port[1]}`)
      // Use the chips for one command: switchport > mode > access.
      for (const chip of ['switchport', 'mode', 'access']) {
        await page.locator('.cli-chip', { hasText: new RegExp(`^${chip}$`) }).click()
      }
      await page.locator('#cli-input').press('Enter')
      await type(page, `sw acc vlan ${port[2]}`)
      if (port[3]) {
        await type(page, 'spanning-tree portfast')
        await type(page, 'spanning-tree bpduguard enable')
      }
      await type(page, 'exit')
    } else throw new Error(`unexpected work order line: ${line}`)
  }
  await type(page, 'end')
  await type(page, 'show vlan brief')
  await expect(page.locator('.cli-out').last()).toContainText('VLAN Name')

  // "?" lists what can come next.
  await page.getByRole('button', { name: '?' }).click()
  await expect(page.getByLabel('What can come next')).toContainText('configure')

  await page.getByRole('button', { name: 'Check work order' }).click()
  await expect(page.getByRole('status')).toContainText('Correct')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})

test('an unfinished work order lists what is still wrong', async ({ page }) => {
  await page.goto('./#/play/port-architect/phone?seed=3')
  await page.getByRole('button', { name: 'Check work order' }).click()
  await expect(page.getByRole('status')).toContainText('Still to fix')
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
})
