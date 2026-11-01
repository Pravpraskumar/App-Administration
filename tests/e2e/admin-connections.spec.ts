import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/app';

test.beforeEach(async ({ page }) => {
  await setupAuthenticatedApp(page);
});

test('administrator can configure a generic MSSQL product connection', async ({ page }) => {
  await page.route('**/api/products/product-1/connection', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: route.request().postData() ?? '{}' });
  });

  await page.goto('/admin/connections');
  await page.getByLabel('Product').selectOption('product-1');
  await page.getByLabel('Database type').selectOption('mssql');

  await expect(page.getByLabel('Database type')).toHaveValue('mssql');
  await expect(page.getByLabel('Host')).toHaveValue('localhost');
  await expect(page.getByLabel('Port')).toHaveValue('1433');
  await expect(page.getByLabel('Database', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Username')).toHaveValue('');
  await expect(page.getByLabel('Encrypt connection')).toBeChecked();

  const transientPassword = `A1!${crypto.randomUUID()}`;
  await page.getByLabel('Database', { exact: true }).fill('external_db');
  await page.getByLabel('Username').fill('service_user');
  await page.getByLabel('Password').fill(transientPassword);
  const requestPromise = page.waitForRequest((request) =>
    request.url().endsWith('/api/products/product-1/connection') && request.method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Save connection' }).click();
  const request = await requestPromise;

  expect(request.postDataJSON()).toEqual({
    databaseType: 'mssql',
    host: 'localhost',
    port: 1433,
    database: 'external_db',
    username: 'service_user',
    password: transientPassword,
    ssl: true,
  });
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveValue('');
});

test('connection save failure remains visible to the administrator', async ({ page }) => {
  await page.route('**/api/products/product-1/connection', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Connection store unavailable' }) });
  });

  await page.goto('/admin/connections');
  await page.getByLabel('Product').selectOption('product-1');
  await page.getByLabel('Password').fill(`A1!${crypto.randomUUID()}`);
  await page.getByRole('button', { name: 'Save connection' }).click();

  await expect(page.getByText(/API 503/)).toBeVisible();
});