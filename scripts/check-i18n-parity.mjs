import { readFile } from "node:fs/promises";

const catalogUrls = {
  en: new URL("../src/catalogs/en.json", import.meta.url),
  fr: new URL("../src/catalogs/fr.json", import.meta.url),
};

function flatten(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" && child !== null ? flatten(child, path) : [[path, child]];
  });
}

const catalogs = Object.fromEntries(
  await Promise.all(
    Object.entries(catalogUrls).map(async ([locale, url]) => [
      locale,
      JSON.parse(await readFile(url, "utf8")),
    ]),
  ),
);
const entries = Object.fromEntries(
  Object.entries(catalogs).map(([locale, catalog]) => [locale, new Map(flatten(catalog))]),
);
const allKeys = new Set([...entries.en.keys(), ...entries.fr.keys()]);
const errors = [];

for (const key of allKeys) {
  for (const locale of ["en", "fr"]) {
    if (!entries[locale].has(key)) errors.push(`${locale}: missing "${key}"`);
    else if (typeof entries[locale].get(key) !== "string" || !entries[locale].get(key).trim()) {
      errors.push(`${locale}: "${key}" must be a non-empty string`);
    }
  }
}

if (errors.length) {
  console.error(`Catalog parity failed:\n${errors.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog parity passed (${allKeys.size} keys in each locale).`);
}
