import { describe, expect, it } from "vitest";
import {
  convertQuantity,
  formatQuantity,
  parseIngredientLine,
  scaleQuantity,
} from "./quantity";

describe("ingredient quantity parsing", () => {
  it.each([
    ["250 g flour", 250, "g", "mass", "flour"],
    ["1,5 L milk", 1500, "mL", "volume", "milk"],
    ["1/2 cup sugar", 118.29411825, "mL", "volume", "sugar"],
    ["1 1/2 tbsp oil", 22.180147171875, "mL", "volume", "oil"],
    ["2½ kg potatoes", 2500, "g", "mass", "potatoes"],
    ["3 eggs", 3, "count", "count", "eggs"],
    ["2 cuillères à café sel", 9.8578431875, "mL", "volume", "sel"],
  ])("parses %s into a canonical quantity", (line, quantity, unit, dimension, name) => {
    expect(parseIngredientLine(line).parsed).toMatchObject({
      quantity,
      unit,
      dimension,
      name,
    });
  });

  it.each([
    "",
    "salt to taste",
    "-1 cup flour",
    "1/0 cup flour",
    "1//2 cup flour",
    "1.2.3 kg flour",
    " 2 eggs",
    "2",
    "2 pinches salt",
    "1 pincée de sel",
  ])("preserves malformed or unparsed line %j", (line) => {
    expect(parseIngredientLine(line)).toEqual({ originalText: line });
  });

  it("retains the original text alongside parsed values", () => {
    const line = "½ cup walnuts";
    expect(parseIngredientLine(line)).toMatchObject({
      originalText: line,
      parsed: { quantity: 118.29411825, name: "walnuts" },
    });
  });
});

describe("quantity scaling", () => {
  it("always scales from the supplied canonical value", () => {
    expect(scaleQuantity(250, 4, 6)).toBe(375);
    expect(scaleQuantity(1 / 3, 1, 3)).toBe(1);
  });

  it.each([
    [100, 0, 2],
    [100, -1, 2],
    [100, 2, -1],
    [-100, 2, 4],
    [Number.NaN, 2, 4],
  ])("rejects invalid quantity or serving boundaries", (quantity, base, target) => {
    expect(scaleQuantity(quantity, base, target)).toBeUndefined();
  });

  it("supports a zero target without changing the input", () => {
    expect(scaleQuantity(100, 4, 0)).toBe(0);
  });
});

describe("same-dimension conversion", () => {
  it.each([
    [1, "kg", "g", 1000],
    [1, "lb", "g", 453.59237],
    [1, "oz", "g", 28.349523125],
    [1, "L", "mL", 1000],
    [1, "tsp", "mL", 4.92892159375],
    [1, "tbsp", "mL", 14.78676478125],
    [1, "fl oz", "mL", 29.5735295625],
    [1, "cup", "mL", 236.5882365],
  ] as const)("converts %s %s to %s", (quantity, from, to, expected) => {
    expect(convertQuantity(quantity, from, to)).toBeCloseTo(expected, 10);
    expect(convertQuantity(expected, to, from)).toBeCloseTo(quantity, 10);
  });

  it("does not convert across dimensions", () => {
    expect(convertQuantity(100, "g", "mL")).toBeUndefined();
    expect(convertQuantity(1, "count", "g")).toBeUndefined();
  });

  it("rejects invalid quantities", () => {
    expect(convertQuantity(-1, "g", "kg")).toBeUndefined();
    expect(convertQuantity(Number.POSITIVE_INFINITY, "g", "kg")).toBeUndefined();
  });
});

describe("locale-aware quantity formatting", () => {
  it.each([
    [1.5, "cup", "en", "1 1/2"],
    [0.251, "tsp", "en", "1/4"],
    [1.271, "count", "en", "1.27"],
    [9.94, "g", "en", "9.9"],
    [10.4, "g", "en", "10"],
    [9.96, "mL", "fr", "10"],
    [1.27, "oz", "fr", "1,27"],
  ] as const)("formats %s %s for %s as %s", (value, unit, locale, expected) => {
    expect(formatQuantity(value, unit, locale)).toBe(expected);
  });

  it("returns an empty display for invalid values", () => {
    expect(formatQuantity(Number.NaN, "g", "en")).toBe("");
    expect(formatQuantity(-1, "cup", "fr")).toBe("");
  });
});
