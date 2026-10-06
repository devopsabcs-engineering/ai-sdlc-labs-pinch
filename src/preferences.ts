import type { Locale } from "./i18n";

export type Theme = "light" | "dark";
export interface Preferences {
  locale: Locale;
  theme: Theme;
}

export const PREFERENCES_KEY = "pinch.preferences.v1";

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Preferences>;
  return (
    (candidate.locale === "en" || candidate.locale === "fr") &&
    (candidate.theme === "light" || candidate.theme === "dark")
  );
}

export function loadPreferences(
  storage: Pick<Storage, "getItem">,
  languages: readonly string[],
  prefersDark: boolean,
): Preferences {
  try {
    const saved = storage.getItem(PREFERENCES_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (isPreferences(parsed)) return parsed;
    }
  } catch {
    // A blocked or malformed local store should not prevent startup.
  }

  return {
    locale: languages.some((language) => language.toLowerCase().startsWith("fr")) ? "fr" : "en",
    theme: prefersDark ? "dark" : "light",
  };
}

export function savePreferences(
  storage: Pick<Storage, "setItem">,
  preferences: Preferences,
): void {
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences still apply for the current session if storage is unavailable.
  }
}
