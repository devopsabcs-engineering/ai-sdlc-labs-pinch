import { describe, expect, it } from "vitest";
import {
  loadPreferences,
  PREFERENCES_KEY,
  savePreferences,
} from "./preferences";

function memoryStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("preferences", () => {
  it("uses browser locale and theme when no preference is saved", () => {
    expect(loadPreferences(memoryStorage(), ["fr-CA", "en"], true)).toEqual({
      locale: "fr",
      theme: "dark",
      unitSystem: "metric",
    });
  });

  it("round-trips an explicit preference", () => {
    const storage = memoryStorage();
    savePreferences(storage, {
      locale: "en",
      theme: "light",
      unitSystem: "imperial",
    });
    expect(loadPreferences(storage, ["fr"], true)).toEqual({
      locale: "en",
      theme: "light",
      unitSystem: "imperial",
    });
  });

  it("ignores invalid stored values", () => {
    const storage = memoryStorage();
    storage.setItem(PREFERENCES_KEY, '{"locale":"es","theme":"dark"}');
    expect(loadPreferences(storage, ["en"], false)).toEqual({
      locale: "en",
      theme: "light",
      unitSystem: "metric",
    });
  });
});
