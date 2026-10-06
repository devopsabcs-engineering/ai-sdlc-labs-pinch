# Pinch v1 PRD

## Product outcome

Pinch helps English- and French-speaking home cooks enter a recipe once, scale it, convert compatible
units, shop for it, and follow it hands-free. It is an installable, offline static app with no
accounts, analytics, server, or runtime network dependency.

## Scope and requirements

### R1. Recipe entry and library

Users can create, edit, delete, and reopen recipes containing a title, base servings, ingredient
lines, and ordered steps. Three bilingual sample recipes are available initially.

**Acceptance criteria**

1. A valid recipe persists across reloads; editing or deleting it updates local storage.
2. Ingredient lines that cannot be parsed remain visible and retain their original text.
3. The initial library contains three recipes with English and French titles, ingredients, and steps.

### R2. Quantity scaling and unit conversion

Users can change servings and toggle metric or imperial display without changing the stored recipe.

**Acceptance criteria**

1. Integers, decimals, fractions, and mixed numbers scale by `target servings / base servings`.
2. Compatible mass and volume units use the documented conversion table; unknown or
   dimension-incompatible units remain as written.
3. Count, cup, and spoon values use friendly fractions where practical; gram and millilitre values
   use the documented rounding rules.

### R3. Responsive recipe experience

The production UI follows the approved Measured enamel design and supports phones through wide
desktops, light and dark themes, keyboard use, and reduced motion.

**Acceptance criteria**

1. The app reflows without two-dimensional page scrolling from 360 px through desktop widths and at
   200% zoom.
2. All controls are keyboard operable, expose visible focus, and meet WCAG 2.1 AA contrast.
3. Theme and recipe state survive navigation and reloads; reduced-motion preferences remove
   non-essential animation.

### R4. Shopping list

Users can add scaled ingredients from one or more recipes to a persistent checklist.

**Acceptance criteria**

1. Items with the same normalized ingredient name and canonical unit merge by summing quantities.
2. Checking, unchecking, and clearing checked items preserves all unchecked items.
3. Unknown or unparsed ingredient lines are retained as separate text items rather than fabricated
   quantities.

### R5. Cook mode

Users can read one large step at a time and move through steps by visible controls, keyboard, and
optional swipe.

**Acceptance criteria**

1. Previous, next/finish, Left/Right, Escape, and swipe alternatives preserve step and recipe state.
2. Cook mode requests Screen Wake Lock when supported and displays a non-blocking fallback when not.
3. Focus is contained while cook mode is open and returns to its launch control when closed.

### R6. Complete English and French experience

Users can switch the entire interface and sample content between English and French.

**Acceptance criteria**

1. Switching language updates visible text, accessible names, sample content, document `lang`, and
   locale-aware numbers without losing task state.
2. The selected locale persists across reloads.
3. The `i18n-parity` gate fails when English and French catalog key sets differ.

### R7. Local data control and offline use

All data stays on the device, and the app remains usable after installation without a network.

**Acceptance criteria**

1. Recipes, preferences, and shopping data use versioned local storage; no runtime third-party
   request is made.
2. Export produces versioned JSON; import validates before atomically replacing data; clear-all
   requires confirmation.
3. The manifest and service worker install under `/ai-sdlc-labs-pinch/`, and a previously loaded app
   completes core flows offline.

### R8. Portable, verifiable delivery

The static Vite and TypeScript application is reproducible on Linux and Windows.

**Acceptance criteria**

1. Build, ESLint, Prettier, Vitest, and catalog parity checks pass with no high/critical audit issue.
2. Playwright tests use bundled Chromium and cover scaling, conversion, shopping, cook mode,
   language switching, and offline startup.
3. Scripts and tests derive paths with platform APIs or URLs and contain no hard-coded Windows
   paths.

## Non-goals

Accounts, cloud sync, URL import, nutrition data, photos, ingredient-density conversion, and any
backend are excluded from v1. Deployment and human sign-off are outside this Plan phase.

## Success

The release is successful when a user can complete the scale-to-shop-to-cook journey in either
language, offline, with stored data remaining local, and all required quality gates passing.
