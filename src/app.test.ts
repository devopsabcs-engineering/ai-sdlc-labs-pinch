import { beforeEach, describe, expect, it } from "vitest";
import { startApp } from "./app";
import { APP_DATA_KEY } from "./data";

const shell = `
  <div id="app">
    <div aria-label="Preferences" data-i18n-aria="prefs.group"></div>
    <h1 data-i18n="welcome.title">Title</h1>
    <button id="locale-toggle"></button>
    <button id="theme-toggle"><span data-theme-label></span></button>
    <p data-preference-status></p>
    <div data-recipe-list></div>
    <form data-recipe-form>
      <h2 data-form-title></h2>
      <input name="title" required />
      <input name="servings" type="number" required />
      <textarea name="ingredients" required></textarea>
      <textarea name="steps" required></textarea>
      <button type="submit">Save</button>
      <button type="button" data-cancel-edit hidden>Cancel</button>
    </form>
    <input id="import-data" type="file" />
    <a data-export>Export</a>
    <button data-clear>Clear</button>
    <p data-data-status></p>
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
    expect(JSON.parse(storage.getItem(APP_DATA_KEY)!)).toMatchObject({
      preferences: { locale: "fr" },
    });
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

  it("creates and displays a local recipe", () => {
    const storage = memoryStorage();
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
      createId: () => "new-recipe",
    });
    const form = document.querySelector<HTMLFormElement>("[data-recipe-form]")!;
    (form.elements.namedItem("title") as HTMLInputElement).value = "Toast";
    (form.elements.namedItem("servings") as HTMLInputElement).value = "1";
    (form.elements.namedItem("ingredients") as HTMLTextAreaElement).value = "1 slice bread";
    (form.elements.namedItem("steps") as HTMLTextAreaElement).value = "Toast it.";
    form.requestSubmit();

    expect(document.querySelector("[data-recipe-list]")?.textContent).toContain("Toast");
    expect(JSON.parse(storage.getItem(APP_DATA_KEY)!).recipes).toHaveLength(4);
  });

  it("surfaces save failures without displaying or storing the attempted recipe", () => {
    const values = new Map<string, string>();
    let fail = false;
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (fail) throw new Error("quota");
        values.set(key, value);
      },
    };
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
      createId: () => "failed-recipe",
    });
    const before = storage.getItem(APP_DATA_KEY);
    fail = true;
    const form = document.querySelector<HTMLFormElement>("[data-recipe-form]")!;
    (form.elements.namedItem("title") as HTMLInputElement).value = "Unsaved toast";
    (form.elements.namedItem("servings") as HTMLInputElement).value = "1";
    (form.elements.namedItem("ingredients") as HTMLTextAreaElement).value = "1 slice bread";
    (form.elements.namedItem("steps") as HTMLTextAreaElement).value = "Toast it.";
    form.requestSubmit();

    expect(document.querySelector("[data-data-status]")?.textContent).toContain("could not save");
    expect(document.querySelector("[data-recipe-list]")?.textContent).not.toContain("Unsaved toast");
    expect(storage.getItem(APP_DATA_KEY)).toBe(before);
  });

  it("only clears all data after confirmation", () => {
    const storage = memoryStorage();
    let confirmed = false;
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
      confirm: () => confirmed,
    });
    const clear = document.querySelector<HTMLButtonElement>("[data-clear]")!;
    clear.click();
    expect(JSON.parse(storage.getItem(APP_DATA_KEY)!).recipes).toHaveLength(3);

    confirmed = true;
    clear.click();
    expect(JSON.parse(storage.getItem(APP_DATA_KEY)!).recipes).toHaveLength(0);
  });
});
