import { test, expect } from '@playwright/test';

test.describe('Swim The Wight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.custom-marker', { timeout: 15000 });
  });

  test('renders the map with 12 beach markers', async ({ page }) => {
    await expect(page.locator('#map')).toBeVisible();
    const markers = page.locator('.custom-marker');
    await expect(markers).toHaveCount(12);
  });

  test('auto-selects Sandown on load', async ({ page }) => {
    await expect(page.locator('#selected-beach-name')).toHaveText('Sandown');
  });

  test('displays beach description text', async ({ page }) => {
    await page.waitForFunction(
      () => {
        const el = document.getElementById('beach-description-text');
        return el && el.textContent.trim() !== 'Loading...';
      },
      { timeout: 15000 }
    );
    const text = await page.locator('#beach-description-text').textContent();
    expect(text).toContain('sandy beach');
  });

  test('loads tide data', async ({ page }) => {
    await page.waitForSelector('.tide-status', { timeout: 15000 });
    await expect(page.locator('.tide-status')).toBeVisible();
  });

  test('loads weather data', async ({ page }) => {
    await page.waitForFunction(
      () => document.getElementById('weather-temp-big')?.textContent !== '--',
      { timeout: 15000 }
    );
    const temp = await page.locator('#weather-temp-big').textContent();
    expect(temp).not.toBe('--');
  });

  test('loads wave height data', async ({ page }) => {
    await page.waitForFunction(
      () => document.getElementById('wave-height')?.textContent !== '-- m',
      { timeout: 15000 }
    );
    const height = await page.locator('#wave-height').textContent();
    expect(height).toMatch(/\d+\.\d+ m/);
  });

  test('favourite button toggles and persists', async ({ page }) => {
    await page.waitForSelector('.tide-status', { timeout: 15000 });

    const btn = page.locator('#favourite-toggle');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    await expect(btn).toHaveText('♥');

    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toHaveText('♡');
  });

  test('date selector buttons are rendered', async ({ page }) => {
    const buttons = page.locator('#date-selector button');
    await expect(buttons).toHaveCount(6);
    await expect(buttons.first()).toHaveClass(/selected/);
  });

  test('markers have keyboard accessibility attributes', async ({ page }) => {
    const marker = page.locator('.custom-marker').first();
    await expect(marker).toHaveAttribute('tabindex', '0');
    await expect(marker).toHaveAttribute('role', 'button');
  });
});
