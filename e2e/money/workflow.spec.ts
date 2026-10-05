import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const fixturePath = process.env.MONEY_DEMO_OUTPUT;
test.skip(
  !fixturePath,
  'Seed a disposable backend portfolio and set MONEY_DEMO_OUTPUT.'
);
const demo = fixturePath
  ? JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  : {};
const api = process.env.MONEY_E2E_API || 'http://127.0.0.1:8019/api';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ token, email }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_email', email);
  }, demo);
});

test('statement to approval refreshes money and links exact evidence', async ({
  page,
  request,
}) => {
  await page.goto('/dashboard/financial');
  await expect(
    page.getByRole('heading', { name: 'Money', exact: true })
  ).toBeVisible();
  await expect(
    page.getByText('Recorded cash movement', { exact: true })
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Review statements', exact: true })
    .click();
  await page.getByLabel('Account name').fill('Demo chequing');
  await page.getByLabel('Statement file').setInputFiles({
    name: 'bank.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(demo.csv),
  });
  await page
    .getByRole('button', { name: 'Upload statement', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Prepare transactions', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Preview 2 selected rows' })
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Preview 2 selected rows' }).click();
  await expect(
    page.getByRole('heading', { name: 'Review before approving' })
  ).toBeVisible();
  const before = await request.get(`${api}/ledger/entries/${demo.charge_id}/`, {
    headers: { Authorization: `Token ${demo.token}` },
  });
  expect((await before.json()).outstanding).toBe('500.00');
  await page
    .getByRole('button', { name: 'Approve complete batch', exact: true })
    .click();
  await expect(
    page.getByText('Review saved and verified.', { exact: true })
  ).toBeVisible();
  const after = await request.get(`${api}/ledger/entries/${demo.charge_id}/`, {
    headers: { Authorization: `Token ${demo.token}` },
  });
  expect((await after.json()).outstanding).toBe('0.00');
  const expense = await request.get(
    `${api}/ledger/entries/${demo.expense_id}/`,
    { headers: { Authorization: `Token ${demo.token}` } }
  );
  expect((await expense.json()).paid_on).toBe(demo.date);
  await page
    .getByRole('button', { name: 'Monthly overview', exact: true })
    .click();
  await expect(page.getByText('$425.00', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'View cash records', exact: true })
    .click();
  await page.getByRole('link', { name: 'Water bill', exact: true }).click();
  await expect(
    page.getByText('Showing the selected record.', { exact: false })
  ).toBeVisible();
  await expect(page.getByText('Water bill', { exact: true })).toBeVisible();
});

test('failed money request displays unavailable instead of zero', async ({
  page,
}) => {
  await page.route('**/ledger/money-overview/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Money service temporarily unavailable' }),
    })
  );
  await page.goto('/dashboard/financial');
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: 'Money service temporarily unavailable' })
  ).toBeVisible();
  await expect(page.getByText('Net movement', { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: '/private/tmp/rentium-money-unavailable.png',
    fullPage: true,
  });
});

test('mobile money view remains usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard/financial');
  await expect(
    page.getByText('Recorded cash movement', { exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBeTruthy();
  await page.screenshot({
    path: '/private/tmp/rentium-money-mobile.png',
    fullPage: true,
  });
});
