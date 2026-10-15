import { defineConfig, devices } from "@playwright/test";

const PORT = 4179;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the system Chrome: no browser download needed.
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command: `vite build --mode e2e && vite preview --mode e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/e2e.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
