import { test, expect } from './fixtures';

test('should render the storage accounts configuration section', async ({ appConfigPage, page }) => {
  await expect(page.getByText('Storage Accounts')).toBeVisible();
  await expect(page.getByRole('button', { name: /add account/i })).toBeVisible();
  expect(appConfigPage).toBeDefined();
});

test('should be possible to add a storage account', async ({ appConfigPage, page }) => {
  await page.getByRole('button', { name: /add account/i }).click();
  await expect(page.getByText('Add storage account')).toBeVisible();

  await page.getByPlaceholder('e.g., Production EU').fill('E2E Account');
  await page.getByPlaceholder('e.g., mystorageaccount').fill('e2estorageaccount');
  await page.getByPlaceholder('e.g., pdfs').fill('pdfs');
  await page.getByPlaceholder('Paste account key').fill('e2e-account-key');

  // listen for the server response on the saved form
  const saveResponse = appConfigPage.waitForSettingsResponse();

  await page.getByRole('button', { name: 'Add account', exact: true }).last().click();
  await expect(saveResponse).toBeOK();
});
