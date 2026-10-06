import { translate, type Locale } from "./i18n";
import { loadPreferences, savePreferences, type Preferences, type Theme } from "./preferences";

interface BrowserServices {
  storage: Pick<Storage, "getItem" | "setItem">;
  languages: readonly string[];
  prefersDark: boolean;
}

export function startApp(
  root: HTMLElement,
  services: BrowserServices = {
    storage: window.localStorage,
    languages: navigator.languages,
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  },
): () => Preferences {
  let preferences = loadPreferences(
    services.storage,
    services.languages,
    services.prefersDark,
  );

  const localeButton = root.querySelector<HTMLButtonElement>("#locale-toggle");
  const themeButton = root.querySelector<HTMLButtonElement>("#theme-toggle");
  const status = root.querySelector<HTMLElement>("[data-preference-status]");
  if (!localeButton || !themeButton || !status) {
    throw new Error("The application shell is incomplete.");
  }

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
  };

  localeButton.addEventListener("click", () => {
    const locale: Locale = preferences.locale === "en" ? "fr" : "en";
    preferences = { ...preferences, locale };
    savePreferences(services.storage, preferences);
    render(translate(locale, "prefs.localeChanged"));
  });

  themeButton.addEventListener("click", () => {
    const theme: Theme = preferences.theme === "light" ? "dark" : "light";
    preferences = { ...preferences, theme };
    savePreferences(services.storage, preferences);
    render(
      translate(
        preferences.locale,
        theme === "dark" ? "prefs.themeChangedDark" : "prefs.themeChangedLight",
      ),
    );
  });

  render();
  return () => ({ ...preferences });
}
