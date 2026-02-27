import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
  },
  webServer: {
    command: 'npx vite --port 8080',
    port: 8080,
    reuseExistingServer: true,
  },
});
