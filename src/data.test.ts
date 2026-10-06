import { describe, expect, it } from "vitest";
import {
  APP_DATA_KEY,
  createInitialData,
  localize,
  RecipeRepository,
  SAMPLE_RECIPES,
  type DataStorage,
  type Recipe,
} from "./data";
import type { Preferences } from "./preferences";
import type { ShoppingItem } from "./shopping";

const preferences: Preferences = {
  locale: "en",
  theme: "light",
  unitSystem: "metric",
};

function memoryStorage(): DataStorage & { values: Map<string, string>; fail: boolean } {
  const values = new Map<string, string>();
  return {
    values,
    fail: false,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (this.fail) throw new Error("quota");
      values.set(key, value);
    },
  };
}

function userRecipe(id = "user-1"): Recipe {
  return {
    id,
    title: { fallback: "Toast" },
    baseServings: 1,
    ingredients: [{ fallback: "1 slice bread" }],
    steps: [{ fallback: "Toast the bread." }],
    source: "user",
  };
}

describe("local recipe data", () => {
  it("seeds exactly three complete bilingual recipes once", () => {
    expect(SAMPLE_RECIPES).toHaveLength(3);
    for (const recipe of SAMPLE_RECIPES) {
      expect(recipe.title.en).toBeTruthy();
      expect(recipe.title.fr).toBeTruthy();
      expect(recipe.ingredients.every((line) => line.en && line.fr)).toBe(true);
      expect(recipe.steps.every((step) => step.en && step.fr)).toBe(true);
    }

    const storage = memoryStorage();
    const first = RecipeRepository.open(storage, createInitialData(preferences));
    expect(first.ok && first.value.snapshot().recipes).toHaveLength(3);
    const second = RecipeRepository.open(storage, {
      ...createInitialData(preferences),
      recipes: [],
    });
    expect(second.ok && second.value.snapshot().recipes).toHaveLength(3);
  });

  it("creates, updates, deletes, and reloads recipes", () => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    expect(opened.value.saveRecipe(userRecipe()).ok).toBe(true);
    expect(
      opened.value.saveRecipe({ ...userRecipe(), title: { fallback: "Better toast" } }).ok,
    ).toBe(true);
    expect(opened.value.snapshot().recipes.at(-1)?.title.fallback).toBe("Better toast");
    expect(opened.value.deleteRecipe("user-1").ok).toBe(true);

    const reloaded = RecipeRepository.open(storage, createInitialData(preferences));
    expect(reloaded.ok && reloaded.value.snapshot().recipes).toHaveLength(3);
  });

  it("persists shopping checklist state across repository reloads", () => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    if (!opened.ok) throw new Error("open failed");
    const items: ShoppingItem[] = [
      {
        id: "shopping-1",
        name: "flour",
        mergeKey: "flour|mass|g",
        quantity: 500,
        unit: "g",
        checked: true,
      },
      {
        id: "shopping-2",
        name: "salt to taste",
        originalText: "salt to taste",
        checked: false,
      },
    ];

    expect(opened.value.updateShoppingItems(items).ok).toBe(true);
    const reloaded = RecipeRepository.open(storage, createInitialData(preferences));
    expect(reloaded.ok && reloaded.value.snapshot().shoppingItems).toEqual(items);
  });

  it("exports versioned JSON and atomically imports valid data", () => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    if (!opened.ok) throw new Error("open failed");
    const exported = JSON.parse(opened.value.exportJson()) as { version: number };
    expect(exported.version).toBe(1);

    const candidate = opened.value.snapshot();
    candidate.recipes.push(userRecipe());
    const result = opened.value.importJson(JSON.stringify(candidate));
    expect(result.ok && result.value.recipes).toHaveLength(4);
    expect(JSON.parse(storage.values.get(APP_DATA_KEY) ?? "").recipes).toHaveLength(4);
  });

  it.each([
    "{broken",
    JSON.stringify({ version: 1, recipes: [], shoppingItems: [] }),
    JSON.stringify({
      ...createInitialData(preferences),
      recipes: [userRecipe("duplicate"), userRecipe("duplicate")],
    }),
    JSON.stringify({ ...createInitialData(preferences), version: 2 }),
  ])("rejects an invalid import without changing valid data", (candidate) => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    if (!opened.ok) throw new Error("open failed");
    const before = opened.value.exportJson();

    expect(opened.value.importJson(candidate)).toEqual({ ok: false, error: "invalid" });
    expect(opened.value.exportJson()).toBe(before);
    expect(storage.values.get(APP_DATA_KEY)).toBe(JSON.stringify(JSON.parse(before)));
  });

  it("does not mutate memory or valid storage when persistence fails", () => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    if (!opened.ok) throw new Error("open failed");
    const beforeMemory = opened.value.snapshot();
    const beforeStorage = storage.values.get(APP_DATA_KEY);
    storage.fail = true;

    expect(opened.value.saveRecipe(userRecipe())).toEqual({ ok: false, error: "storage" });
    expect(opened.value.snapshot()).toEqual(beforeMemory);
    expect(storage.values.get(APP_DATA_KEY)).toBe(beforeStorage);
  });

  it("clears all data and resets preferences", () => {
    const storage = memoryStorage();
    const opened = RecipeRepository.open(storage, createInitialData(preferences));
    if (!opened.ok) throw new Error("open failed");

    const result = opened.value.clear();
    expect(result.ok && result.value).toMatchObject({
      version: 1,
      recipes: [],
      shoppingItems: [],
      preferences: { locale: "en", theme: "light", unitSystem: "metric" },
    });
  });

  it("uses localized sample text with a required fallback", () => {
    expect(localize(SAMPLE_RECIPES[0]!.title, "fr")).toBe("Crêpes de tous les jours");
    expect(localize({ fallback: "User text" }, "fr")).toBe("User text");
  });
});
