import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const fixturePath = process.env.WORKFLOW_DEMO_OUTPUT;
test.skip(!fixturePath, 'Seed a disposable workflow portfolio first.');
const demo = fixturePath
  ? JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
  : {};
const api = process.env.WORKFLOW_E2E_API || 'http://127.0.0.1:8019/api';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ token, email }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_email', email);
  }, demo);
});

test('resume requires a complete fresh approval and persists verified progress', async ({
  page,
  request,
}) => {
  await page.goto('/dashboard/financial');
  await page.getByRole('button', { name: 'Ask RAMA', exact: true }).click();
  await page.getByText(/Your workflows/).click();
  await page.getByRole('button', { name: 'Review remaining work' }).click();
  await expect(page.getByText('Changes for your approval')).toBeVisible();
  await expect(page.getByText('Reviewed Suite', { exact: true })).toBeVisible();
  await expect(page.getByText('925', { exact: true })).toBeVisible();
  const headers = { Authorization: `Token ${demo.token}` };
  const before = await request.get(`${api}/properties/${demo.property_id}/`, {
    headers,
  });
  expect((await before.json()).name).toBe('Browser Suite');
  const confirmation = page.waitForResponse(
    (response) =>
      response.url().includes('/confirm/') &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  expect((await confirmation).ok()).toBeTruthy();
  await expect(page.getByText('Changes for your approval')).toHaveCount(0);
  const after = await request.get(`${api}/properties/${demo.property_id}/`, {
    headers,
  });
  expect((await after.json()).name).toBe('Reviewed Suite');
  await page.reload();
  await page.getByRole('button', { name: 'Ask RAMA', exact: true }).click();
  await page.getByText(/Your workflows/).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('update property · Verified')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review remaining work' })
  ).toHaveCount(0);
  await page.screenshot({
    path: '/private/tmp/rentium-rama-workflow-desktop.png',
    fullPage: true,
  });
});

test('mobile progress fits and failures are visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/rama/tasks/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Workflow progress unavailable' }),
    })
  );
  await page.goto('/dashboard/financial');
  await page.getByRole('button', { name: 'Ask RAMA', exact: true }).click();
  await page.getByText(/Your workflows/).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Workflow progress unavailable' })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBeTruthy();
  await page.screenshot({
    path: '/private/tmp/rentium-rama-workflow-mobile.png',
    fullPage: true,
  });
});
