const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: 'schemer-responsive.spec.js',
  fullyParallel: true,
  workers: 2,
  use: {
    browserName: 'chromium',
    headless: !!process.env.CI,
    baseURL: 'http://127.0.0.1:4210',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npx ng serve schemer --host 127.0.0.1 --port 4210',
    url: 'http://127.0.0.1:4210',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
