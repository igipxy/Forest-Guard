import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @fire-monitoring/camera-web dev',
      url: 'http://localhost:3001',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        CAMERA_API_SECRET: 'test-internal-m2m-secret-32-chars!!',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      },
    },
    {
      command: 'pnpm --filter @fire-monitoring/monitoring-dashboard dev',
      url: 'http://localhost:3000',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_ENABLE_DEMO_MODE: 'true',
        CAMERA_WEB_API_URL: 'http://localhost:3001/api/v1',
        CAMERA_API_SECRET: 'test-internal-m2m-secret-32-chars!!',
      },
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});