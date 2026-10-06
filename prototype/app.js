(() => {
  "use strict";

  const copy = {
    en: {
      title: "Pinch — Crepes",
      skip: "Skip to recipe",
      preferences: "Preferences",
      switchLanguage: "Switch to French",
      themeDark: "Dark theme",
      themeLight: "Light theme",
      recipe: "Recipe",
      recipeTitle: "Crepes",
      makes: (n) => `Makes ${n} ${n === 1 ? "serving" : "servings"}`,
      servings: "Servings",
      decrease: "Decrease servings",
      increase: "Increase servings",
      units: "Units",
      metric: "Metric",
      imperial: "Imperial",
      ingredients: "Ingredients",
      add: "Add 4 ingredients",
      start: "Start cooking",
      list: "Shopping list",
      empty: "Add ingredients from the recipe.",
      clear: "Clear checked",
      primary: "Primary",
      scaled: (n) => `Scaled for ${n} ${n === 1 ? "serving" : "servings"}`,
      minimum: "Minimum 1 serving",
      added: (n) =>
        `4 ingredients added for ${n} ${n === 1 ? "serving" : "servings"}`,
      listContext: (n) => `For ${n} ${n === 1 ? "serving" : "servings"}`,
      collected: (done, total) => `${done} of ${total} collected`,
      cleared: (n) => `${n} checked ${n === 1 ? "item" : "items"} cleared`,
      close: "Close",
      cookMode: "Cook mode",
      stepCount: (n) => `${n} of 3`,
      previous: "Previous",
      next: "Next",
      finish: "Finish",
      awake: "Screen stays awake",
      wakeFallback: "Keep your screen awake in device settings.",
      asWritten: "As written",
      names: ["flour", "milk", "eggs", "salt"],
      unitsList: {
        g: "g",
        ml: "ml",
        oz: "oz",
        cups: "cups",
        pinch: "pinch",
        pinches: "pinches",
      },
      steps: [
        "Whisk the flour and eggs until smooth.",
        "Gradually whisk in the milk and salt.",
        "Cook thin layers in a hot pan until golden on both sides.",
      ],
    },
    fr: {
      title: "Pinch — Crêpes",
      skip: "Aller à la recette",
      preferences: "Préférences",
      switchLanguage: "Passer à l’anglais",
      themeDark: "Thème sombre",
      themeLight: "Thème clair",
      recipe: "Recette",
      recipeTitle: "Crêpes",
      makes: (n) => `Donne ${n} ${n === 1 ? "portion" : "portions"}`,
      servings: "Portions",
      decrease: "Réduire le nombre de portions",
      increase: "Augmenter le nombre de portions",
      units: "Unités",
      metric: "Métrique",
      imperial: "Impérial",
      ingredients: "Ingrédients",
      add: "Ajouter 4 ingrédients",
      start: "Commencer à cuisiner",
      list: "Liste de courses",
      empty: "Ajoutez les ingrédients de la recette.",
      clear: "Effacer les articles cochés",
      primary: "Principal",
      scaled: (n) => `Ajustée pour ${n} ${n === 1 ? "portion" : "portions"}`,
      minimum: "Minimum : 1 portion",
      added: (n) =>
        `4 ingrédients ajoutés pour ${n} ${n === 1 ? "portion" : "portions"}`,
      listContext: (n) => `Pour ${n} ${n === 1 ? "portion" : "portions"}`,
      collected: (done, total) =>
        `${done} article${done === 1 ? "" : "s"} sur ${total} ramassé${done === 1 ? "" : "s"}`,
      cleared: (n) =>
        `${n} article${n === 1 ? "" : "s"} coché${n === 1 ? "" : "s"} effacé${n === 1 ? "" : "s"}`,
      close: "Fermer",
      cookMode: "Mode cuisine",
      stepCount: (n) => `${n} sur 3`,
      previous: "Précédent",
      next: "Suivant",
      finish: "Terminer",
      awake: "L’écran reste allumé",
      wakeFallback: "Gardez l’écran allumé dans les réglages de l’appareil.",
      asWritten: "Tel qu’écrit",
      names: ["farine", "lait", "œufs", "sel"],
      unitsList: {
        g: "g",
        ml: "ml",
        oz: "oz",
        cups: "tasses",
        pinch: "pincée",
        pinches: "pincées",
      },
      steps: [
        "Fouettez la farine et les œufs jusqu’à obtenir une pâte lisse.",
        "Incorporez progressivement le lait et le sel en fouettant.",
        "Faites cuire de fines crêpes dans une poêle chaude jusqu’à ce que les deux côtés soient dorés.",
      ],
    },
  };

  const ingredients = [
    { metric: 250, metricUnit: "g", imperial: 8.8, imperialUnit: "oz" },
    { metric: 500, metricUnit: "ml", imperial: 2.1, imperialUnit: "cups" },
    { metric: 2, metricUnit: "", imperial: 2, imperialUnit: "" },
    {
      metric: 1,
      metricUnit: "pinch",
      imperial: 1,
      imperialUnit: "pinch",
      unknown: true,
    },
  ];

  const state = {
    language: "en",
    theme: matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    servings: 4,
    units: "metric",
    view: "recipe",
    shopping: [],
    shoppingServings: 4,
    cookStep: 0,
    wakeLock: null,
    wakeStatus: "fallback",
    lastStatus: null,
    changeTimer: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const el = {
    workspace: $(".workspace"),
    ingredients: $("#ingredients"),
    servings: $("#servings"),
    decrease: $("#decrease"),
    increase: $("#increase"),
    metric: $("#metric"),
    imperial: $("#imperial"),
    yield: $("#yield-copy"),
    status: $("#app-status"),
    add: $("#add-ingredients"),
    start: $("#start-cooking"),
    shopping: $("#shopping-list"),
    empty: $("#empty-list"),
    clear: $("#clear-checked"),
    count: $("#shopping-count"),
    navCount: $("#nav-count"),
    listContext: $("#list-context"),
    showRecipe: $("#show-recipe"),
    showShopping: $("#show-shopping"),
    dialog: $("#cook-dialog"),
    cookHeading: $("#cook-heading"),
    stepCount: $("#step-count"),
    wakeStatus: $("#wake-status"),
    previous: $("#previous-step"),
    next: $("#next-step"),
  };

  function t() {
    return copy[state.language];
  }
  function number(value) {
    return new Intl.NumberFormat(state.language === "fr" ? "fr-FR" : "en-US", {
      maximumFractionDigits: 1,
    }).format(Math.round(value * 10) / 10);
  }
  function ingredientValue(
    item,
    servings = state.servings,
    units = state.units,
  ) {
    const base = (item[units] * servings) / 4;
    const unitKey = item[`${units}Unit`];
    const pluralUnit =
      unitKey === "pinch" && Math.abs(base - 1) > 0.001 ? "pinches" : unitKey;
    return { amount: base, unit: pluralUnit };
  }
  function amountText(value) {
    return `${number(value.amount)}${value.unit ? ` ${t().unitsList[value.unit]}` : ""}`;
  }

  function renderIngredients(changed = false) {
    el.ingredients.replaceChildren(
      ...ingredients.map((item, index) => {
        const li = document.createElement("li");
        const amount = document.createElement("span");
        amount.className = `amount${changed ? " changed" : ""}`;
        amount.textContent = amountText(ingredientValue(item));
        const name = document.createElement("span");
        name.textContent = t().names[index];
        if (item.unknown && state.units === "imperial") {
          const note = document.createElement("small");
          note.className = "unknown-note";
          note.textContent = t().asWritten;
          name.append(" ", note);
        }
        li.append(amount, name);
        return li;
      }),
    );
    if (changed) {
      clearTimeout(state.changeTimer);
      state.changeTimer = setTimeout(
        () =>
          $$(".amount.changed").forEach((node) =>
            node.classList.remove("changed"),
          ),
        1500,
      );
    }
  }

  function renderShopping() {
    const checked = state.shopping.filter((item) => item.checked);
    const unchecked = state.shopping.filter((item) => !item.checked);
    const ordered = [...unchecked, ...checked];
    el.shopping.replaceChildren(
      ...ordered.map((item) => {
        const li = document.createElement("li");
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = item.checked;
        input.dataset.index = item.index;
        const amount = document.createElement("span");
        amount.className = "amount";
        amount.textContent = amountText({
          amount: item.amount,
          unit: item.unit,
        });
        const name = document.createElement("span");
        name.textContent = t().names[item.index];
        label.append(input, amount, name);
        li.append(label);
        return li;
      }),
    );
    const total = state.shopping.length;
    el.empty.hidden = total > 0;
    el.clear.disabled = checked.length === 0;
    el.count.textContent = `(${total})`;
    el.navCount.textContent = `(${total})`;
    el.listContext.textContent = total
      ? t().listContext(state.shoppingServings)
      : "";
  }

  function translated(key, args = []) {
    return typeof t()[key] === "function" ? t()[key](...args) : t()[key];
  }
  function setStatus(key, ...args) {
    state.lastStatus = { key, args };
    el.status.textContent = translated(key, args);
  }

  function renderCook() {
    el.cookHeading.textContent = t().steps[state.cookStep];
    el.stepCount.textContent = t().stepCount(state.cookStep + 1);
    el.previous.innerHTML = `← ${t().previous}`;
    el.previous.disabled = state.cookStep === 0;
    el.next.innerHTML = state.cookStep === 2 ? t().finish : `${t().next} →`;
    el.wakeStatus.textContent =
      state.wakeStatus === "active" ? t().awake : t().wakeFallback;
  }

  function renderLanguage() {
    const c = t();
    document.documentElement.lang = state.language;
    document.title = c.title;
    $(".skip-link").textContent = c.skip;
    $$("[data-copy]").forEach((node) => {
      node.textContent = c[node.dataset.copy];
    });
    $$(".language-button").forEach((button) => {
      button.textContent = state.language === "en" ? "FR" : "EN";
      button.setAttribute("aria-label", c.switchLanguage);
    });
    $$(".preferences").forEach((node) =>
      node.setAttribute("aria-label", c.preferences),
    );
    $(".mobile-nav").setAttribute("aria-label", c.primary);
    $("#recipe-title").textContent = c.recipeTitle;
    el.yield.textContent = c.makes(state.servings);
    $("#servings-label").textContent = c.servings;
    el.decrease.setAttribute("aria-label", c.decrease);
    el.increase.setAttribute("aria-label", c.increase);
    $("#units-label").textContent = c.units;
    el.metric.textContent = c.metric;
    el.imperial.textContent = c.imperial;
    el.add.textContent = c.add;
    $("#shopping-title").childNodes[0].textContent = `${c.list} `;
    el.empty.textContent = c.empty;
    el.clear.textContent = c.clear;
    renderThemeButtons();
    renderIngredients();
    renderShopping();
    renderCook();
    if (state.lastStatus) {
      el.status.textContent = translated(
        state.lastStatus.key,
        state.lastStatus.args,
      );
    }
  }

  function renderThemeButtons() {
    const label = state.theme === "light" ? t().themeDark : t().themeLight;
    $$(".theme-label").forEach((node) => {
      node.textContent = label;
    });
    $$(".theme-button").forEach((node) =>
      node.setAttribute("aria-label", label),
    );
  }

  function setServings(next) {
    if (next < 1) {
      setStatus("minimum");
      return;
    }
    state.servings = next;
    el.servings.value = next;
    el.servings.textContent = next;
    el.decrease.disabled = next === 1;
    el.yield.textContent = t().makes(next);
    $(".measure-rule").style.setProperty(
      "--scale-width",
      `${Math.min(100, next * 10)}%`,
    );
    renderIngredients(true);
    setStatus("scaled", next);
  }

  function setUnits(units) {
    state.units = units;
    el.metric.setAttribute("aria-pressed", String(units === "metric"));
    el.imperial.setAttribute("aria-pressed", String(units === "imperial"));
    renderIngredients(true);
    setStatus("scaled", state.servings);
  }

  function setView(view) {
    state.view = view;
    el.workspace.dataset.view = view;
    el.showRecipe.toggleAttribute("aria-current", view === "recipe");
    el.showShopping.toggleAttribute("aria-current", view === "shopping");
    (view === "recipe" ? $("#recipe-title") : $("#shopping-title")).focus({
      preventScroll: true,
    });
  }

  function addIngredients() {
    state.shoppingServings = state.servings;
    state.shopping = ingredients.map((item, index) => {
      const value = ingredientValue(item);
      const existing = state.shopping.find((row) => row.index === index);
      return {
        index,
        amount: value.amount,
        unit: value.unit,
        checked: existing?.checked ?? false,
      };
    });
    renderShopping();
    setStatus("added", state.servings);
    if (matchMedia("(max-width: 47.99rem)").matches) setView("shopping");
  }

  async function requestWakeLock() {
    state.wakeStatus = "fallback";
    if ("wakeLock" in navigator) {
      try {
        state.wakeLock = await navigator.wakeLock.request("screen");
        state.wakeStatus = "active";
      } catch (_) {
        state.wakeLock = null;
      }
    }
    renderCook();
  }

  function openCook() {
    el.dialog.showModal();
    renderCook();
    el.cookHeading.focus();
    requestWakeLock();
  }
  async function closeCook() {
    if (state.wakeLock) {
      try {
        await state.wakeLock.release();
      } catch (_) {
        /* Prototype fallback is sufficient. */
      }
      state.wakeLock = null;
    }
    if (el.dialog.open) el.dialog.close();
    el.start.focus();
  }
  function moveStep(delta) {
    const next = Math.max(0, Math.min(2, state.cookStep + delta));
    if (next === state.cookStep && delta > 0 && state.cookStep === 2) {
      closeCook();
      return;
    }
    state.cookStep = next;
    renderCook();
    el.cookHeading.focus();
  }

  el.decrease.addEventListener("click", () => setServings(state.servings - 1));
  el.increase.addEventListener("click", () => setServings(state.servings + 1));
  el.metric.addEventListener("click", () => setUnits("metric"));
  el.imperial.addEventListener("click", () => setUnits("imperial"));
  el.add.addEventListener("click", addIngredients);
  el.start.addEventListener("click", openCook);
  el.clear.addEventListener("click", () => {
    const removed = state.shopping.filter((item) => item.checked).length;
    state.shopping = state.shopping.filter((item) => !item.checked);
    renderShopping();
    setStatus("cleared", removed);
  });
  el.shopping.addEventListener("change", (event) => {
    const index = Number(event.target.dataset.index);
    const item = state.shopping.find((row) => row.index === index);
    if (item) item.checked = event.target.checked;
    const done = state.shopping.filter((row) => row.checked).length;
    renderShopping();
    setStatus("collected", done, state.shopping.length);
    const refocused = el.shopping.querySelector(`[data-index="${index}"]`);
    refocused?.focus();
  });
  el.showRecipe.addEventListener("click", () => setView("recipe"));
  el.showShopping.addEventListener("click", () => setView("shopping"));
  $$(".language-button").forEach((button) =>
    button.addEventListener("click", () => {
      state.language = state.language === "en" ? "fr" : "en";
      renderLanguage();
    }),
  );
  $$(".theme-button").forEach((button) =>
    button.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = state.theme;
      renderThemeButtons();
    }),
  );
  $("#close-cook").addEventListener("click", closeCook);
  el.previous.addEventListener("click", () => moveStep(-1));
  el.next.addEventListener("click", () => moveStep(1));
  el.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeCook();
  });
  el.dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveStep(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveStep(-1);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      el.dialog.open &&
      !state.wakeLock
    )
      requestWakeLock();
  });

  document.documentElement.dataset.theme = state.theme;
  el.workspace.dataset.view = state.view;
  renderLanguage();
})();
