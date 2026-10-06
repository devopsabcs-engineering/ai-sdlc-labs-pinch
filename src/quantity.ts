export type Locale = "en" | "fr";
export type Dimension = "mass" | "volume" | "count";
export type CanonicalUnit = "g" | "mL" | "count";
export type Unit =
  | CanonicalUnit
  | "kg"
  | "oz"
  | "lb"
  | "L"
  | "tsp"
  | "tbsp"
  | "fl oz"
  | "cup";

export interface ParsedIngredient {
  /** Quantity in the dimension's canonical unit (g, mL, or count). */
  quantity: number;
  unit: CanonicalUnit;
  dimension: Dimension;
  name: string;
  sourceUnit: Unit;
}

export interface Ingredient {
  originalText: string;
  parsed?: ParsedIngredient;
}

interface UnitDefinition {
  unit: Unit;
  dimension: Dimension;
  canonicalUnit: CanonicalUnit;
  canonicalFactor: number;
  aliases: readonly string[];
}

const UNIT_DEFINITIONS: readonly UnitDefinition[] = [
  {
    unit: "kg",
    dimension: "mass",
    canonicalUnit: "g",
    canonicalFactor: 1000,
    aliases: ["kg", "kilogram", "kilograms", "kilogramme", "kilogrammes"],
  },
  {
    unit: "g",
    dimension: "mass",
    canonicalUnit: "g",
    canonicalFactor: 1,
    aliases: ["g", "gram", "grams", "gramme", "grammes"],
  },
  {
    unit: "oz",
    dimension: "mass",
    canonicalUnit: "g",
    canonicalFactor: 28.349523125,
    aliases: ["oz", "ounce", "ounces"],
  },
  {
    unit: "lb",
    dimension: "mass",
    canonicalUnit: "g",
    canonicalFactor: 453.59237,
    aliases: ["lb", "lbs", "pound", "pounds", "livre", "livres"],
  },
  {
    unit: "L",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 1000,
    aliases: ["l", "liter", "liters", "litre", "litres"],
  },
  {
    unit: "mL",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 1,
    aliases: ["ml", "milliliter", "milliliters", "millilitre", "millilitres"],
  },
  {
    unit: "tsp",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 4.92892159375,
    aliases: ["tsp", "teaspoon", "teaspoons", "c. à café", "cuillère à café", "cuillères à café"],
  },
  {
    unit: "tbsp",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 14.78676478125,
    aliases: [
      "tbsp",
      "tablespoon",
      "tablespoons",
      "c. à soupe",
      "cuillère à soupe",
      "cuillères à soupe",
    ],
  },
  {
    unit: "fl oz",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 29.5735295625,
    aliases: ["fl oz", "fluid ounce", "fluid ounces"],
  },
  {
    unit: "cup",
    dimension: "volume",
    canonicalUnit: "mL",
    canonicalFactor: 236.5882365,
    aliases: ["cup", "cups", "us cup", "us cups", "tasse", "tasses"],
  },
  {
    unit: "count",
    dimension: "count",
    canonicalUnit: "count",
    canonicalFactor: 1,
    aliases: [],
  },
];

const FRACTIONS: Readonly<Record<string, string>> = {
  "¼": "1/4",
  "½": "1/2",
  "¾": "3/4",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const aliasEntries = UNIT_DEFINITIONS.flatMap((definition) =>
  definition.aliases.map((alias) => ({ alias, definition })),
).sort((left, right) => right.alias.length - left.alias.length);

// These common recipe units have no safe conversion in the documented table.
const unsupportedUnitAliases = ["pinches", "pinch", "pincées", "pincée"];

function normalizeFractions(value: string): string {
  return value.replace(/(\d)?([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/gu, (_, whole, fraction: string) => {
    const normalized = FRACTIONS[fraction];
    return whole ? `${whole} ${normalized}` : (normalized ?? fraction);
  });
}

function parseQuantityPrefix(line: string): { value: number; rest: string } | undefined {
  const normalized = normalizeFractions(line);
  const match = /^(\d+(?:[.,]\d+)?)(?:\s+(\d+)\/(\d+)|\/(\d+))?(?=\s|$)/u.exec(normalized);
  if (!match) return undefined;

  const whole = Number(match[1]?.replace(",", "."));
  const numerator = Number(match[2] ?? 0);
  const denominator = Number(match[3] ?? match[4] ?? 1);
  let value = whole;

  if (match[4]) {
    value = whole / denominator;
  } else if (match[2]) {
    value += numerator / denominator;
  }

  if (!Number.isFinite(value) || value < 0 || denominator === 0) return undefined;
  return { value, rest: normalized.slice(match[0].length).trimStart() };
}

function matchUnit(value: string): { definition: UnitDefinition; rest: string } | undefined {
  const lowerValue = value.toLocaleLowerCase("en");
  for (const entry of aliasEntries) {
    if (
      lowerValue === entry.alias ||
      (lowerValue.startsWith(entry.alias) && /^\s/u.test(value.slice(entry.alias.length)))
    ) {
      return {
        definition: entry.definition,
        rest: value.slice(entry.alias.length).trimStart(),
      };
    }
  }
  return undefined;
}

export function parseIngredientLine(originalText: string): Ingredient {
  const result: Ingredient = { originalText };
  if (!originalText || originalText !== originalText.trimStart()) return result;

  const quantity = parseQuantityPrefix(originalText);
  if (!quantity || !quantity.rest) return result;

  const firstWord = quantity.rest.split(/\s/u, 1)[0]?.toLocaleLowerCase("en");
  if (firstWord && unsupportedUnitAliases.includes(firstWord)) return result;

  const matchedUnit = matchUnit(quantity.rest);
  const definition = matchedUnit?.definition ?? UNIT_DEFINITIONS.at(-1);
  const name = matchedUnit?.rest ?? quantity.rest;
  if (!definition || !name) return result;

  result.parsed = {
    quantity: quantity.value * definition.canonicalFactor,
    unit: definition.canonicalUnit,
    dimension: definition.dimension,
    name,
    sourceUnit: definition.unit,
  };
  return result;
}

export function scaleQuantity(
  canonicalQuantity: number,
  baseServings: number,
  targetServings: number,
): number | undefined {
  if (
    !Number.isFinite(canonicalQuantity) ||
    canonicalQuantity < 0 ||
    !Number.isFinite(baseServings) ||
    baseServings <= 0 ||
    !Number.isFinite(targetServings) ||
    targetServings < 0
  ) {
    return undefined;
  }
  return canonicalQuantity * (targetServings / baseServings);
}

export function convertQuantity(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit,
): number | undefined {
  if (!Number.isFinite(quantity) || quantity < 0) return undefined;
  const from = UNIT_DEFINITIONS.find(({ unit }) => unit === fromUnit);
  const to = UNIT_DEFINITIONS.find(({ unit }) => unit === toUnit);
  if (!from || !to || from.dimension !== to.dimension) return undefined;
  return (quantity * from.canonicalFactor) / to.canonicalFactor;
}

function formatDecimal(value: number, locale: Locale, maximumFractionDigits: number): string {
  return new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits,
  }).format(value);
}

function formatEighth(value: number): string {
  const eighths = Math.round(value * 8);
  const whole = Math.floor(eighths / 8);
  const remainder = eighths % 8;
  if (remainder === 0) return String(whole);

  const divisor = remainder % 4 === 0 ? 4 : remainder % 2 === 0 ? 2 : 1;
  const fraction = `${remainder / divisor}/${8 / divisor}`;
  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

export function formatQuantity(value: number, unit: Unit, locale: Locale): string {
  if (!Number.isFinite(value) || value < 0) return "";

  if (unit === "count" || unit === "cup" || unit === "tsp" || unit === "tbsp") {
    const nearestEighth = Math.round(value * 8) / 8;
    if (Math.abs(value - nearestEighth) <= 0.02) return formatEighth(nearestEighth);
  }

  if (unit === "g" || unit === "mL") {
    return formatDecimal(value, locale, value >= 10 ? 0 : 1);
  }
  return formatDecimal(value, locale, 2);
}
