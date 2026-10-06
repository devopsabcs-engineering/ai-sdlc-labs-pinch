import {
  createInitialData,
  localize,
  RecipeRepository,
  type DataResult,
  type DataStorage,
  type Recipe,
} from "./data";
import { translate, type Locale } from "./i18n";
import { loadPreferences, type Preferences, type Theme } from "./preferences";

interface BrowserServices {
  storage: DataStorage;
  languages: readonly string[];
  prefersDark: boolean;
  confirm?(message: string): boolean;
  createId?(): string;
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
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

  const announceFailure = (result: DataResult<unknown>): boolean => {
    if (result.ok) return false;
    dataStatus.textContent = translate(preferences.locale, `data.error.${result.error}`);
    return true;
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

  const renderRecipes = (): void => {
    exportLink.href = repository
      ? `data:application/json;charset=utf-8,${encodeURIComponent(repository.exportJson())}`
      : "#";
    list.replaceChildren();
    const recipes = repository?.snapshot().recipes ?? [];
    if (recipes.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = translate(preferences.locale, "library.empty");
      list.append(empty);
      return;
    }
    for (const recipe of recipes) {
      const item = document.createElement("article");
      item.className = "recipe-card";
      const heading = document.createElement("h3");
      heading.textContent = localize(recipe.title, preferences.locale);
      const summary = document.createElement("p");
      summary.textContent = translate(preferences.locale, "library.recipeSummary", {
        servings: recipe.baseServings,
        ingredients: recipe.ingredients.length,
      });
      const actions = document.createElement("div");
      actions.className = "card-actions";
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
          renderRecipes();
        }
      });
      actions.append(edit, remove);
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
    exportLink.href = repository
      ? `data:application/json;charset=utf-8,${encodeURIComponent(repository.exportJson())}`
      : "#";
    renderRecipes();
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
      resetForm();
      renderRecipes();
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
