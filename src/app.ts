import {
  createInitialData,
  localize,
  RecipeRepository,
  type DataResult,
  type DataStorage,
  type Recipe,
} from "./data";
import { translate, type Locale } from "./i18n";
import { loadPreferences, type Preferences, type Theme, type UnitSystem } from "./preferences";
import {
  convertQuantity,
  formatQuantity,
  parseIngredientLine,
  scaleQuantity,
  type Unit,
} from "./quantity";
import {
  addShoppingIngredients,
  clearCheckedShoppingItems,
  setShoppingItemChecked,
} from "./shopping";

interface BrowserServices {
  storage: DataStorage;
  languages: readonly string[];
  prefersDark: boolean;
  confirm?(message: string): boolean;
  createId?(): string;
}

interface RecipeViewState {
  recipeId: string;
  servings: number;
}

interface DisplayIngredient {
  amount: string;
  unit: string;
  name: string;
  parsed: boolean;
}

const RECIPE_VIEW_KEY = "pinch.recipe-view.v1";

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function loadRecipeView(storage: DataStorage): RecipeViewState | undefined {
  try {
    const saved: unknown = JSON.parse(storage.getItem(RECIPE_VIEW_KEY) ?? "null");
    if (
      typeof saved === "object" &&
      saved !== null &&
      typeof (saved as RecipeViewState).recipeId === "string" &&
      Number.isInteger((saved as RecipeViewState).servings) &&
      (saved as RecipeViewState).servings >= 1
    ) {
      return saved as RecipeViewState;
    }
  } catch {
    // A blocked or malformed local store should not prevent startup.
  }
  return undefined;
}

function saveRecipeView(storage: DataStorage, state: RecipeViewState): void {
  try {
    storage.setItem(RECIPE_VIEW_KEY, JSON.stringify(state));
  } catch {
    // The view remains usable for the current session if storage is unavailable.
  }
}

function displayUnit(canonicalQuantity: number, canonicalUnit: Unit, system: UnitSystem): Unit {
  if (canonicalUnit === "count") return "count";
  if (system === "imperial") return canonicalUnit === "g" ? "oz" : "cup";
  if (canonicalUnit === "g" && canonicalQuantity >= 1000) return "kg";
  if (canonicalUnit === "mL" && canonicalQuantity >= 1000) return "L";
  return canonicalUnit;
}

export function formatIngredient(
  line: string,
  baseServings: number,
  targetServings: number,
  unitSystem: UnitSystem,
  locale: Locale,
): DisplayIngredient {
  const ingredient = parseIngredientLine(line);
  if (!ingredient.parsed) {
    return { amount: "", unit: "", name: line, parsed: false };
  }

  const scaled = scaleQuantity(ingredient.parsed.quantity, baseServings, targetServings);
  if (scaled === undefined) {
    return { amount: "", unit: "", name: line, parsed: false };
  }
  const unit = displayUnit(scaled, ingredient.parsed.unit, unitSystem);
  const converted = convertQuantity(scaled, ingredient.parsed.unit, unit);
  if (converted === undefined) {
    return { amount: "", unit: "", name: line, parsed: false };
  }
  return {
    amount: formatQuantity(converted, unit, locale),
    unit: unit === "count" ? "" : unit,
    name: ingredient.parsed.name,
    parsed: true,
  };
}

export function startApp(
  root: HTMLElement,
  services: BrowserServices = {
    storage: window.localStorage,
    languages: navigator.languages,
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    confirm: window.confirm.bind(window),
    createId: () => crypto.randomUUID(),
  },
): () => Preferences {
  const defaults = loadPreferences(services.storage, services.languages, services.prefersDark);
  const opened = RecipeRepository.open(services.storage, createInitialData(defaults));
  const repository = opened.ok ? opened.value : undefined;
  let preferences = repository?.snapshot().preferences ?? defaults;
  let editingId: string | undefined;
  const storedView = loadRecipeView(services.storage);
  let selectedRecipeId = storedView?.recipeId;
  let targetServings = storedView?.servings;

  const localeButton = root.querySelector<HTMLButtonElement>("#locale-toggle");
  const themeButton = root.querySelector<HTMLButtonElement>("#theme-toggle");
  const status = root.querySelector<HTMLElement>("[data-preference-status]");
  const dataStatus = root.querySelector<HTMLElement>("[data-data-status]");
  const list = root.querySelector<HTMLElement>("[data-recipe-list]");
  const form = root.querySelector<HTMLFormElement>("[data-recipe-form]");
  const formTitle = root.querySelector<HTMLElement>("[data-form-title]");
  const cancelButton = root.querySelector<HTMLButtonElement>("[data-cancel-edit]");
  const importInput = root.querySelector<HTMLInputElement>("#import-data");
  const exportLink = root.querySelector<HTMLAnchorElement>("[data-export]");
  const clearButton = root.querySelector<HTMLButtonElement>("[data-clear]");
  if (
    !localeButton ||
    !themeButton ||
    !status ||
    !dataStatus ||
    !list ||
    !form ||
    !formTitle ||
    !cancelButton ||
    !importInput ||
    !exportLink ||
    !clearButton
  ) {
    throw new Error("The application shell is incomplete.");
  }

  const recipeTitle = root.querySelector<HTMLElement>("[data-recipe-title]");
  const recipeYield = root.querySelector<HTMLElement>("[data-recipe-yield]");
  const ingredientList = root.querySelector<HTMLElement>("[data-ingredient-list]");
  const servingOutput = root.querySelector<HTMLOutputElement>("[data-servings]");
  const decreaseButton = root.querySelector<HTMLButtonElement>("[data-decrease]");
  const increaseButton = root.querySelector<HTMLButtonElement>("[data-increase]");
  const unitButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-unit]")];
  const recipeStatus = root.querySelector<HTMLElement>("[data-recipe-status]");
  const measureFill = root.querySelector<HTMLElement>("[data-measure-fill]");
  const addShoppingButton = root.querySelector<HTMLButtonElement>("[data-add-shopping]");
  const shoppingTitle = root.querySelector<HTMLElement>("[data-shopping-title]");
  const shoppingEmpty = root.querySelector<HTMLElement>("[data-shopping-empty]");
  const shoppingList = root.querySelector<HTMLElement>("[data-shopping-list]");
  const clearCheckedButton = root.querySelector<HTMLButtonElement>("[data-clear-checked]");
  const shoppingStatus = root.querySelector<HTMLElement>("[data-shopping-status]");
  const hasShoppingView =
    addShoppingButton &&
    shoppingTitle &&
    shoppingEmpty &&
    shoppingList &&
    clearCheckedButton &&
    shoppingStatus;
  const hasRecipeView =
    recipeTitle &&
    recipeYield &&
    ingredientList &&
    servingOutput &&
    decreaseButton &&
    increaseButton &&
    recipeStatus &&
    measureFill &&
    unitButtons.length === 2;

  const announceFailure = (result: DataResult<unknown>): boolean => {
    if (result.ok) return false;
    dataStatus.textContent = translate(preferences.locale, `data.error.${result.error}`);
    return true;
  };

  const announceShoppingFailure = (result: DataResult<unknown>): boolean => {
    if (result.ok) return false;
    const message = translate(preferences.locale, `data.error.${result.error}`);
    dataStatus.textContent = message;
    if (shoppingStatus) shoppingStatus.textContent = message;
    return true;
  };

  const recipes = (): Recipe[] => repository?.snapshot().recipes ?? [];

  const selectedRecipe = (): Recipe | undefined => {
    const available = recipes();
    const selected = available.find(({ id }) => id === selectedRecipeId) ?? available[0];
    if (selected && selected.id !== selectedRecipeId) {
      selectedRecipeId = selected.id;
      targetServings = selected.baseServings;
      saveRecipeView(services.storage, {
        recipeId: selected.id,
        servings: selected.baseServings,
      });
    }
    return selected;
  };

  const renderShopping = (focusId?: string): void => {
    if (!hasShoppingView) return;
    const items = repository?.snapshot().shoppingItems ?? [];
    const ordered = [...items].sort((left, right) => Number(left.checked) - Number(right.checked));
    shoppingTitle.textContent = translate(preferences.locale, "shopping.title", {
      count: items.length,
    });
    shoppingEmpty.textContent = translate(preferences.locale, "shopping.empty");
    shoppingEmpty.hidden = items.length > 0;
    clearCheckedButton.textContent = translate(preferences.locale, "shopping.clearChecked");
    clearCheckedButton.disabled = !items.some(({ checked }) => checked);
    shoppingList.replaceChildren(
      ...ordered.map((item) => {
        const row = document.createElement("li");
        if (item.checked) row.className = "is-checked";
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = item.checked;
        checkbox.dataset.shoppingId = item.id;
        checkbox.addEventListener("change", () => {
          if (!repository) return;
          const next = setShoppingItemChecked(
            repository.snapshot().shoppingItems,
            item.id,
            checkbox.checked,
          );
          const result = repository.updateShoppingItems(next);
          if (announceShoppingFailure(result)) {
            checkbox.checked = item.checked;
            return;
          }
          const checkedCount = next.filter((shoppingItem) => shoppingItem.checked).length;
          shoppingStatus.textContent = translate(preferences.locale, "shopping.collected", {
            checked: checkedCount,
            count: next.length,
          });
          renderShopping(item.id);
        });
        const copy = document.createElement("span");
        if (item.quantity !== undefined && item.unit) {
          const unit = displayUnit(item.quantity, item.unit, preferences.unitSystem);
          const converted = convertQuantity(item.quantity, item.unit, unit);
          const amount =
            converted === undefined ? "" : formatQuantity(converted, unit, preferences.locale);
          copy.textContent = `${amount}${unit === "count" ? "" : ` ${unit}`} ${item.name}`.trim();
        } else {
          copy.textContent = item.originalText ?? item.name;
        }
        label.append(checkbox, copy);
        row.append(label);
        return row;
      }),
    );
    if (focusId) {
      [...shoppingList.querySelectorAll<HTMLInputElement>("[data-shopping-id]")]
        .find((checkbox) => checkbox.dataset.shoppingId === focusId)
        ?.focus({ preventScroll: true });
    }
  };

  const renderRecipe = (): void => {
    if (!hasRecipeView) return;
    const recipe = selectedRecipe();
    if (!recipe) {
      recipeTitle.textContent = translate(preferences.locale, "recipe.emptyTitle");
      recipeYield.textContent = translate(preferences.locale, "recipe.empty");
      ingredientList.replaceChildren();
      decreaseButton.disabled = true;
      increaseButton.disabled = true;
      if (addShoppingButton) addShoppingButton.disabled = true;
      return;
    }

    const servings = targetServings ?? recipe.baseServings;
    targetServings = servings;
    recipeTitle.textContent = localize(recipe.title, preferences.locale);
    recipeYield.textContent = translate(
      preferences.locale,
      servings === 1 ? "recipe.makesOne" : "recipe.makes",
      {
      servings,
      },
    );
    servingOutput.value = String(servings);
    servingOutput.textContent = String(servings);
    decreaseButton.disabled = servings <= 1;
    decreaseButton.setAttribute("aria-label", translate(preferences.locale, "recipe.decrease"));
    increaseButton.setAttribute("aria-label", translate(preferences.locale, "recipe.increase"));
    if (addShoppingButton) {
      addShoppingButton.disabled = false;
      addShoppingButton.textContent = translate(preferences.locale, "shopping.add", {
        count: recipe.ingredients.length,
      });
    }
    measureFill.style.width = `${Math.min(100, Math.max(12, (servings / recipe.baseServings) * 42))}%`;

    for (const button of unitButtons) {
      const system = button.dataset.unit as UnitSystem;
      button.textContent = translate(preferences.locale, `recipe.${system}`);
      button.setAttribute("aria-pressed", String(system === preferences.unitSystem));
    }

    ingredientList.replaceChildren(
      ...recipe.ingredients.map((localizedLine) => {
        const line = localize(localizedLine, preferences.locale);
        const display = formatIngredient(
          line,
          recipe.baseServings,
          servings,
          preferences.unitSystem,
          preferences.locale,
        );
        const item = document.createElement("li");
        if (!display.parsed) {
          item.className = "unparsed-ingredient";
          const original = document.createElement("span");
          original.textContent = display.name;
          const note = document.createElement("small");
          note.textContent = translate(preferences.locale, "recipe.asWritten");
          item.append(original, note);
          return item;
        }
        const amount = document.createElement("span");
        amount.className = "amount";
        amount.textContent = `${display.amount}${display.unit ? ` ${display.unit}` : ""}`;
        const name = document.createElement("span");
        name.textContent = display.name;
        item.append(amount, name);
        return item;
      }),
    );
  };

  const resetForm = (): void => {
    editingId = undefined;
    form.reset();
    formTitle.textContent = translate(preferences.locale, "editor.addTitle");
    cancelButton.hidden = true;
  };

  const fillForm = (recipe: Recipe): void => {
    editingId = recipe.id;
    const locale = preferences.locale;
    const title = form.elements.namedItem("title");
    const servings = form.elements.namedItem("servings");
    const ingredients = form.elements.namedItem("ingredients");
    const steps = form.elements.namedItem("steps");
    if (
      title instanceof HTMLInputElement &&
      servings instanceof HTMLInputElement &&
      ingredients instanceof HTMLTextAreaElement &&
      steps instanceof HTMLTextAreaElement
    ) {
      title.value = localize(recipe.title, locale);
      servings.value = String(recipe.baseServings);
      ingredients.value = recipe.ingredients.map((item) => localize(item, locale)).join("\n");
      steps.value = recipe.steps.map((item) => localize(item, locale)).join("\n");
    }
    formTitle.textContent = translate(locale, "editor.editTitle");
    cancelButton.hidden = false;
    if (title instanceof HTMLElement) title.focus();
  };

  const chooseRecipe = (recipe: Recipe): void => {
    selectedRecipeId = recipe.id;
    targetServings = recipe.baseServings;
    recipeStatus?.replaceChildren();
    saveRecipeView(services.storage, {
      recipeId: recipe.id,
      servings: recipe.baseServings,
    });
    renderRecipes();
    renderRecipe();
    recipeTitle?.focus({ preventScroll: true });
  };

  const renderRecipes = (): void => {
    exportLink.href = repository
      ? `data:application/json;charset=utf-8,${encodeURIComponent(repository.exportJson())}`
      : "#";
    list.replaceChildren();
    const available = recipes();
    if (available.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = translate(preferences.locale, "library.empty");
      list.append(empty);
      renderRecipe();
      return;
    }
    for (const recipe of available) {
      const item = document.createElement("article");
      item.className = "recipe-card";
      if (recipe.id === selectedRecipe()?.id) item.classList.add("is-current");
      const heading = document.createElement("h3");
      heading.textContent = localize(recipe.title, preferences.locale);
      const summary = document.createElement("p");
      summary.textContent = translate(preferences.locale, "library.recipeSummary", {
        servings: recipe.baseServings,
        ingredients: recipe.ingredients.length,
      });
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = translate(preferences.locale, "actions.open");
      open.setAttribute(
        "aria-label",
        `${translate(preferences.locale, "actions.open")} ${localize(recipe.title, preferences.locale)}`,
      );
      if (recipe.id === selectedRecipe()?.id) open.setAttribute("aria-current", "true");
      open.addEventListener("click", () => chooseRecipe(recipe));
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = translate(preferences.locale, "actions.edit");
      edit.addEventListener("click", () => fillForm(recipe));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = translate(preferences.locale, "actions.delete");
      remove.addEventListener("click", () => {
        if (
          !repository ||
          !(services.confirm ?? window.confirm.bind(window))(
            translate(preferences.locale, "confirm.delete"),
          )
        )
          return;
        const result = repository.deleteRecipe(recipe.id);
        if (!announceFailure(result)) {
          dataStatus.textContent = translate(preferences.locale, "data.deleted");
          if (editingId === recipe.id) resetForm();
          if (selectedRecipeId === recipe.id) {
            selectedRecipeId = undefined;
            targetServings = undefined;
          }
          renderRecipes();
          renderRecipe();
        }
      });
      actions.append(open, edit, remove);
      item.append(heading, summary, actions);
      list.append(item);
    }
  };

  const render = (announcement?: string): void => {
    const { locale, theme } = preferences;
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.title = translate(locale, "meta.title");

    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (key) element.textContent = translate(locale, key);
    });
    document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((element) => {
      const key = element.dataset.i18nAria;
      if (key) element.setAttribute("aria-label", translate(locale, key));
    });
    document.querySelectorAll<HTMLMetaElement>("[data-i18n-content]").forEach((element) => {
      const key = element.dataset.i18nContent;
      if (key) element.content = translate(locale, key);
    });

    localeButton.textContent = locale === "en" ? "FR" : "EN";
    localeButton.setAttribute("aria-label", translate(locale, "prefs.switchTo"));
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    const themeLabel = translate(locale, `prefs.${nextTheme}`);
    const label = themeButton.querySelector<HTMLElement>("[data-theme-label]");
    if (label) label.textContent = themeLabel;
    themeButton.setAttribute("aria-label", themeLabel);
    status.textContent = announcement ?? "";
    if (!editingId) formTitle.textContent = translate(locale, "editor.addTitle");
    cancelButton.textContent = translate(locale, "actions.cancel");
    exportLink.setAttribute("download", "pinch-data.json");
    renderRecipes();
    renderRecipe();
    renderShopping();
  };

  const updatePreferences = (next: Preferences, announcement: string): void => {
    if (!repository) return;
    const result = repository.updatePreferences(next);
    if (announceFailure(result)) return;
    preferences = next;
    render(announcement);
  };

  localeButton.addEventListener("click", () => {
    const locale: Locale = preferences.locale === "en" ? "fr" : "en";
    updatePreferences({ ...preferences, locale }, translate(locale, "prefs.localeChanged"));
  });

  themeButton.addEventListener("click", () => {
    const theme: Theme = preferences.theme === "light" ? "dark" : "light";
    updatePreferences(
      { ...preferences, theme },
      translate(
        preferences.locale,
        theme === "dark" ? "prefs.themeChangedDark" : "prefs.themeChangedLight",
      ),
    );
  });

  decreaseButton?.addEventListener("click", () => {
    const recipe = selectedRecipe();
    if (!recipe || targetServings === undefined) return;
    if (targetServings === 1) {
      recipeStatus!.textContent = translate(preferences.locale, "recipe.minimum");
      return;
    }
    targetServings -= 1;
    saveRecipeView(services.storage, { recipeId: recipe.id, servings: targetServings });
    recipeStatus!.textContent = translate(
      preferences.locale,
      targetServings === 1 ? "recipe.scaledOne" : "recipe.scaled",
      {
      servings: targetServings,
      },
    );
    renderRecipe();
  });

  increaseButton?.addEventListener("click", () => {
    const recipe = selectedRecipe();
    if (!recipe || targetServings === undefined) return;
    targetServings += 1;
    saveRecipeView(services.storage, { recipeId: recipe.id, servings: targetServings });
    recipeStatus!.textContent = translate(preferences.locale, "recipe.scaled", {
      servings: targetServings,
    });
    renderRecipe();
  });

  for (const button of unitButtons) {
    button.addEventListener("click", () => {
      const unitSystem = button.dataset.unit as UnitSystem;
      if (unitSystem === preferences.unitSystem) return;
      updatePreferences(
        { ...preferences, unitSystem },
        translate(preferences.locale, "recipe.unitsChanged", {
          units: translate(preferences.locale, `recipe.${unitSystem}`),
        }),
      );
      if (recipeStatus) {
        recipeStatus.textContent = translate(preferences.locale, "recipe.unitsChanged", {
          units: translate(preferences.locale, `recipe.${unitSystem}`),
        });
      }
    });
  }

  addShoppingButton?.addEventListener("click", () => {
    const recipe = selectedRecipe();
    if (!repository || !recipe) return;
    const servings = targetServings ?? recipe.baseServings;
    const next = addShoppingIngredients(
      repository.snapshot().shoppingItems,
      recipe.ingredients.map((ingredient) => ({
        text: localize(ingredient, preferences.locale),
        baseServings: recipe.baseServings,
        targetServings: servings,
      })),
      services.createId ?? (() => crypto.randomUUID()),
    );
    const result = repository.updateShoppingItems(next);
    if (announceShoppingFailure(result)) return;
    shoppingStatus!.textContent = translate(preferences.locale, "shopping.added", {
      count: recipe.ingredients.length,
      servings,
    });
    renderShopping();
  });

  clearCheckedButton?.addEventListener("click", () => {
    if (!repository) return;
    const current = repository.snapshot().shoppingItems;
    const checkedCount = current.filter(({ checked }) => checked).length;
    const result = repository.updateShoppingItems(clearCheckedShoppingItems(current));
    if (announceShoppingFailure(result)) return;
    shoppingStatus!.textContent = translate(preferences.locale, "shopping.cleared", {
      count: checkedCount,
    });
    renderShopping();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!repository) return;
    const values = new FormData(form);
    const ingredientLines = lines(values.get("ingredients"));
    const stepLines = lines(values.get("steps"));
    const title = String(values.get("title") ?? "").trim();
    const servings = Number(values.get("servings"));
    const previous = editingId
      ? repository.snapshot().recipes.find(({ id }) => id === editingId)
      : undefined;
    const localized = (value: string, old?: { fallback: string; en?: string; fr?: string }) => ({
      ...(old ?? {}),
      fallback: old?.fallback ?? value,
      [preferences.locale]: value,
    });
    const recipe: Recipe = {
      id: previous?.id ?? (services.createId?.() ?? crypto.randomUUID()),
      title: localized(title, previous?.title),
      baseServings: servings,
      ingredients: ingredientLines.map((value, index) =>
        localized(value, previous?.ingredients[index]),
      ),
      steps: stepLines.map((value, index) => localized(value, previous?.steps[index])),
      source: previous?.source ?? "user",
    };
    const result = repository.saveRecipe(recipe);
    if (!announceFailure(result)) {
      dataStatus.textContent = translate(preferences.locale, "data.saved");
      if (!previous) {
        selectedRecipeId = recipe.id;
        targetServings = recipe.baseServings;
        saveRecipeView(services.storage, {
          recipeId: recipe.id,
          servings: recipe.baseServings,
        });
      }
      resetForm();
      renderRecipes();
      renderRecipe();
    }
  });

  cancelButton.addEventListener("click", resetForm);

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file || !repository) return;
    try {
      const result = repository.importJson(await file.text());
      if (result.ok) {
        preferences = result.value.preferences;
        selectedRecipeId = undefined;
        targetServings = undefined;
        resetForm();
        dataStatus.textContent = translate(preferences.locale, "data.imported");
        render();
      } else {
        announceFailure(result);
      }
    } catch {
      dataStatus.textContent = translate(preferences.locale, "data.error.invalid");
    } finally {
      importInput.value = "";
    }
  });

  clearButton.addEventListener("click", () => {
    if (
      !repository ||
      !(services.confirm ?? window.confirm.bind(window))(
        translate(preferences.locale, "confirm.clear"),
      )
    )
      return;
    const result = repository.clear();
    if (result.ok) {
      preferences = result.value.preferences;
      selectedRecipeId = undefined;
      targetServings = undefined;
      resetForm();
      dataStatus.textContent = translate(preferences.locale, "data.cleared");
      render();
    } else {
      announceFailure(result);
    }
  });

  if (!opened.ok) dataStatus.textContent = translate(preferences.locale, `data.error.${opened.error}`);
  render();
  return () => ({ ...preferences });
}
