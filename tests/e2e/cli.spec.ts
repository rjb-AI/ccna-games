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
  await page.getByRole('button', { name: 'Show what can come next' }).click()
  await expect(page.getByLabel('What can come next', { exact: true })).toContainText('configure')

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

/** The lines that carry out a Port Architect access work order, worked out from its text. */
function solve(order: string[]): string[] {
  const lines = ['conf t']
  for (const line of order) {
    const vlan = /^VLAN (\d+) named (\S+)$/.exec(line)
    const port = /^(Gi\S+): end device in VLAN (\d+)(, set up as an edge port)?$/.exec(line)
    if (vlan) lines.push(`vlan ${vlan[1]}`, `name ${vlan[2]}`, 'exit')
    else if (port) {
      lines.push(`int ${port[1]}`, 'sw mode acc', `sw acc vlan ${port[2]}`)
      if (port[3]) lines.push('spanning-tree portfast', 'spanning-tree bpduguard enable')
      lines.push('exit')
    } else throw new Error(`unexpected work order line: ${line}`)
  }
  return lines.slice(0, -1) // the last "exit" changes nothing
}

test('Check work order includes a line still in the input', async ({ page }) => {
  await page.goto('./#/play/port-architect/access?seed=11')
  const orderList = page.getByRole('list', { name: 'Work order' })
  await expect(orderList.locator('li').first()).toBeVisible()
  const lines = solve(await orderList.locator('li').allInnerTexts())
  for (const line of lines.slice(0, -1)) await type(page, line)
  await page.locator('#cli-input').fill(lines.at(-1) as string)
  await page.getByRole('button', { name: 'Check work order' }).click()
  await expect(page.getByRole('status')).toContainText('Correct')
})

test('history arrows keep the draft; Start over clears everything', async ({ page }) => {
  await page.goto('./#/play/port-architect/access?seed=11')
  const input = page.locator('#cli-input')
  await type(page, 'conf t')
  await type(page, 'vlan 10')

  // ArrowDown with no history position leaves the input alone.
  await input.fill('nam')
  await input.press('ArrowDown')
  await expect(input).toHaveValue('nam')
  await input.press('ArrowUp')
  await expect(input).toHaveValue('vlan 10')
  await input.press('ArrowUp')
  await expect(input).toHaveValue('conf t')
  await input.press('ArrowDown')
  await expect(input).toHaveValue('vlan 10')
  // Past the newest entry: the draft comes back.
  await input.press('ArrowDown')
  await expect(input).toHaveValue('nam')

  // Accessible helper row.
  await expect(page.getByRole('group', { name: 'Next word' })).toBeVisible()
  const help = page.getByRole('button', { name: 'Show what can come next' })
  const controls = await help.getAttribute('aria-controls')
  expect(controls).toBeTruthy()
  await help.click()
  await expect(page.locator(`#${controls}`)).toBeVisible()

  await input.press('ArrowUp')
  await page.getByRole('button', { name: 'Start over' }).click()
  await expect(input).toHaveValue('')
  await expect(page.locator(`#${controls}`)).toBeHidden()
  await expect(page.locator('.cli-entry')).toHaveCount(0)
  // The history position was reset too: ArrowDown leaves new typing alone.
  await input.fill('x')
  await input.press('ArrowDown')
  await expect(input).toHaveValue('x')
})

test('multi-line answers keep their lines in feedback', async ({ page }) => {
  await page.goto('./#/play/port-architect/phone?seed=3')
  await page.getByRole('button', { name: 'Check work order' }).click()
  const answer = page.locator('.feedback .answer-text')
  await expect(answer).toBeVisible()
  const look = await answer.evaluate((el) => ({
    white: getComputedStyle(el).whiteSpace,
    font: getComputedStyle(el).fontFamily,
    text: (el as HTMLElement).innerText,
  }))
  expect(look.white).toBe('pre-wrap')
  expect(look.font).toMatch(/mono/i)
  expect(look.text.split('\n').length).toBeGreaterThan(1)
})
