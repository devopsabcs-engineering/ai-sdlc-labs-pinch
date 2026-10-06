import { chromium, defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173/ai-sdlc-labs-pinch/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: "line",
  use: {
    baseURL,
    browserName: "chromium",
    launchOptions: {
      executablePath: chromium.executablePath(),
    },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: false,
  },
});
