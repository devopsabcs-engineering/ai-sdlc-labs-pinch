# T-013 security, privacy, and Responsible-AI evidence

**Security gate: blocked after two remediation attempts.**

| Check | Result |
| --- | --- |
| `npm audit --audit-level=high` | Failed: 5 high and 1 low findings remain in the supported PostCSS/source-map-js dependency chain |
| Secret scan | Passed: 0 matches across 50 tracked text files |
| Lockfile resolved URLs | Passed: 236/236 use HTTPS on `registry.npmjs.org` |
| Lint/SAST baseline | Passed |
| Runtime network/privacy | Passed: Playwright rejects non-local origins; 2/2 tests passed |
| Local data/import/export | Passed; oversized local imports remain a non-blocking availability risk |
| Responsible AI | Not applicable/passed: no model, inference, profiling, recommendations, or generated content |

Vite was upgraded from 7.3.1 to 7.3.6 and Vitest from 4.0.14 to 4.1.11, removing the critical
finding and several high transitive findings. The remaining supported tree uses PostCSS 8.5.28 and
source-map-js 1.2.1. Current npm advisory metadata offers no supported fixed source-map-js release;
the suggested forced fix would downgrade Vite and Vitest below the required minimums.

All non-audit validation passed after the upgrade: format, build, lint, 75 unit tests, i18n parity,
portability, 2 Playwright tests, and the throttled browser-quality score of 0.978 (minimum 0.900).
Sign-off remains pending and deployment is blocked until the high-severity dependency findings can
be resolved or explicitly waived by a human policy decision.
