import "./styles.css";
import { startApp } from "./app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Application root not found.");
startApp(root);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const manifest = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    if (manifest) {
      void navigator.serviceWorker.register(new URL("sw.js", manifest.href));
    }
  });
}
