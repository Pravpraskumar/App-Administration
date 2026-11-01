import { expect, test } from '@playwright/test';
import { setupAuthenticatedApp } from './support/app';

test.beforeEach(async ({ page }) => {
  await setupAuthenticatedApp(page);
});

test('Email Templates opens email delivery help instead of a generic topic', async ({ page }) => {
  await page.goto('/admin/email-templates');
  await page.locator('header nav').getByRole('link', { name: 'Open help for this screen' }).click();

  await expect(page).toHaveURL(/\/app\/help\/global-email$/);
  await expect(page.getByRole('heading', { name: 'Email templates and delivery', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Email Templates', exact: true })).toBeVisible();
});

test('Help Center searches administration topics and preserves the Resources bookmark', async ({ page }) => {
  await page.goto('/app/resources');
  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(page.getByRole('heading', { name: 'Help Center' })).toBeVisible();

  await page.getByPlaceholder('Search help topics').fill('organisation membership');
  await expect(page.getByRole('link', { name: 'Organisation administration', exact: true })).toBeVisible();
});
