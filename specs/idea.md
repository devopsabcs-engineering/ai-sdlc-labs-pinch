# Pinch - product brief

## Idea

Pinch is a friendly recipe scaler for the kitchen. Paste or type a recipe once, pick how many people you are cooking for,
and every quantity rescales instantly. Switch between metric and imperial with one tap. A cook mode keeps the screen
awake and shows one step at a time in large type, and a shopping list gathers what you need to buy. It speaks English and
French, works offline, collects no data and needs no account.

## Why it has broad appeal

- Everyone cooks, and almost everyone has had to halve or double a recipe or convert cups to grams.
- Bilingual by design: useful at home and in any English or French kitchen, including shared households.
- Calm, fast and private: no ads, no sign-up, no tracking.

## Users and jobs to be done

- **Home cook**: scale a recipe to the number of guests and read the amounts in my own units.
- **Cook with floury hands**: follow the recipe one large step at a time without touching the phone to unlock it.
- **Shopper**: turn the ingredients of one or more recipes into a single checklist.
- **Francophone or anglophone user**: use the whole app, and read recipes, in my language.

## Scope (v1)

1. Recipe entry: a title, a base number of servings and ingredient lines such as `250 g flour` or `1 1/2 cup milk`,
   plus numbered steps. Parse quantity (integers, decimals, fractions and mixed numbers), unit and name; keep unparsed
   lines as plain text.
2. Servings scaler: change servings and all parsed quantities rescale, shown as friendly fractions where natural
   (for example 1/2, 1 1/4) and rounded sensibly for grams and millilitres.
3. Unit toggle between metric and imperial for mass and volume, using documented conversion factors. Unknown units
   are left unchanged.
4. Cook mode: full-screen, one step at a time, large type, previous and next by button, keyboard and swipe, with the
   Screen Wake Lock API where supported and a graceful message where not.
5. Shopping list: add the scaled ingredients of the current recipe, merge identical items and units, tick items off,
   clear checked, and keep the list across sessions.
6. A small library of recipes saved on the device, with three bilingual sample recipes to start from.
7. Full English and French UI with a language switcher, the language remembered, `lang` set on the document, and
   locale-aware number formatting (decimal comma in French). No untranslated key may ship: a script must fail the build
   when the two catalogs differ.
8. Installable PWA that works fully offline. All data stays in localStorage on the device. Export and import as JSON,
   and a clear-all-data button.
9. Responsive from 360 px phones to wide desktops; WCAG 2.1 AA contrast; full keyboard operation;
    `prefers-reduced-motion` respected.

Out of scope for v1: accounts, sync across devices, importing from URLs, nutrition data, photos, and any server.

## Non-functional requirements

- Static site only. Stack: Vite and TypeScript with no UI framework, CSS variables for theming, a light and a dark theme.
- Unit tests with Vitest (quantity parsing, fraction formatting, scaling, unit conversion, list merging,
  import/export, catalog parity). End-to-end tests with Playwright (scale, convert, cook mode, shopping list, language switch).
  ESLint and Prettier. `npm audit` clean for high and critical.
- Every script and test must run on Linux and Windows: no hard-coded OS paths. Use Playwright's Chromium, not an installed browser.
- Lighthouse-style smoke: installable manifest, service worker, performance 0.9 or better on a throttled run.
- Secrets: none. No third-party network calls at runtime.

## Delivery

- Production target: GitHub Pages for this repository through a GitHub Actions workflow
  (`https://devopsabcs-engineering.github.io/ai-sdlc-labs-pinch/`), with the Vite `base` set to `/ai-sdlc-labs-pinch/`.
- Gates: `design-review`, `prototype-review`, `spec-review`, build, lint, unit, acceptance (e2e), an i18n parity gate,
  critic review, security (secrets, SAST, dependency audit, privacy check), then the human sign-off, then `pre-deploy`,
  `smoke`, `rollback-ready`.
- The release workflow must be manually dispatched and require a `governance_approved` input, as in the plugin's sample.

## Run rules for the agents

- This run is a teaching artifact for eight bilingual labs. Work in small bounded steps. At the end of each lab's step,
  commit with a Conventional Commit message and stop; the operator tags `lab-NN-end`.
- Work on a git branch named `feature/pinch`. Never push and never deploy before the human sign-off is recorded.
- Pause at the sign-off gate and wait. Do not populate approvers yourself.
- Keep scope small. Prefer the simplest implementation that satisfies the acceptance criteria, and keep the number of
  files and agent invocations low, because learners will reproduce this and pay per run.
- If a plugin component does not naturally apply (for example a backend developer agent for a backend-less app), record a
  justified skip in `decisions.md`.
