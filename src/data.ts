import type { Locale } from "./i18n";
import type { Preferences } from "./preferences";
import type { ShoppingItem } from "./shopping";

export const APP_DATA_KEY = "pinch.app-data.v1";
export const APP_DATA_VERSION = 1;

export interface LocalizedText {
  fallback: string;
  en?: string;
  fr?: string;
}

export interface Recipe {
  id: string;
  title: LocalizedText;
  baseServings: number;
  ingredients: LocalizedText[];
  steps: LocalizedText[];
  source: "sample" | "user";
}

export interface AppData {
  version: typeof APP_DATA_VERSION;
  recipes: Recipe[];
  shoppingItems: ShoppingItem[];
  preferences: Preferences;
}

export type DataResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface DataStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const bilingual = (en: string, fr: string): LocalizedText => ({ fallback: en, en, fr });

export const SAMPLE_RECIPES: readonly Recipe[] = [
  {
    id: "sample-crepes",
    title: bilingual("Everyday crêpes", "Crêpes de tous les jours"),
    baseServings: 4,
    ingredients: [
      bilingual("1 cup flour", "1 tasse de farine"),
      bilingual("2 eggs", "2 œufs"),
      bilingual("1 1/4 cup milk", "1 1/4 tasse de lait"),
    ],
    steps: [
      bilingual("Whisk the ingredients until smooth.", "Fouetter les ingrédients jusqu'à consistance lisse."),
      bilingual("Cook thin layers in a hot pan.", "Cuire de fines couches dans une poêle chaude."),
    ],
    source: "sample",
  },
  {
    id: "sample-lentil-soup",
    title: bilingual("Red lentil soup", "Soupe aux lentilles rouges"),
    baseServings: 6,
    ingredients: [
      bilingual("2 cups red lentils", "2 tasses de lentilles rouges"),
      bilingual("1 L vegetable stock", "1 L de bouillon de légumes"),
      bilingual("2 carrots", "2 carottes"),
    ],
    steps: [
      bilingual("Rinse the lentils.", "Rincer les lentilles."),
      bilingual("Simmer everything until tender.", "Laisser mijoter le tout jusqu'à tendreté."),
    ],
    source: "sample",
  },
  {
    id: "sample-apple-crumble",
    title: bilingual("Apple crumble", "Croustade aux pommes"),
    baseServings: 8,
    ingredients: [
      bilingual("6 apples", "6 pommes"),
      bilingual("1 cup rolled oats", "1 tasse de flocons d'avoine"),
      bilingual("100 g butter", "100 g de beurre"),
    ],
    steps: [
      bilingual("Slice the apples into a baking dish.", "Trancher les pommes dans un plat de cuisson."),
      bilingual("Top with the oat mixture and bake.", "Garnir du mélange d'avoine et cuire au four."),
    ],
    source: "sample",
  },
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createInitialData(preferences: Preferences): AppData {
  return {
    version: APP_DATA_VERSION,
    recipes: clone([...SAMPLE_RECIPES]),
    shoppingItems: [],
    preferences: { ...preferences },
  };
}

function isLocalizedText(value: unknown): value is LocalizedText {
  if (typeof value !== "object" || value === null) return false;
  const text = value as Partial<LocalizedText>;
  return (
    typeof text.fallback === "string" &&
    text.fallback.trim().length > 0 &&
    (text.en === undefined || typeof text.en === "string") &&
    (text.fr === undefined || typeof text.fr === "string")
  );
}

function isRecipe(value: unknown): value is Recipe {
  if (typeof value !== "object" || value === null) return false;
  const recipe = value as Partial<Recipe>;
  return (
    typeof recipe.id === "string" &&
    recipe.id.trim().length > 0 &&
    isLocalizedText(recipe.title) &&
    typeof recipe.baseServings === "number" &&
    Number.isFinite(recipe.baseServings) &&
    recipe.baseServings > 0 &&
    Array.isArray(recipe.ingredients) &&
    recipe.ingredients.length > 0 &&
    recipe.ingredients.every(isLocalizedText) &&
    Array.isArray(recipe.steps) &&
    recipe.steps.length > 0 &&
    recipe.steps.every(isLocalizedText) &&
    (recipe.source === "sample" || recipe.source === "user")
  );
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<ShoppingItem>;
  const parsed =
    typeof item.mergeKey === "string" &&
    item.mergeKey.length > 0 &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity >= 0 &&
    (item.unit === "g" || item.unit === "mL" || item.unit === "count") &&
    item.originalText === undefined;
  const unparsed =
    item.mergeKey === undefined &&
    item.quantity === undefined &&
    item.unit === undefined &&
    typeof item.originalText === "string" &&
    item.originalText.length > 0;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    typeof item.checked === "boolean" &&
    (parsed || unparsed)
  );
}

export function isAppData(value: unknown): value is AppData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<AppData>;
  const preferences = data.preferences as Partial<Preferences> | undefined;
  return (
    data.version === APP_DATA_VERSION &&
    Array.isArray(data.recipes) &&
    data.recipes.every(isRecipe) &&
    new Set(data.recipes.map((recipe) => recipe.id)).size === data.recipes.length &&
    Array.isArray(data.shoppingItems) &&
    data.shoppingItems.every(isShoppingItem) &&
    new Set(data.shoppingItems.map((item) => item.id)).size === data.shoppingItems.length &&
    new Set(
      data.shoppingItems
        .map((item) => item.mergeKey)
        .filter((key): key is string => key !== undefined),
    ).size === data.shoppingItems.filter((item) => item.mergeKey !== undefined).length &&
    preferences !== undefined &&
    (preferences.locale === "en" || preferences.locale === "fr") &&
    (preferences.theme === "light" || preferences.theme === "dark") &&
    (preferences.unitSystem === "metric" || preferences.unitSystem === "imperial")
  );
}

function parseData(json: string): DataResult<AppData> {
  try {
    const candidate: unknown = JSON.parse(json);
    if (!isAppData(candidate)) return { ok: false, error: "invalid" };
    return { ok: true, value: clone(candidate) };
  } catch {
    return { ok: false, error: "invalid" };
  }
}

export class RecipeRepository {
  private data: AppData;

  private constructor(
    private readonly storage: DataStorage,
    data: AppData,
  ) {
    this.data = data;
  }

  static open(storage: DataStorage, initial: AppData): DataResult<RecipeRepository> {
    try {
      const saved = storage.getItem(APP_DATA_KEY);
      if (saved) {
        const parsed = parseData(saved);
        return parsed.ok
          ? { ok: true, value: new RecipeRepository(storage, parsed.value) }
          : parsed;
      }
      storage.setItem(APP_DATA_KEY, JSON.stringify(initial));
      return { ok: true, value: new RecipeRepository(storage, clone(initial)) };
    } catch {
      return { ok: false, error: "storage" };
    }
  }

  snapshot(): AppData {
    return clone(this.data);
  }

  exportJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  importJson(json: string): DataResult<AppData> {
    const parsed = parseData(json);
    if (!parsed.ok) return parsed;
    return this.replace(parsed.value);
  }

  saveRecipe(recipe: Recipe): DataResult<AppData> {
    if (!isRecipe(recipe)) return { ok: false, error: "invalid" };
    const recipes = this.data.recipes.some(({ id }) => id === recipe.id)
      ? this.data.recipes.map((current) => (current.id === recipe.id ? clone(recipe) : current))
      : [...this.data.recipes, clone(recipe)];
    return this.replace({ ...this.data, recipes });
  }

  deleteRecipe(id: string): DataResult<AppData> {
    if (!this.data.recipes.some((recipe) => recipe.id === id)) {
      return { ok: false, error: "notFound" };
    }
    return this.replace({
      ...this.data,
      recipes: this.data.recipes.filter((recipe) => recipe.id !== id),
    });
  }

  updatePreferences(preferences: Preferences): DataResult<AppData> {
    return this.replace({ ...this.data, preferences: { ...preferences } });
  }

  updateShoppingItems(shoppingItems: ShoppingItem[]): DataResult<AppData> {
    return this.replace({ ...this.data, shoppingItems: clone(shoppingItems) });
  }

  clear(): DataResult<AppData> {
    return this.replace({
      version: APP_DATA_VERSION,
      recipes: [],
      shoppingItems: [],
      preferences: { locale: "en", theme: "light", unitSystem: "metric" },
    });
  }

  private replace(candidate: AppData): DataResult<AppData> {
    if (!isAppData(candidate)) return { ok: false, error: "invalid" };
    const next = clone(candidate);
    try {
      this.storage.setItem(APP_DATA_KEY, JSON.stringify(next));
    } catch {
      return { ok: false, error: "storage" };
    }
    this.data = next;
    return { ok: true, value: this.snapshot() };
  }
}

export function localize(text: LocalizedText, locale: Locale): string {
  return text[locale]?.trim() || text.fallback;
}
