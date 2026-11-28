import { expect, test } from '@playwright/test'

const DOMAIN_NAMES = [
  'Network Infrastructure & Connectivity',
  'Switching & Network Access',
  'IP Routing',
  'Network Services & Security',
  'AI and Network Operations & Management',
]

test('hub shows all five domain sections', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: 'CCNA Games' })).toBeVisible()

  for (const [i, name] of DOMAIN_NAMES.entries()) {
    const section = page.getByRole('region', { name: `${i + 1}. ${name}` })
    await expect(section).toBeAttached()
    await section.scrollIntoViewIfNeeded()
    await expect(section).toBeVisible()
  }

  // Theme guard: explicit dark background, body text at least 20px.
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    return { bg: s.backgroundColor, size: parseFloat(s.fontSize) }
  })
  expect(body.bg).toBe('rgb(13, 17, 23)')
  expect(body.size).toBeGreaterThanOrEqual(20)
})

test('hub loads offline after the first visit', async ({ page, context }) => {
  await page.goto('./')
  // Wait until the service worker controls the page and the precache is ready.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }),
      )
    }
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'CCNA Games' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: '5. AI and Network Operations & Management' }),
  ).toBeAttached()
  await context.setOffline(false)
})

test('settings shows the app version', async ({ page }) => {
  await page.goto('./#/settings')
  await expect(page.getByText(/^Version [0-9a-f]{7}|^Version dev/)).toBeVisible()
})
