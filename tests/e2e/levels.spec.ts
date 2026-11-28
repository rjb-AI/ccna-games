/**
 * Smoke test over every game screen and every level link on them: each opens and shows a
 * question. Catches a crashing generator or view on phone and desktop sizes without
 * game-specific code.
 */
import { type Page, expect, test } from '@playwright/test'

async function noSidewaysScroll(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow, `${where} scrolls sideways`).toBe(false)
}

/**
 * Nothing pokes out past the right edge of the screen (a clipped table column hides answers
 * without making the page scroll). Drawings that scroll on purpose (.topo-scroll) are skipped.
 */
async function nothingOffScreen(page: Page, where: string) {
  const out = await page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const bad: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('main *')) {
      if (el.closest('.topo-scroll')) continue
      const r = el.getBoundingClientRect()
      if (r.width && r.right > w + 1)
        bad.push(`${el.tagName.toLowerCase()}.${el.className} ${Math.round(r.right)}`)
    }
    return bad.slice(0, 3)
  })
  expect(out, `${where} has something past the screen edge`).toEqual([])
}

/** Every diagram label renders at 20 CSS px or more (theme rule), however wide the drawing. */
async function diagramTextReadable(page: Page, where: string) {
  const smallest = await page.evaluate(() => {
    let min = Infinity
    for (const svg of document.querySelectorAll<SVGSVGElement>('.topo svg')) {
      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width
      for (const t of svg.querySelectorAll('text')) {
        min = Math.min(min, parseFloat(t.getAttribute('font-size') ?? '0') * scale)
      }
    }
    return min
  })
  expect(smallest, `${where} diagram text in px`).toBeGreaterThanOrEqual(19.9)
}

test('every level opens and shows a question', async ({ page }) => {
  await page.goto('./')
  await noSidewaysScroll(page, 'hub')
  const gameLinks = page.getByRole('link', { name: 'Levels', exact: true })
  await expect(gameLinks.first()).toBeVisible()
  const games = await gameLinks.evaluateAll((els) =>
    els.map((e) => e.getAttribute('href') as string),
  )
  expect(games.length).toBeGreaterThan(10)

  const hrefs: string[] = []
  for (const game of games) {
    await page.goto(`./${game}`)
    const links = page.locator('a.hub-level')
    await expect(links.first(), game).toBeVisible()
    await noSidewaysScroll(page, game)
    hrefs.push(
      ...(await links.evaluateAll((els) => els.map((e) => e.getAttribute('href') as string))),
    )
    await page.goto(`./${game}/options`)
    await expect(page.getByRole('heading', { name: 'How to play' }), game).toBeVisible()
    await noSidewaysScroll(page, `${game}/options`)
  }
  expect(hrefs.length).toBeGreaterThan(50)

  for (const href of hrefs) {
    await page.goto(`./${href}?seed=42`)
    await expect(page.locator('#question-prompt'), href).toBeVisible()
    await expect(page.getByText('Question 1 of'), href).toBeVisible()
    await noSidewaysScroll(page, href)
    await nothingOffScreen(page, href)
    await diagramTextReadable(page, href)
  }
})

test('a multiple-choice question gives feedback with an explanation', async ({ page }) => {
  await page.goto('./#/play/hex-garden/types?seed=5')
  await page.locator('.choice-btn').first().click()
  await expect(page.getByRole('status')).toContainText(/Correct|Not quite/)
  await expect(page.locator('.feedback p').nth(1)).not.toBeEmpty()
})

test('typed-answer questions fit one phone screen without scrolling', async ({ page }) => {
  // 390x700: an iPhone-size screen with the browser's bars showing.
  await page.setViewportSize({ width: 390, height: 700 })
  for (const level of ['basics-24', 'last-octet', 'any-prefix', 'sprint', 'how-many-drill']) {
    await page.goto(`./#/play/subnet-sprint/${level}?seed=3`)
    await expect(page.locator('#question-prompt')).toBeVisible()
    const fits = await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    )
    expect(fits, `${level} needs scrolling`).toBe(true)
  }
})

test('the next question starts at the top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await page.goto('./#/play/frame-run/trunk?seed=5')
  await page.locator('.choice-btn').first().click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})
