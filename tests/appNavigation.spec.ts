import { test, expect } from './fixtures';

test.describe('navigating app', () => {
  test('download page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage('/download');
    await expect(page.getByText('Azure Blob PDF Download')).toBeVisible();
  });

  test('the root path should redirect to the download page', async ({ gotoPage, page }) => {
    await gotoPage();
    await expect(page.getByText('Azure Blob PDF Download')).toBeVisible();
  });
});
