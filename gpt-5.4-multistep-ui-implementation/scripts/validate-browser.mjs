import { chromium } from 'playwright'

const BASE_URL = process.env.BOOKING_APP_URL ?? 'http://127.0.0.1:3005'
const OFFER_URL = `${BASE_URL}/offers/117011`

async function waitForPanelToSettle(page) {
  const loadingTitles = [
    /Loading room options/i,
    /Loading activities/i,
    /Searching for available flights/i,
    /Validating prices/i,
    /Loading checkout details/i,
  ]

  for (const title of loadingTitles) {
    const loading = page.getByText(title)
    if (await loading.count()) {
      await loading.last().waitFor({ state: 'hidden', timeout: 90000 }).catch(() => {})
    }
  }
}

async function chooseFixedNights(page) {
  const continueButton = page.getByRole('button', { name: /Step 2\. Rooms/i })
  if (!(await continueButton.isDisabled())) {
    return
  }

  await page.getByRole('button', { name: 'Nights' }).click()
  await page.getByRole('option', { name: /3 nights/i }).click()
}

async function chooseStay(page) {
  await chooseFixedNights(page)

  const availableDays = page.locator('.calendar-grid .calendar-day:not(.is-empty):not(.is-unavailable)')
  const dayCount = await availableDays.count()
  if (!dayCount) {
    throw new Error('No selectable calendar days were rendered.')
  }

  for (let index = 0; index < Math.min(dayCount, 12); index += 1) {
    await availableDays.nth(index).click()
    const continueButton = page.getByRole('button', { name: /Step 2\. Rooms/i })
    await page.waitForTimeout(1200)
    if (!(await continueButton.isDisabled())) {
      await page.locator('.summary-panel-content').waitFor({ state: 'visible', timeout: 30000 })
      return
    }
  }

  throw new Error('Selecting available dates never produced a valid receipt.')
}

async function continueTo(page, heading) {
  const continueButton = page.getByRole('button', { name: /^Step \d+\./ })
  await continueButton.waitFor({ state: 'visible', timeout: 30000 })
  if (await continueButton.isDisabled()) {
    throw new Error(`Continue button was disabled before navigating to "${heading}".`)
  }
  await continueButton.click()
  await page.locator('h2.step-title').filter({ hasText: heading }).first().waitFor({ state: 'visible', timeout: 90000 })
  await waitForPanelToSettle(page)
}

async function validateDesktopFlow(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } })
  const page = await context.newPage()
  const consoleMessages = []
  const pageErrors = []

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleMessages.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.goto(OFFER_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByLabel('Booking steps').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('h2.step-title').filter({ hasText: 'Dates' }).first().waitFor({ state: 'visible', timeout: 30000 })

  await chooseStay(page)
  await continueTo(page, 'Rooms')

  const roomCards = page.locator('.accommodation-list-item, .selection-card.option-media-card')
  if (!(await roomCards.count()) && !(await page.getByText(/No accommodation options are available/i).count())) {
    throw new Error('Rooms step did not render room options or an empty state.')
  }

  await continueTo(page, 'Add activities')

  const activityContent = page.locator('.activity-groups, .info-banner')
  await activityContent.first().waitFor({ state: 'visible', timeout: 60000 })

  const nextLabel = await page.getByRole('button', { name: /^Step \d+\./ }).textContent()
  if (!nextLabel?.includes('Flights') && !nextLabel?.includes('Confirm & pay')) {
    throw new Error(`Unexpected step CTA after activities: "${nextLabel}".`)
  }

  if (nextLabel.includes('Flights')) {
    await continueTo(page, 'Flights')
    const flightsVisible = await Promise.race([
      page.locator('.flight-list').waitFor({ state: 'visible', timeout: 120000 }).then(() => 'list'),
      page.locator('.error-banner').waitFor({ state: 'visible', timeout: 120000 }).then(() => 'error'),
    ])

    if (flightsVisible === 'error') {
      const errorText = await page.locator('.error-banner').textContent()
      throw new Error(`Flights step returned an error instead of results: ${errorText}`)
    }

    await continueTo(page, 'Confirm & pay')
  } else {
    await continueTo(page, 'Confirm & pay')
  }

  await page.getByText(/Lead passenger/i).waitFor({ state: 'visible', timeout: 60000 })
  await page.getByText(/Payment method/i).waitFor({ state: 'visible', timeout: 60000 })
  await page.getByText(/Terms and conditions/i).waitFor({ state: 'visible', timeout: 60000 })

  const result = {
    finalHeading: await page.locator('h2.step-title').filter({ hasText: 'Confirm & pay' }).first().textContent(),
    consoleMessages,
    pageErrors,
  }

  await context.close()
  return result
}

async function validateMobileLayout(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  await page.goto(OFFER_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.getByRole('button', { name: /Step 1 of/i }).waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.mobile-summary-bar').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.booking-step-nav').evaluate((node) => window.getComputedStyle(node).display)
  const inlineRailVisible = await page.locator('.booking-step-nav').isVisible()
  if (inlineRailVisible) {
    throw new Error('Desktop inline step rail is still visible at the mobile viewport.')
  }

  await context.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  try {
    const desktop = await validateDesktopFlow(browser)
    await validateMobileLayout(browser)

    if (desktop.consoleMessages.length || desktop.pageErrors.length) {
      throw new Error(
        [
          desktop.consoleMessages.length ? `Console errors: ${desktop.consoleMessages.join(' | ')}` : '',
          desktop.pageErrors.length ? `Page errors: ${desktop.pageErrors.join(' | ')}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }

    console.log('Browser validation passed.')
    console.log(`Validated route: ${OFFER_URL}`)
    console.log(`Final step reached: ${desktop.finalHeading}`)
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
