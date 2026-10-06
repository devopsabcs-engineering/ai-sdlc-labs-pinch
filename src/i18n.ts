import en from "./catalogs/en.json";
import fr from "./catalogs/fr.json";

export type Locale = "en" | "fr";
type Catalog = typeof en;

const catalogs: Record<Locale, Catalog> = { en, fr };

export function translate(
  locale: Locale,
  key: string,
  values: Readonly<Record<string, string | number>> = {},
): string {
  let value: unknown = catalogs[locale];

  for (const segment of key.split(".")) {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      throw new Error(`Missing translation key: ${key}`);
    }
    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== "string") {
    throw new Error(`Translation is not a string: ${key}`);
  }
  return Object.entries(values).reduce(
    (message, [name, replacement]) =>
      message.replaceAll(`{${name}}`, String(replacement)),
    value,
  );
}
