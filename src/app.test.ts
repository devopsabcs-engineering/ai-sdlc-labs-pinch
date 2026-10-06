import { beforeEach, describe, expect, it } from "vitest";
import { startApp } from "./app";
import { PREFERENCES_KEY } from "./preferences";

const shell = `
  <div id="app">
    <div aria-label="Preferences" data-i18n-aria="prefs.group"></div>
    <h1 data-i18n="welcome.title">Title</h1>
    <button id="locale-toggle"></button>
    <button id="theme-toggle"><span data-theme-label></span></button>
    <p data-preference-status></p>
  </div>`;

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("application shell", () => {
  beforeEach(() => {
    document.body.innerHTML = shell;
  });

  it("switches and persists locale while updating document language", () => {
    const root = document.querySelector<HTMLElement>("#app");
    const storage = memoryStorage();
    expect(root).not.toBeNull();
    const state = startApp(root!, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });

    document.querySelector<HTMLButtonElement>("#locale-toggle")!.click();

    expect(state().locale).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.querySelector("h1")?.textContent).toBe("Votre cuisine, bien mesurée.");
    expect(JSON.parse(storage.getItem(PREFERENCES_KEY)!)).toMatchObject({ locale: "fr" });
  });

  it("switches and persists theme", () => {
    const root = document.querySelector<HTMLElement>("#app")!;
    const storage = memoryStorage();
    const state = startApp(root, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });

    document.querySelector<HTMLButtonElement>("#theme-toggle")!.click();

    expect(state().theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.querySelector("[data-theme-label]")?.textContent).toBe("Light theme");
  });
});
