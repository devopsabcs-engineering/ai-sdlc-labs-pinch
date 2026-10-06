import { chromium } from "@playwright/test";
import { preview } from "vite";

const basePath = "/ai-sdlc-labs-pinch/";
const minimumPerformanceScore = 0.9;
const throttling = {
  latency: 150,
  downloadThroughput: (1_638.4 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  cpuSlowdownMultiplier: 4,
};

function complementaryNormalDistribution(value) {
  const sign = value < 0 ? -1 : 1;
  const absolute = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * absolute);
  const errorFunction =
    sign *
    (1 -
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-absolute * absolute));
  return 0.5 * (1 - errorFunction);
}

function metricScore(value, median, goodThreshold) {
  if (value <= 0) return 1;
  const shape = Math.abs(Math.log(goodThreshold / median)) / 1.2815515655446004;
  return complementaryNormalDistribution(
    (Math.log(value) - Math.log(median)) / shape,
  );
}

async function measurePerformance(browser, appUrl) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);

  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: throttling.latency,
    downloadThroughput: throttling.downloadThroughput,
    uploadThroughput: throttling.uploadThroughput,
    connectionType: "cellular3g",
  });
  await session.send("Emulation.setCPUThrottlingRate", {
    rate: throttling.cpuSlowdownMultiplier,
  });
  await page.addInitScript(() => {
    globalThis.__qualityMetrics = { largestContentfulPaint: 0, longTasks: [] };
    new globalThis.PerformanceObserver((entries) => {
      const latest = entries.getEntries().at(-1);
      if (latest) {
        globalThis.__qualityMetrics.largestContentfulPaint = latest.startTime;
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new globalThis.PerformanceObserver((entries) => {
      globalThis.__qualityMetrics.longTasks.push(
        ...entries
          .getEntries()
          .map(({ startTime, duration }) => ({ startTime, duration })),
      );
    }).observe({ type: "longtask", buffered: true });
  });

  try {
    const response = await page.goto(appUrl.href, { waitUntil: "networkidle" });
    if (!response?.ok()) {
      throw new Error(
        `Throttled app load returned HTTP ${response?.status() ?? "unknown"}.`,
      );
    }
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => {
      const firstContentfulPaint =
        globalThis.performance.getEntriesByName("first-contentful-paint")[0]
          ?.startTime ?? Number.POSITIVE_INFINITY;
      const cumulativeLayoutShift = globalThis.performance
        .getEntriesByType("layout-shift")
        .filter((entry) => !entry.hadRecentInput)
        .reduce((total, entry) => total + entry.value, 0);
      const totalBlockingTime = globalThis.__qualityMetrics.longTasks
        .filter(
          ({ startTime, duration }) =>
            startTime + duration > firstContentfulPaint,
        )
        .reduce((total, { duration }) => total + Math.max(0, duration - 50), 0);
      return {
        firstContentfulPaint,
        largestContentfulPaint:
          globalThis.__qualityMetrics.largestContentfulPaint ||
          Number.POSITIVE_INFINITY,
        totalBlockingTime,
        cumulativeLayoutShift,
      };
    });

    // Lighthouse performance weighting, with FCP also representing Speed
    // Index in this single-page smoke. Thresholds are the standard "good"
    // Lighthouse/Web Vitals boundaries.
    const score =
      metricScore(metrics.firstContentfulPaint, 3000, 1800) * 0.2 +
      metricScore(metrics.largestContentfulPaint, 4000, 2500) * 0.25 +
      metricScore(metrics.totalBlockingTime, 600, 200) * 0.3 +
      metricScore(metrics.cumulativeLayoutShift, 0.25, 0.1) * 0.25;
    return { score, metrics };
  } finally {
    await context.close();
  }
}

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

  const performance = await measurePerformance(browser, appUrl);
  const actualScore = performance.score.toFixed(3);
  console.log(
    `Throttled performance score: ${actualScore} ` +
      `(FCP ${Math.round(performance.metrics.firstContentfulPaint)}ms, ` +
      `LCP ${Math.round(performance.metrics.largestContentfulPaint)}ms, ` +
      `TBT ${Math.round(performance.metrics.totalBlockingTime)}ms, ` +
      `CLS ${performance.metrics.cumulativeLayoutShift.toFixed(3)}).`,
  );
  if (performance.score < minimumPerformanceScore) {
    throw new Error(
      `Performance score ${actualScore} is below ${minimumPerformanceScore}.`,
    );
  }

  console.log(
    "Browser quality check passed (manifest, service worker, first-party runtime, throttled performance).",
  );
} finally {
  await browser?.close();
  await server.close();
}
