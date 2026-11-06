import { test, expect } from '@playwright/test';

test.describe('Fire Risk Monitoring & CCTV Cross-App E2E Workflow', () => {
  test('completes full 12-step operator and camera synchronization workflow', async ({ page }) => {
    // 1. Open Monitoring Dashboard
    await page.goto('http://localhost:3000');
    await expect(page.getByRole('heading', { name: /Fire Risk Monitoring/i })).toBeVisible();

    // 2. Navigate across all 8 modules
    const modules = [
      'Overview',
      'Weather Monitoring',
      'Live Cameras',
      'Fire Risk Analysis',
      'Daily Reports',
      'Alerts & Notifications',
      'System Logs',
      'Settings',
    ];
    for (const modName of modules) {
      await page.getByRole('button', { name: new RegExp(modName, 'i') }).click();
    }

    // 3 & 4. Register a camera via Camera Management control and verify it appears in Live Cameras
    await page.getByRole('button', { name: /Live Cameras/i }).click();
    await page.getByRole('button', { name: /Register Camera/i }).click();
    await page.getByPlaceholder('Camera Name').fill('Tower Delta - Ridge South');
    await page.getByPlaceholder('Camera Code').fill('CCTV-MLG-04');
    await page.getByPlaceholder('Sector / Location').fill('Sector D - Highland Perimeter');
    await page.getByRole('button', { name: /Save Camera/i }).click();
    await expect(page.getByText('Tower Delta - Ridge South')).toBeVisible();

    // 5 & 6. Change operational status to OFFLINE and verify status synchronization
    await page.getByTestId('set-offline-CCTV-MLG-04').click();
    await expect(page.getByTestId('status-badge-CCTV-MLG-04')).toHaveText(/OFFLINE/i);

    // 7 & 8. Simulate an invalid HLS stream on an ONLINE camera and verify stream error state
    await page.getByTestId('set-broken-stream-CCTV-MLG-04').click();
    await expect(page.getByTestId('stream-badge-CCTV-MLG-04')).toHaveText(/UNAVAILABLE/i);

    // 9 & 10. Trigger a high/extreme fire risk scenario and verify alert generation
    await page.getByRole('button', { name: /Weather Monitoring/i }).click();
    await page.getByRole('button', { name: /Simulate Extreme Dry Spell/i }).click();
    await page.getByRole('button', { name: /Alerts & Notifications/i }).click();
    await expect(page.getByText(/Extreme Fire Susceptibility/i).first()).toBeVisible();

    // 11. Acknowledge an alert and verify lifecycle state transitions to ACKNOWLEDGED
    await page.getByRole('button', { name: /Acknowledge/i }).first().click();
    await expect(page.getByText(/ACKNOWLEDGED/i).first()).toBeVisible();

    // 12. Generate and view a historical Daily Fire Risk Report
    await page.getByRole('button', { name: /Daily Reports/i }).click();
    await page.getByRole('button', { name: /Generate Daily Report/i }).click();
    await expect(page.getByText(/Environmental Susceptibility Report/i).first()).toBeVisible();
  });
});