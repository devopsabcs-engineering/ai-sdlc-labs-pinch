# Pinch prototype experience

Design direction for T-001. This is intentionally narrower than the v1 brief: the prototype should
validate one sample recipe and the five connected interactions below, not recipe editing, a library,
import/export, persistence guarantees, installation, or production conversion accuracy.

## Experience target

**People:** an English- or French-speaking home cook who may be planning at a table, shopping on a
phone, or cooking with messy hands.

**Job:** adapt one recipe to the table, carry its ingredients to the shop, then follow it without
losing their place.

**Success signals for prototype testing**

- A first-time user can change `4 servings` to `6` and recognize that every parsed amount changed.
- They can add those scaled ingredients to a checklist and tick one item.
- They can enter cook mode, advance a step, and leave without losing the current step or servings.
- They can switch EN/FR and light/dark at any point; labels, recipe content, number formatting, and
  document language update without disrupting the task.

Use one bilingual sample, **Crêpes / Crepes**, with four ingredients and three steps. This makes all
five interactions testable without implying that the prototype is the full recipe library.

## Focused journeys

### 1. Scale and prepare / Ajuster et préparer

| Moment   | English journey                              | Parcours français                                | Design response                                                                      |
| -------- | -------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Orient   | “I need crepes for six.”                     | « Je veux faire des crêpes pour six. »           | Open directly on the sample recipe; show its base and current servings together.     |
| Adjust   | Select `+` twice from 4 to 6.                | Appuyer deux fois sur `+`, de 4 à 6.             | Quantities update in place; a short status confirms “Scaled for 6 / Ajustée pour 6”. |
| Check    | Scan the changed ingredient amounts.         | Vérifier les nouvelles quantités.                | Align quantities in a narrow data column; briefly highlight only changed numbers.    |
| Continue | Add the scaled ingredients or start cooking. | Ajouter les ingrédients ou commencer à cuisiner. | Two explicit actions follow the ingredient list; neither is hidden in a menu.        |

### 2. Shop / Faire les courses

| Moment  | English journey                        | Parcours français                       | Design response                                                                           |
| ------- | -------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Add     | Choose “Add 4 ingredients”.            | Choisir « Ajouter 4 ingrédients ».      | Open the list panel/view and confirm the scaled serving context.                          |
| Shop    | Tick an item when it is in the basket. | Cocher un article placé dans le panier. | Keep checked items visible at the end, struck through but still readable.                 |
| Recover | Untick an item checked by mistake.     | Décocher un article coché par erreur.   | Checkbox remains operable; no destructive undo pattern is needed.                         |
| Finish  | Clear only checked items.              | Effacer uniquement les articles cochés. | Disabled until at least one item is checked; confirm the resulting count via status text. |

### 3. Cook hands-busy / Cuisiner les mains occupées

| Moment   | English journey                                             | Parcours français                                                                | Design response                                                                         |
| -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Enter    | Choose “Start cooking”.                                     | Choisir « Commencer à cuisiner ».                                                | Full-viewport cook mode begins at step 1 and requests wake lock if available.           |
| Progress | Read large text, then use Next, Right Arrow, or swipe left. | Lire le texte agrandi, puis utiliser Suivant, Flèche droite ou balayer à gauche. | Show one step only, plus `1 of 3 / 1 sur 3`; buttons remain the primary visible method. |
| Boundary | Reach the first or final step.                              | Atteindre la première ou la dernière étape.                                      | Previous is disabled at step 1; final action says “Finish / Terminer”, not “Next”.      |
| Exit     | Leave and return to the recipe.                             | Quitter et revenir à la recette.                                                 | Preserve serving count and last step; restore focus to “Start cooking”.                 |

Language and theme changes are cross-journey preferences, not separate destinations. Their controls
remain in the header and in cook mode. Switching language uses the equivalent label (`FR` or `EN`);
switching theme uses an icon **and** `Dark theme / Thème sombre` or `Light theme / Thème clair`.

## Critical flow and state model

```text
[Recipe · 4 servings]
    ├─ minus / plus ─> [Recipe · N servings + updated quantities + polite status]
    ├─ unit toggle ──> [Metric or imperial display; unknown units unchanged]
    ├─ add ingredients
    │      └─────────> [Shopping list · 4 unchecked]
    │                       ├─ check/uncheck ─> [mixed checked state]
    │                       └─ clear checked ─> [remaining or empty list]
    └─ start cooking ─> [Cook step 1/3]
                              ├─ next/right/swipe left ─> [step 2/3 … 3/3]
                              ├─ previous/left/swipe right ─> [prior step]
                              └─ close/finish/Escape ─> [Recipe · state preserved]

At every state: [language switch] translates UI + sample and formats numbers;
                [theme switch] swaps token values, never meaning or hierarchy.
```

### Prototype states and UX copy

| State                 | Required behavior                                                                 | English                                      | Français                                                 |
| --------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Default recipe        | 4 servings, metric selected, list empty                                           | `Crepes` · `Makes 4 servings`                | `Crêpes` · `Donne 4 portions`                            |
| Scale minimum         | Do not allow 0; disable minus at 1                                                | `Minimum 1 serving`                          | `Minimum : 1 portion`                                    |
| Scaled                | Update all four amounts as one transaction                                        | `Scaled for 6 servings`                      | `Ajustée pour 6 portions`                                |
| Unparsed/unknown      | Keep original line and mark it quietly; never fabricate a conversion              | `As written`                                 | `Tel qu’écrit`                                           |
| Added                 | Re-adding the same sample replaces/merges like items rather than duplicating rows | `4 ingredients added for 6 servings`         | `4 ingrédients ajoutés pour 6 portions`                  |
| List empty            | Explain the next action and link back to recipe                                   | `Add ingredients from the recipe.`           | `Ajoutez les ingrédients de la recette.`                 |
| List checked          | Checked rows move after unchecked rows without stealing focus                     | `1 of 4 collected`                           | `1 article sur 4 ramassé`                                |
| Clear checked         | Remove checked only; announce count                                               | `1 checked item cleared`                     | `1 article coché effacé`                                 |
| Cook wake lock on     | Persistent, non-alarming status                                                   | `Screen stays awake`                         | `L’écran reste allumé`                                   |
| Wake lock unavailable | Cooking remains fully usable                                                      | `Keep your screen awake in device settings.` | `Gardez l’écran allumé dans les réglages de l’appareil.` |
| Cook final            | Replace Next with Finish; Preserve previous                                       | `Finish`                                     | `Terminer`                                               |

There is no loading state: prototype data is embedded and all actions are local. Unexpected parse,
storage, network, or install errors are outside this spike. If a control cannot act, disable it and
retain an adjacent explanation rather than displaying a toast.

## Responsive wireframes

### Phone, 360–767 px

```text
┌──────────────────────────────────┐
│ PINCH             [FR] [◐ Dark]  │  sticky compact header
├──────────────────────────────────┤
│ Crêpes                           │
│ A thin measuring-rule underline │  signature element
│                                  │
│ Servings                         │
│ [ − ]       4       [ + ]        │  44 px controls; value is live
│ [ Metric ] [ Imperial ]          │
│                                  │
│ INGREDIENTS                      │
│ 250 g     flour                  │
│ 500 ml    milk                   │
│ 2         eggs                   │
│ 1 pinch   salt                   │
│                                  │
│ [ Add 4 ingredients ]            │
│ [ Start cooking            → ]   │
├──────────────────────────────────┤
│ Recipe        Shopping list (0)  │  2-item bottom navigation
└──────────────────────────────────┘
```

Only one primary view is shown at a time. The header and bottom navigation stay available; content
has bottom padding so it never sits behind navigation.

### Wide, 768 px and above

```text
┌────────────────────────────────────────────────────────────────────┐
│ PINCH                                      [EN|FR] [◐ Light|Dark]  │
├─────────────────────────────────────────────┬──────────────────────┤
│ RECIPE                                      │ SHOPPING LIST (0)    │
│ Crêpes ──── measured-rule ──────────────    │                      │
│                                             │ Add ingredients from │
│ Servings  [ − ]  4  [ + ]  [Metric|Imp.]   │ the recipe.          │
│                                             │                      │
│ 250 g    flour                              │ (populates in place; │
│ 500 ml   milk                               │ this is not a modal) │
│ 2        eggs                               │                      │
│ 1 pinch  salt                               │                      │
│                                             │                      │
│ [ Add 4 ingredients ] [ Start cooking → ]   │ [Clear checked]      │
└─────────────────────────────────────────────┴──────────────────────┘
```

Main column is fluid (`minmax(0, 1fr)`); list rail is `clamp(18rem, 30vw, 24rem)`. Maximum canvas is
72rem. At 768 px, maintain a usable 55/45 split; below it, switch to the phone navigation rather
than squeezing both columns.

### Cook mode, all widths

```text
┌──────────────────────────────────┐
│ [× Close]    1 of 3    [FR] [◐] │
│                                  │
│       Whisk the flour and        │
│       eggs until smooth.         │  28–48 px fluid step text
│                                  │
│   Screen stays awake             │
│                                  │
│ [← Previous]       [Next →]      │  bottom anchored, never gesture-only
└──────────────────────────────────┘
```

At 320–479 px, actions may stack but keep Previous before Next in focus and reading order.
Landscape uses the same structure with a shorter vertical gap; text must not be clipped at 200%
zoom.

## Visual direction: **Measured enamel**

Pinch should feel like a durable kitchen instrument, not a lifestyle blog or dashboard. The
surfaces borrow from cool white enamelware and deep green bottle glass; coral is reserved for
measured changes and active checks. Squared corners with a restrained 6 px radius, hairline rules,
and tabular quantities make it precise without becoming clinical.

The signature is a **measuring-rule divider** beneath the recipe title: a real 8 px repeating tick
pattern whose highlighted segment grows when servings increase and shrinks when they decrease.
It connects scaling to a familiar kitchen object. It is the one expressive element; do not add
gradients, floating cards, food photography, blobs, or ornamental shadows. Under reduced motion,
the highlighted segment changes instantly.

Use the platform font stack so the offline prototype makes no font request. Headings use sturdy,
slightly condensed system faces where available; body copy stays highly legible; amounts use a
monospace utility stack and tabular numerals.

```css
--font-display: "Arial Narrow", "Roboto Condensed", "Aptos Narrow", sans-serif;
--font-body: "Aptos", "Segoe UI", system-ui, sans-serif;
--font-data: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
```

## Concrete design tokens

The custom theme is purpose-built rather than selecting a preset: the product needs a recognizable
enamel-and-measuring-tool identity and a zero-network system-font constraint. These semantic tokens
are the complete prototype contract.

```css
:root,
[data-theme="light"] {
  color-scheme: light;
  --color-canvas: #f7faf8;
  --color-surface: #ffffff;
  --color-surface-raised: #e8f0ec;
  --color-text: #16211c;
  --color-text-muted: #52645b;
  --color-border: #7a9084;
  --color-action: #165b4a;
  --color-on-action: #ffffff;
  --color-accent: #c34832;
  --color-on-accent: #ffffff;
  --color-focus: #165b4a;
  --color-disabled: #d9e2dd;
  --color-on-disabled: #52645b;
}

[data-theme="dark"] {
  color-scheme: dark;
  --color-canvas: #101714;
  --color-surface: #18231e;
  --color-surface-raised: #223229;
  --color-text: #f3f7f4;
  --color-text-muted: #b6c5bc;
  --color-border: #60786b;
  --color-action: #78d6b0;
  --color-on-action: #0d1b15;
  --color-accent: #ff967d;
  --color-on-accent: #101714;
  --color-focus: #ffd166;
  --color-disabled: #2d3b34;
  --color-on-disabled: #b6c5bc;
}

:root {
  --font-display:
    "Arial Narrow", "Roboto Condensed", "Aptos Narrow", sans-serif;
  --font-body: "Aptos", "Segoe UI", system-ui, sans-serif;
  --font-data: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: clamp(2rem, 7vw, 3.5rem);
  --text-cook: clamp(1.75rem, 6vw, 3rem);
  --line-tight: 1.1;
  --line-body: 1.5;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --radius-control: 0.375rem;
  --border-thin: 1px;
  --control-min: 2.75rem;
  --content-max: 72rem;
  --focus-ring: 3px solid var(--color-focus);
  --duration-fast: 140ms;
}
```

Primary buttons use action/on-action; the coral accent is for the ruler segment and checked state,
not body text. Measured contrast ratios include light text/canvas 15.76:1, muted/canvas 6.00:1,
white/light-action 7.99:1, dark text/canvas 16.82:1, dark muted/surface 9.02:1, and
dark-on-action/dark-action 10.17:1. Essential control boundaries are at least 3:1 against their
adjacent surface in both themes (3.41:1 light; 3.39:1 dark).

## Interaction and accessibility contract

- Use landmarks (`header`, `main`, `nav`, complementary shopping region) and one visible `h1`.
  Cook mode is a labelled `dialog` with focus contained while open.
- Controls have visible text labels. Icon-only Close may include the visible word on phone and an
  accessible name everywhere. Do not use flags for language.
- Focus order follows the wireframe. On cook-mode open, focus its heading; on close, restore focus
  to Start cooking. `Escape` closes. Left/Right changes steps unless focus is in an input.
- Every target is at least 44 × 44 CSS px. Pointer, touch, keyboard, and visible button routes have
  equivalent outcomes. Swipe is enhancement only.
- Use a 3 px focus ring with 2 px offset. Never remove outlines. Selected segmented controls expose
  `aria-pressed`; disabled boundary buttons use native `disabled`.
- Put scale/list confirmations in one persistent `role="status" aria-live="polite"` region. Update
  the text after the visual values update; do not announce every ingredient separately.
- Amount changes use tabular numerals and a color-independent 2 px left marker for 1.5 seconds.
  Fractions render as normal text (`1 1/2`), not tiny typographic fraction glyphs.
- Set `<html lang="en">` or `fr` immediately on switching. Translate all visible/accessibility
  strings and sample content. Format decimals with a point in EN (`1.5`) and comma in FR (`1,5`);
  do not translate unit symbols.
- Theme control has a text label and reflects the current action. Initial theme may honor
  `prefers-color-scheme`; an explicit user choice wins. Both themes preserve the same hierarchy.
- Respect `prefers-reduced-motion: reduce`: remove ruler/quantity transitions and smooth scrolling.
  No essential state is communicated by motion, color, hover, or sound.
- Support reflow at 320 CSS px and 200% zoom without two-dimensional page scrolling. At 400% zoom,
  present the phone layout. Keep cook actions visible without covering step text.
- Wake-lock success/fallback is status text, not an error modal. Re-request only when the document
  becomes visible; cook navigation does not depend on it.

## Prototype acceptance notes

The next task is complete when a reviewer can:

1. Scale the sample from 4 to 6 and see all four values update plus one bilingual status message.
2. Add the current scaled list, check/uncheck one row, and clear checked items.
3. Enter cook mode, navigate all three steps by buttons and keyboard, observe boundary states, and
   exit with recipe state preserved.
4. Switch EN/FR from recipe, list, and cook states with matching labels/content, `lang`, and decimal
   formatting.
5. Switch both themes from recipe and cook states with no unreadable or missing-focus state.
6. Exercise the flow at 360 px and at 1024 px, at 200% zoom, with reduced motion, and by keyboard
   only.

## Assumptions, risks, and open questions

- **Assumption:** a single embedded recipe is enough to validate navigation and state coupling; all
  editing, library, persistence, PWA, and data-management requirements remain for later specs.
- **Assumption:** prototype conversion may use fixed display examples; it must not imply validated
  cooking equivalence between ingredient-specific mass and volume.
- **Risk:** EN and FR strings can differ enough to overflow compact controls. French copy above is
  the sizing baseline; controls must wrap rather than truncate.
- **Risk:** system condensed fonts vary by platform. The layout must remain valid when it falls back
  to sans-serif; the measuring rule, not typography alone, carries the identity.
- **Open for Product Owner:** should adding the same recipe again replace its contribution or add
  another batch? For the spike, merge/replace like items to avoid accidental duplicates.

## Design-review evidence

Reviewed on 2026-10-05 against T-001 and the `design-review` definition:

- **Complete:** focused bilingual journeys cover scaling, shopping, and hands-busy cooking; language
  and theme are cross-flow controls.
- **State-ready:** happy, empty, minimum/boundary, unknown-unit, checked, wake-lock fallback, and
  disabled states have behavior and EN/FR copy.
- **Responsive:** annotated phone, wide, and cook-mode wireframes define breakpoints and reflow.
- **Accessible:** semantics, keyboard/focus, touch size, live announcements, localization, contrast,
  zoom/reflow, reduced motion, and gesture alternatives are explicit.
- **Buildable:** a single sample, bounded interactions, semantic CSS variables, and acceptance steps
  are sufficient for a self-contained vanilla HTML/CSS/JS prototype.
- **Internally consistent:** journeys, flow diagram, wireframes, state table, tokens, and acceptance
  notes use the same sample, labels, and preserved state model.

**Gate verdict: PASS.**
