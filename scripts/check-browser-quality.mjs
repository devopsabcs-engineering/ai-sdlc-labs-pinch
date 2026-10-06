import { chromium } from "@playwright/test";
import { preview } from "vite";

const basePath = "/ai-sdlc-labs-pinch/";
const server = await preview({
  preview: {
    host: "127.0.0.1",
    port: 0,
  },
});

let browser;
try {
  const serverUrl = server.resolvedUrls?.local[0];
  if (!serverUrl) throw new Error("Vite preview did not provide a local URL.");
  const appUrl = new URL(basePath, serverUrl);
  browser = await chromium.launch({
    executablePath: chromium.executablePath(),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const thirdPartyRequests = [];

  page.on("request", (request) => {
    if (new URL(request.url()).origin !== appUrl.origin) {
      thirdPartyRequests.push(request.url());
    }
  });

  const response = await page.goto(appUrl.href, { waitUntil: "networkidle" });
  if (!response?.ok())
    throw new Error(`App returned HTTP ${response?.status() ?? "unknown"}.`);

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  if (!manifestHref) throw new Error("Manifest link is missing.");
  const manifestResponse = await context.request.get(
    new URL(manifestHref, appUrl).href,
  );
  if (!manifestResponse.ok()) throw new Error("Manifest could not be loaded.");
  const manifest = await manifestResponse.json();
  if (
    manifest.start_url !== "./" ||
    manifest.scope !== "./" ||
    manifest.display !== "standalone"
  ) {
    throw new Error("Manifest is not repository-relative and standalone.");
  }

  await page.evaluate(async () => {
    await globalThis.navigator.serviceWorker.ready;
  });
  await page.reload({ waitUntil: "networkidle" });
  const controlled = await page.evaluate(() =>
    Boolean(globalThis.navigator.serviceWorker.controller),
  );
  if (!controlled)
    throw new Error("Service worker did not control the application.");
  if (thirdPartyRequests.length) {
    throw new Error(
      `Runtime made third-party requests: ${thirdPartyRequests.join(", ")}`,
    );
  }

  const timing = await page.evaluate(() => {
    const navigation = globalThis.performance.getEntriesByType("navigation")[0];
    return navigation ? navigation.duration : -1;
  });
  if (timing < 0)
    throw new Error("Navigation performance timing was unavailable.");

  console.log(
    `Browser quality check passed (manifest, service worker, first-party runtime, ${Math.round(timing)}ms navigation).`,
  );
} finally {
  await browser?.close();
  await server.close();
}
