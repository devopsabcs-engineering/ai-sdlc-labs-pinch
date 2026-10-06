import {
  parseIngredientLine,
  scaleQuantity,
  type CanonicalUnit,
  type Dimension,
} from "./quantity";

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  mergeKey?: string;
  quantity?: number;
  unit?: CanonicalUnit;
  originalText?: string;
}

export interface ShoppingIngredient {
  text: string;
  baseServings: number;
  targetServings: number;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

export function createMergeKey(
  name: string,
  dimension: Dimension,
  unit: CanonicalUnit,
): string {
  return `${normalizeName(name)}|${dimension}|${unit}`;
}

export function addShoppingIngredients(
  current: readonly ShoppingItem[],
  ingredients: readonly ShoppingIngredient[],
  createId: () => string,
): ShoppingItem[] {
  const next = current.map((item) => ({ ...item }));

  for (const ingredient of ingredients) {
    const parsed = parseIngredientLine(ingredient.text).parsed;
    const quantity = parsed
      ? scaleQuantity(
          parsed.quantity,
          ingredient.baseServings,
          ingredient.targetServings,
        )
      : undefined;

    if (!parsed || quantity === undefined) {
      next.push({
        id: createId(),
        name: ingredient.text,
        originalText: ingredient.text,
        checked: false,
      });
      continue;
    }

    const mergeKey = createMergeKey(parsed.name, parsed.dimension, parsed.unit);
    const existing = next.find((item) => item.mergeKey === mergeKey);
    if (existing && existing.quantity !== undefined) {
      existing.quantity += quantity;
      continue;
    }

    next.push({
      id: createId(),
      mergeKey,
      name: parsed.name,
      quantity,
      unit: parsed.unit,
      checked: false,
    });
  }

  return next;
}

export function setShoppingItemChecked(
  items: readonly ShoppingItem[],
  id: string,
  checked: boolean,
): ShoppingItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, checked } : { ...item },
  );
}

export function clearCheckedShoppingItems(
  items: readonly ShoppingItem[],
): ShoppingItem[] {
  return items.filter((item) => !item.checked).map((item) => ({ ...item }));
}
