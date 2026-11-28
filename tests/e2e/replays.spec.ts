import { expect, test } from '@playwright/test'

test('pull the plug: tap the router, then the diagram shows what happens next', async ({
  page,
}) => {
  await page.goto('./#/play/gateway-guardians/plug?seed=3')
  await page.getByRole('button', { name: 'R1' }).first().click()
  await page.getByRole('button', { name: /^Check/ }).click()
  await expect(page.getByText('What happens next')).toBeVisible()
  await expect(page.locator('.topo-packet')).toHaveCount(2)
  await page.getByRole('button', { name: '▶ Replay' }).click()
  await expect(page.locator('.topo-packet')).toHaveCount(2)
})

test('cut a link: after answering, the new tree and a frame on the opened port', async ({
  page,
}) => {
  await page.goto('./#/play/root-wars/cut?seed=3')
  await page.locator('.topo-hit').first().click()
  await page.getByRole('button', { name: /^Check/ }).click()
  await expect(page.locator('figcaption', { hasText: 'After the failure' })).toBeVisible()
  await expect(page.locator('.topo-packet')).toHaveCount(1)
})
