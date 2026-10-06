# Pinch architecture

## Solution shape

Pinch is a single-page Vite/TypeScript PWA with semantic HTML and CSS variables; it has no UI
framework, backend, telemetry, or runtime third-party calls.

```text
UI views (library, recipe, shopping, cook, settings)
                  |
Application state and use cases
          /                       \
Recipe domain                  i18n/theme
(parse, scale, convert,       (catalogs, Intl,
 format, merge)                preferences)
          \                       /
       versioned storage adapter
        (localStorage + JSON)
                  |
        PWA app-shell cache
```

The prototype is design evidence only. Production code starts under `src/` and reimplements the
approved behavior with typed domain boundaries and tests.

## Components and interfaces

| Component | Responsibility | Contract |
|---|---|---|
| Domain | Parse ingredient lines, scale quantities, convert compatible units, merge list items | Pure functions; no DOM or storage access |
| Application state | Coordinate recipes, servings, preferences, shopping, and cook position | Immutable updates; persist after successful transitions |
| Storage adapter | Load, migrate, validate, export, import, and clear local data | Versioned `AppData`; invalid imports do not mutate current data |
| i18n | Resolve UI keys and format locale-aware numbers | Complete `en`/`fr` catalogs; missing keys fail `i18n-parity` |
| Views | Render semantic responsive screens and accessible interactions | State in, actions out; no parsing or persistence logic |
| PWA | Cache the built app shell and expose install metadata | Repository-relative URLs; offline after first successful load |

There is no HTTP API. Internal use cases are the application boundary:

```ts
scaleRecipe(recipeId, servings, unitSystem)
addRecipeToShoppingList(recipeId, servings, unitSystem)
setLocale("en" | "fr")
enterCookMode(recipeId)
exportData()
importData(candidate)
clearAllData()
```

Failures return typed results for the UI to present; they are not converted into success-shaped
defaults.

## Data model

```text
AppData { version, recipes[], shoppingItems[], preferences }
Recipe { id, title, baseServings, ingredients[], steps[], source }
Ingredient { originalText, parsed? }
ParsedIngredient { quantity, unit, dimension, name, mergeKey }
ShoppingItem { id, mergeKey?, name, quantity?, unit?, originalText?, checked }
Preferences { locale, theme, unitSystem }
```

IDs are locally generated. Stored quantities are locale-neutral numbers in canonical units; locale
and friendly fractions affect display only. Text is a `LocalizedText` value with optional `en` and
`fr` variants plus a required fallback; user-entered content is not automatically translated.
Sample recipes provide both variants and are seeded once before behaving like local recipes.
Storage migrations are explicit by `version`.

## Key flows

1. **Load:** validate stored `AppData`; migrate supported versions; surface corruption and preserve
   an export/clear recovery path.
2. **Scale/convert:** parse once on recipe save, calculate from canonical values, and format only at
   the view boundary so repeated toggles do not accumulate rounding error.
3. **Shopping:** create `mergeKey` from a whitespace/case-normalized ingredient name, dimension, and
   canonical unit; merge only equal keys, then persist the updated list as one transaction.
4. **Import:** parse and validate into a temporary value, then replace stored state only after the
   full payload succeeds.
5. **Offline:** precache hashed build assets and repository-relative navigation fallback; updates
   activate on the next load rather than discarding live state.

## Configuration and portability

- Vite `base` is `/ai-sdlc-labs-pinch/`; manifest and service-worker URLs derive from that base.
- Scripts use Node path/URL APIs and repository-relative paths, never hard-coded drive letters or
  path separators.
- Playwright uses its bundled `chromium` project only; no installed-browser channel is configured.
- `i18n-parity` compares flattened catalog keys. `portable-os` reviews scripts/config for portable
  paths and runs the Playwright Chromium suite in supported CI environments.
- Persistence is localStorage because the v1 data volume is small and synchronous startup keeps the
  architecture simple.

## Verification map

| Concern | Evidence |
|---|---|
| Parsing, fractions, scaling, conversion, merge, import/export | Vitest unit tests |
| Catalog completeness | `i18n-parity` gate |
| Responsive flows, keyboard, locale, cook mode, offline | Playwright bundled Chromium |
| Installability and performance | Manifest/service-worker checks and throttled smoke |
| Privacy and supply chain | Runtime network assertion, secret/SAST scan, `npm audit` |
| Cross-platform scripts | `portable-os` gate; no platform-specific path literals |

## Requirement traceability

| PRD requirements | Build slices |
|---|---|
| R6, R8 | T-004 portable bilingual shell and gates |
| R2 | T-005 parsing, scaling, conversion, and formatting |
| R1, R7 | T-006 recipe library and local data control |
| R2, R3, R6 | T-007 responsive recipe scaler |
| R4 | T-008 persistent shopping list |
| R5 | T-009 accessible cook mode |
| R7, R8 | T-010 offline PWA and bundled-Chromium coverage |

## Risks

- Browser wake-lock and install prompts vary; both remain progressive enhancements.
- localStorage is bounded; v1 excludes photos and warns clearly on quota failure.
- Culinary mass/volume conversion requires ingredient density and is deliberately unsupported.
- Service-worker updates can cache stale shells; cache names are versioned and old caches are
  removed during activation.

The two binding decisions are
[ADR-001: catalog-based i18n](adr-001-i18n.md) and
[ADR-002: deterministic quantity and unit parsing](adr-002-quantity-unit-parsing.md).
