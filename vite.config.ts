import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/ai-sdlc-labs-pinch/",
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://pinch.test/",
      },
    },
  },
});
