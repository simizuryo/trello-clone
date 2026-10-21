import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

// E2E tests drive the real app: Vite dev server (5173) + Spring Boot backend (8080) + PostgreSQL.
// PostgreSQL must already be running (docker compose up -d, or a CI service container).
// Locally, already-running servers are reused; otherwise they are started here.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }], ["github"]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    // Failure artifacts are written under test-results/<test>/
    screenshot: { mode: "only-on-failure", fullPage: true },
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.E2E_BACKEND_COMMAND ?? "mvn -q -f ../backend/pom.xml spring-boot:run",
      url: "http://localhost:8080/actuator/health",
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: "http://localhost:5173",
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
});
