# Decisions — 2026-10-05-pinch

Consolidated by the Scribe from `inbox/*.md`. One entry per meaningful decision.

## ADR-001 — Bound the prototype to one connected recipe flow

- Date: 2026-10-05
- Context: The full product brief exceeds the scope of a small Plan-phase prototype.
- Decision: Validate scaling, shopping, cook mode, language, and theme with one embedded bilingual Crêpes/Crepes recipe.
- Alternatives: Prototype the complete recipe library and editing experience; split each capability into disconnected screens.
- Consequences: The prototype tests the primary journey and shared state without implying production completeness.

## ADR-002 — Use the Measured enamel visual direction

- Date: 2026-10-05
- Context: Pinch needs a distinctive, offline-safe identity that remains accessible in light and dark themes.
- Decision: Use enamel-inspired surfaces, bottle-green actions, coral measured-state accents, system fonts, and a serving-linked measuring-rule signature.
- Alternatives: Generic card dashboard; food photography; external web fonts.
- Consequences: The prototype remains self-contained and visually tied to kitchen measurement while limiting decoration.

## ADR-003 — Keep the clickable artifact framework-free

- Date: 2026-10-06
- Context: The prototype must remain a small throwaway spike and the user explicitly excluded web-artifacts-builder.
- Decision: Implement the approved flow as static HTML, CSS, and vanilla JavaScript with one embedded bilingual recipe.
- Alternatives: React artifact; production Vite application; non-interactive mockups.
- Consequences: Stakeholders can open and test the artifact directly, while production concerns remain intentionally deferred.

## ADR-004 — Treat conversions as illustrative in the prototype

- Date: 2026-10-06
- Context: The prototype validates interaction design, not culinary conversion correctness.
- Decision: Use fixed metric/imperial sample values and leave the unknown pinch unit unchanged with an explicit label.
- Alternatives: Build production-grade conversion rules during the design phase.
- Consequences: The UX is testable without prematurely defining production conversion architecture.

## ADR-005 — Use symmetric locale catalogs and Intl

- Date: 2026-10-06
- Context: Pinch must provide complete English and French UI while remaining framework-free and offline.
- Decision: Use local symmetric catalogs, `Intl.NumberFormat`, persisted locale, and a required `i18n-parity` gate.
- Alternatives: Runtime translation service; full i18n framework; duplicated language-specific views.
- Consequences: Catalog drift fails before merge, and all shipped translations remain local.

## ADR-006 — Parse conservative quantity prefixes into canonical units

- Date: 2026-10-06
- Context: Free-form ingredient lines must scale predictably without unsafe culinary guesses.
- Decision: Parse supported numeric prefixes and known same-dimension units, retain original text, calculate from canonical values, and round only for display.
- Alternatives: Parse arbitrary prose; use display values as calculation inputs; infer mass/volume density.
- Consequences: Scaling and toggles are deterministic; ambiguous lines remain visible and unchanged.

## ADR-007 — Keep the production shell framework-free

- Date: 2026-10-06
- Context: The first production slice needs a small, portable bilingual shell with no runtime service dependency.
- Decision: Use Vite with TypeScript and DOM APIs, symmetric local JSON catalogs, versioned local preferences, and URL-based Node script paths.
- Alternatives: Add a UI framework; fetch translations at runtime; use platform-specific shell scripts.
- Consequences: The app and its gates remain lightweight, offline-ready, and cross-platform while retaining type safety.

## ADR-008 — Persist recipe changes before updating memory

- Date: 2026-10-06
- Context: Storage failures must not make the visible in-memory recipe collection diverge from durable local data.
- Decision: Validate complete records and persist a versioned application snapshot before committing CRUD, import, or clear-all changes to memory.
- Alternatives: Mutate memory first and attempt storage afterward; persist recipes as unrelated records.
- Consequences: Failed writes are surfaced without corrupting the last valid application state, and imports remain atomic.

## ADR-009 — Persist recipe view state separately

- Date: 2026-10-06
- Context: Selected recipe, serving count, and measurement system are UI preferences rather than recipe data.
- Decision: Store versioned recipe view state separately from the durable recipe collection while reusing the existing locale and theme preferences.
- Alternatives: Embed transient view state in recipe records; reset the view on every load.
- Consequences: The recipe scaler restores the user's context without coupling presentation state to imported or exported recipe data.

## ADR-010 — Merge shopping quantities only on canonical identity

- Date: 2026-10-06
- Context: Scaled ingredients need predictable merging without losing unparsed recipe text.
- Decision: Store parsed quantities in canonical units and merge only normalized ingredient name, dimension, and canonical-unit keys; retain unparsed lines as separate text items.
- Alternatives: Merge display strings; discard unparsed lines; infer conversions across dimensions.
- Consequences: Compatible quantities sum deterministically while ambiguous ingredients remain intact and independently checkable.

## ADR-011 — Use a native modal dialog for cook mode

- Date: 2026-10-06
- Context: Cook mode needs full-screen, accessible one-step navigation while preserving the underlying recipe state.
- Decision: Use a native dialog with an explicit keyboard focus loop and launch-focus restoration, persist the active step with recipe view state, and treat Screen Wake Lock as progressive enhancement.
- Alternatives: Navigate to a separate page; use a non-modal overlay; require Wake Lock support.
- Consequences: Button, keyboard, and swipe controls share one stateful experience, while unsupported Wake Lock produces localized non-blocking guidance.

## ADR-012 — Use Playwright-managed Chromium for portable browser gates

- Date: 2026-10-06
- Context: Browser acceptance checks must run consistently on Linux and Windows without machine-specific browser paths.
- Decision: Run E2E and Lighthouse-style checks with Playwright-managed Chromium via `chromium.executablePath()`, and execute them in a test-only Ubuntu/Windows Actions matrix.
- Alternatives: Depend on a system Chrome installation; hard-code platform browser paths; test only one operating system.
- Consequences: Scale, unit, shopping, cook, language, offline, manifest, service-worker, and first-party-network checks use the same portable browser source on both supported CI operating systems.

## ADR-013 — Accept the operator Prettier unblock

- Date: 2026-10-06
- Context: T-011 exhausted its retries because the required formatting gate was unavailable.
- Decision: Accept operator commit `ddfd6fe`, which adds Prettier 3.9.9, a canonical lockfile, `format` and `format:check` scripts, `.prettierignore`, `.prettierrc.json`, and workflow formatting checks; reset T-011 to pending with zero retries.
- Alternatives: Keep T-011 blocked; waive the required formatting gate.
- Consequences: QA can rerun the complete acceptance suite without a waiver, and any new failure receives a fresh two-retry budget.

## ADR-014 — Preserve unsupported unit-bearing ingredients

- Date: 2026-10-06
- Context: Treating every unrecognized numeric ingredient as a unitless count changed and merged ambiguous lines such as `2 quarts milk`.
- Decision: Preserve multi-token quantity lines exactly when no supported unit matches, while retaining intentional unitless counts such as `3 eggs`.
- Alternatives: Guess count units; expand the supported conversion table without a product requirement.
- Consequences: Unknown units remain safe and visible, while supported unitless counts still scale.

## ADR-015 — Enforce a reproducible throttled performance score

- Date: 2026-10-06
- Context: The browser-quality script previously accepted any non-negative navigation duration and did not prove the required score.
- Decision: Apply deterministic network and CPU throttling, calculate a Lighthouse-weighted score from FCP, LCP, TBT, and CLS, and fail below 0.900.
- Alternatives: Keep an unthrottled duration smoke check; add a separate external Lighthouse dependency.
- Consequences: `test:lighthouse` now measures and enforces the PRD threshold with the existing browser toolchain.

## ADR-016 — Block sign-off on high and critical dependency findings

- Date: 2026-10-06
- Context: The online dependency audit found one critical and six high vulnerabilities, including direct findings in Vite 7.3.1 and Vitest 4.0.14.
- Decision: Keep T-013 open and upgrade the direct development dependencies and lockfile rather than waive the findings.
- Alternatives: Accept the development-only exposure; record a security waiver.
- Consequences: Security review must be rerun after dependency remediation before the run can reach sign-off.

## ADR-017 — Human waiver for the development-only source-map-js advisory

- Date: 2026-10-06
- Human: Emmanuel Knafo (`emmanuelknafo`)
- Source: VS Code chat
- Verbatim answer: "Waive and continue"
- Context: The remaining `source-map-js <1.2.2` npm audit finding is development-only, no fixed release exists, the application has zero runtime dependencies, and `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities.
- Decision: Accept the development-only advisory and pass T-013 security with a human waiver. The production dependency audit gate is `npm audit --omit=dev --audit-level=high`.
- Re-check trigger: Re-run the full `npm audit` when `source-map-js 1.2.2` ships.
- Consequences: T-013 is done and the run may proceed to human sign-off without treating development tooling as production exposure.

## ADR-018 — Human sign-off for the pinned release artifact

- Date: 2026-10-06
- Human: Emmanuel Knafo (`emmanuelknafo`)
- Source: VS Code chat
- Verbatim approval: "Approve all three roles"
- Roles approved: Product Owner, Security Team, Tech Lead
- Approved artifact: branch `feature/pinch`, commit `5e5633122c50eca34cbf2a6a332a14bfc579187b`, tree `9418e31b7ba315d15592ff1f12096d6f4bb76b31`
- Granted at: 2026-10-06T12:39:09.706Z
- Decision: Approve the pinned artifact for the Deploy phase. Any artifact or gate-result change before deployment invalidates this approval and resets sign-off to pending.

## ADR-019 — Deploy and roll back only through governed GitHub Pages workflows

- Date: 2026-10-06
- Context: The approved tree must be deployed without mutation and remain recoverable without a `gh-pages` branch or manual Pages upload.
- Decision: Merge the approved feature commit with a merge commit, require the merged `main` tree to equal the approved tree, and deploy with `.github/workflows/pages.yml` using `governance_approved=true`.
- Deployment: PR #1 merged as `50d271474a3e070122079f74302046bd0a56ae74`; its tree equals approved tree `9418e31b7ba315d15592ff1f12096d6f4bb76b31`. Workflow run `37465190164` succeeded.
- Smoke evidence: The live URL returned HTTP 200; manifest `start_url` and `scope` resolved to `/ai-sdlc-labs-pinch/`; the service-worker scope matched the live URL; all observed assets used the repository prefix; third-party requests, console errors, and page errors were zero; offline reload succeeded.
- Rollback trigger: Roll back for an availability failure, broken core flow, service-worker/offline regression, unexpected third-party request, or browser console error that cannot be corrected immediately.
- Rollback procedure: Branch from current `main`, restore repository content from pre-release commit `2aa70d7db33767f50322d82495818de9ba83c24a`, commit the restoration, merge it through a reviewed PR, dispatch `.github/workflows/pages.yml` with `governance_approved=true`, and repeat the complete smoke gate.
- Consequences: Production changes and rollbacks retain review history and the same governance, quality, and smoke controls.
