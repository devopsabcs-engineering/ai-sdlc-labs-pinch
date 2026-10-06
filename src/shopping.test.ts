import { describe, expect, it } from "vitest";
import {
  addShoppingIngredients,
  clearCheckedShoppingItems,
  setShoppingItemChecked,
  type ShoppingItem,
} from "./shopping";

function ids(): () => string {
  let value = 0;
  return () => `item-${++value}`;
}

describe("shopping list", () => {
  it("merges equal normalized canonical keys and sums scaled quantities", () => {
    const result = addShoppingIngredients(
      [],
      [
        { text: "1 cup  Flour", baseServings: 2, targetServings: 4 },
        { text: "118.29411825 mL flour", baseServings: 1, targetServings: 1 },
      ],
      ids(),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "Flour",
      unit: "mL",
      quantity: 591.47059125,
      checked: false,
    });
  });

  it("keeps unparsed text as separate checklist items", () => {
    const result = addShoppingIngredients(
      [],
      [
        { text: "salt to taste", baseServings: 4, targetServings: 8 },
        { text: "salt to taste", baseServings: 4, targetServings: 8 },
      ],
      ids(),
    );

    expect(result).toHaveLength(2);
    expect(result.map(({ originalText }) => originalText)).toEqual([
      "salt to taste",
      "salt to taste",
    ]);
  });

  it("checks, unchecks, and clears only checked items", () => {
    const items: ShoppingItem[] = [
      {
        id: "one",
        name: "eggs",
        mergeKey: "eggs|count|count",
        quantity: 2,
        unit: "count",
        checked: false,
      },
      { id: "two", name: "salt", originalText: "salt", checked: false },
    ];
    const checked = setShoppingItemChecked(items, "one", true);

    expect(checked[0]?.checked).toBe(true);
    expect(setShoppingItemChecked(checked, "one", false)[0]?.checked).toBe(
      false,
    );
    expect(clearCheckedShoppingItems(checked)).toEqual([items[1]]);
  });
});
