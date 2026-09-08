import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const replitChromium = "/repl/tools/bin/chromium";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "line",
  webServer: {
    command: "pnpm exec vite --config e2e/vite.config.ts --host 127.0.0.1",
    port: 4174,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: true,
    launchOptions: existsSync(replitChromium)
      ? { executablePath: replitChromium }
      : undefined,
  },
});