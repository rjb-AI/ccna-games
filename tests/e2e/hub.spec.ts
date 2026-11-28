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

test('domain chips hide sections, and the choice is remembered', async ({ page }) => {
  await page.goto('./')
  const ops = page.getByRole('region', { name: '5. AI and Network Operations & Management' })
  const chip = page.getByRole('button', { name: /5\. Operations & AI/ })
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await expect(ops).toHaveCount(0)
  // The choice is saved to IndexedDB in the background: wait until it is there, then reload.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve) => {
            const open = indexedDB.open('ccna-games')
            open.onsuccess = () => {
              const get = open.result
                .transaction('settings')
                .objectStore('settings')
                .get('settings')
              get.onsuccess = () => resolve(JSON.stringify(get.result?.value?.hiddenDomains ?? []))
              get.onerror = () => resolve('[]')
            }
            open.onerror = () => resolve('[]')
          }),
      ),
    )
    .toContain('domain-5')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'CCNA Games' })).toBeVisible()
  await expect(ops).toHaveCount(0)
  await chip.click()
  await expect(ops).toBeAttached()
})

test('game options: per-game timer, and reset clears only that game', async ({ page }) => {
  // A drill shows its countdown with the timer on.
  await page.goto('./#/play/subnet-sprint/sprint?seed=1')
  await expect(page.getByText(/left$/)).toBeVisible()

  await page.goto('./#/game/subnet-sprint/options')
  await page.getByRole('radio', { name: 'Off for this game' }).first().check()
  await page.goto('./#/play/subnet-sprint/sprint?seed=1')
  await expect(page.getByText('Question 1 of')).toBeVisible()
  await expect(page.getByText(/left$/)).toHaveCount(0)

  // Miss one question so the game has a review card, then reset it.
  await page.goto('./#/play/subnet-sprint/basics-24?seed=7')
  for (const v of ['1.2.3.4', '1.2.3.4', '1.2.3.4', '1.2.3.4', '1']) {
    await page.keyboard.type(v)
    await page.keyboard.press('Enter')
  }
  await expect(page.getByRole('status')).toContainText('Added to your reviews')
  await page.goto('./')
  await expect(page.getByRole('link', { name: 'Reviews: 1 due' })).toBeVisible()

  await page.goto('./#/game/subnet-sprint/options')
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Reset Subnet Sprint' }).click()
  await expect(page.getByRole('status')).toContainText('has been reset')
  await page.goto('./')
  await expect(page.getByRole('link', { name: 'Reviews: 0 due' })).toBeVisible()
  const card = page.getByRole('article', { name: 'Subnet Sprint' })
  await expect(card.getByRole('link', { name: '▶ Start' })).toBeVisible()
})

test('a malformed link does not blank the app', async ({ page }) => {
  await page.goto('./#/game/%')
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible()
  await page.goto('./#/play/subnet-sprint/basics-24?foo=1')
  await expect(page.locator('#question-prompt')).toBeVisible()
  await page.getByRole('link', { name: 'Quit' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Subnet Sprint' })).toBeVisible()
})
