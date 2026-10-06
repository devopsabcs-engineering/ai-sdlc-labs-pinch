import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatIngredient, startApp } from "./app";
import { APP_DATA_KEY } from "./data";

const shell = `
  <div id="app">
    <div aria-label="Preferences" data-i18n-aria="prefs.group"></div>
    <h1 data-i18n="welcome.title">Title</h1>
    <button id="locale-toggle"></button>
    <button id="theme-toggle"><span data-theme-label></span></button>
    <p data-preference-status></p>
    <section data-recipe-view>
      <h1 data-recipe-title></h1>
      <p data-recipe-yield></p>
      <span data-measure-fill></span>
      <button type="button" data-decrease></button>
      <output data-servings></output>
      <button type="button" data-increase></button>
      <button type="button" data-unit="metric"></button>
      <button type="button" data-unit="imperial"></button>
      <ul data-ingredient-list></ul>
      <button type="button" data-add-shopping></button>
      <button type="button" data-start-cook></button>
      <p data-recipe-status></p>
    </section>
    <h2 data-shopping-title></h2>
    <p data-shopping-empty></p>
    <ul data-shopping-list></ul>
    <button type="button" data-clear-checked></button>
    <p data-shopping-status></p>
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
    <dialog data-cook-dialog>
      <button type="button" data-close-cook><span>Close</span></button>
      <p data-cook-count></p>
      <button type="button" data-cook-locale></button>
      <button type="button" data-cook-theme><span data-cook-theme-label></span></button>
      <h2 tabindex="-1" data-cook-step></h2>
      <p data-wake-status></p>
      <button type="button" data-previous-step></button>
      <button type="button" data-next-step></button>
    </dialog>
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
    expect(document.querySelector("h1")?.textContent).toBe(
      "Votre cuisine, bien mesurée.",
    );
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
    expect(document.querySelector("[data-theme-label]")?.textContent).toBe(
      "Light theme",
    );
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
    (form.elements.namedItem("ingredients") as HTMLTextAreaElement).value =
      "1 slice bread";
    (form.elements.namedItem("steps") as HTMLTextAreaElement).value =
      "Toast it.";
    form.requestSubmit();

    expect(document.querySelector("[data-recipe-list]")?.textContent).toContain(
      "Toast",
    );
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
    (form.elements.namedItem("title") as HTMLInputElement).value =
      "Unsaved toast";
    (form.elements.namedItem("servings") as HTMLInputElement).value = "1";
    (form.elements.namedItem("ingredients") as HTMLTextAreaElement).value =
      "1 slice bread";
    (form.elements.namedItem("steps") as HTMLTextAreaElement).value =
      "Toast it.";
    form.requestSubmit();

    expect(document.querySelector("[data-data-status]")?.textContent).toContain(
      "could not save",
    );
    expect(
      document.querySelector("[data-recipe-list]")?.textContent,
    ).not.toContain("Unsaved toast");
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

  it("scales the selected recipe and persists its serving state", () => {
    const storage = memoryStorage();
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });

    document.querySelector<HTMLButtonElement>("[data-increase]")!.click();

    expect(document.querySelector("[data-servings]")?.textContent).toBe("5");
    expect(document.querySelector("[data-recipe-status]")?.textContent).toBe(
      "Scaled for 5 servings",
    );
    expect(
      document.querySelector("[data-ingredient-list]")?.textContent,
    ).toContain("296 mL");

    document.body.innerHTML = shell;
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });
    expect(document.querySelector("[data-servings]")?.textContent).toBe("5");
  });

  it("switches to an imperial display without changing the serving state", () => {
    const storage = memoryStorage();
    const state = startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });
    const imperial = document.querySelector<HTMLButtonElement>(
      '[data-unit="imperial"]',
    )!;

    imperial.click();

    expect(state().unitSystem).toBe("imperial");
    expect(imperial.getAttribute("aria-pressed")).toBe("true");
    expect(
      document
        .querySelector('[data-unit="metric"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("false");
    expect(
      document.querySelector("[data-ingredient-list]")?.textContent,
    ).toContain("1 cup");
  });

  it("updates recipe content and accessible serving names when language changes", () => {
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage: memoryStorage(),
      languages: ["en"],
      prefersDark: false,
    });

    document.querySelector<HTMLButtonElement>("#locale-toggle")!.click();

    expect(document.querySelector("[data-recipe-title]")?.textContent).toBe(
      "Crêpes de tous les jours",
    );
    expect(
      document.querySelector("[data-decrease]")?.getAttribute("aria-label"),
    ).toBe("Réduire le nombre de portions");
    expect(
      document.querySelector("[data-ingredient-list]")?.textContent,
    ).toContain("farine");
  });

  it("adds the scaled recipe to a persistent checklist and clears only checked items", () => {
    const storage = memoryStorage();
    let id = 0;
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
      createId: () => `shopping-${++id}`,
    });
    document.querySelector<HTMLButtonElement>("[data-increase]")!.click();
    document.querySelector<HTMLButtonElement>("[data-add-shopping]")!.click();

    const saved = JSON.parse(storage.getItem(APP_DATA_KEY)!);
    expect(saved.shoppingItems).toHaveLength(3);
    expect(saved.shoppingItems[0]).toMatchObject({
      name: "flour",
      unit: "mL",
      quantity: 295.735295625,
    });

    const first =
      document.querySelector<HTMLInputElement>("[data-shopping-id]")!;
    first.click();
    expect(
      JSON.parse(storage.getItem(APP_DATA_KEY)!).shoppingItems[0].checked,
    ).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-clear-checked]")!.click();
    expect(
      JSON.parse(storage.getItem(APP_DATA_KEY)!).shoppingItems,
    ).toHaveLength(2);

    document.body.innerHTML = shell;
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
      createId: () => `shopping-${++id}`,
    });
    expect(document.querySelectorAll("[data-shopping-id]")).toHaveLength(2);
  });

  it("keeps cook mode focused, restores focus, and preserves its step", async () => {
    const storage = memoryStorage();
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage,
      languages: ["en"],
      prefersDark: false,
    });
    const start =
      document.querySelector<HTMLButtonElement>("[data-start-cook]")!;
    const dialog =
      document.querySelector<HTMLDialogElement>("[data-cook-dialog]")!;
    const heading = document.querySelector<HTMLElement>("[data-cook-step]")!;

    start.click();
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(document.activeElement).toBe(heading);
    expect(heading.textContent).toBe("Whisk the ingredients until smooth.");
    expect(document.querySelector("[data-wake-status]")?.textContent).toBe(
      "Keep your screen awake in device settings.",
    );

    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(heading.textContent).toBe("Cook thin layers in a hot pan.");
    expect(document.querySelector("[data-next-step]")?.textContent).toBe(
      "Finish",
    );

    const close =
      document.querySelector<HTMLButtonElement>("[data-close-cook]")!;
    close.focus();
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(
      document.querySelector("[data-next-step]"),
    );

    dialog.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await Promise.resolve();
    expect(dialog.hasAttribute("open")).toBe(false);
    expect(document.activeElement).toBe(start);

    start.click();
    expect(heading.textContent).toBe("Cook thin layers in a hot pan.");
  });

  it("supports swipe steps and releases an acquired wake lock on finish", async () => {
    const release = vi.fn(async () => undefined);
    const requestWakeLock = vi.fn(async () => ({ release, released: false }));
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage: memoryStorage(),
      languages: ["en"],
      prefersDark: false,
      requestWakeLock,
    });
    const dialog =
      document.querySelector<HTMLDialogElement>("[data-cook-dialog]")!;
    document.querySelector<HTMLButtonElement>("[data-start-cook]")!.click();
    await Promise.resolve();

    expect(requestWakeLock).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-wake-status]")?.textContent).toBe(
      "Screen stays awake",
    );

    const swipe = (type: string, x: number): void => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, "changedTouches", {
        value: [{ clientX: x, clientY: 10 }],
      });
      dialog.dispatchEvent(event);
    };
    swipe("touchstart", 100);
    swipe("touchend", 20);
    expect(document.querySelector("[data-cook-count]")?.textContent).toBe(
      "Step 2 of 2",
    );

    swipe("touchstart", 20);
    swipe("touchend", 100);
    expect(document.querySelector("[data-cook-count]")?.textContent).toBe(
      "Step 1 of 2",
    );
    document.querySelector<HTMLButtonElement>("[data-next-step]")!.click();
    document.querySelector<HTMLButtonElement>("[data-next-step]")!.click();
    await Promise.resolve();
    expect(release).toHaveBeenCalledOnce();
    expect(dialog.hasAttribute("open")).toBe(false);
  });

  it("localizes cook mode without losing the current step", () => {
    startApp(document.querySelector<HTMLElement>("#app")!, {
      storage: memoryStorage(),
      languages: ["en"],
      prefersDark: false,
    });
    document.querySelector<HTMLButtonElement>("[data-start-cook]")!.click();
    document
      .querySelector<HTMLDialogElement>("[data-cook-dialog]")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      );
    document.querySelector<HTMLButtonElement>("[data-cook-locale]")!.click();

    expect(document.querySelector("[data-cook-count]")?.textContent).toBe(
      "Étape 2 sur 2",
    );
    expect(document.querySelector("[data-cook-step]")?.textContent).toBe(
      "Cuire de fines couches dans une poêle chaude.",
    );
    expect(document.querySelector("[data-next-step]")?.textContent).toBe(
      "Terminer",
    );
    expect(document.querySelector("[data-wake-status]")?.textContent).toBe(
      "Gardez l’écran allumé dans les réglages de l’appareil.",
    );
  });
});

describe("recipe ingredient display", () => {
  it("uses existing quantity rules for metric, imperial, and unparsed lines", () => {
    expect(formatIngredient("1 cup flour", 4, 6, "metric", "en")).toEqual({
      amount: "355",
      unit: "mL",
      name: "flour",
      parsed: true,
    });
    expect(
      formatIngredient("100 g butter", 4, 4, "imperial", "en"),
    ).toMatchObject({
      amount: "3.53",
      unit: "oz",
      parsed: true,
    });
    expect(formatIngredient("salt to taste", 4, 6, "imperial", "en")).toEqual({
      amount: "",
      unit: "",
      name: "salt to taste",
      parsed: false,
    });
  });
});
