# T-012 critic review evidence

## Original review

The original review of committed `feature/pinch` through `df9664b` found two blocking defects:

1. unsupported unit-bearing lines were guessed to be counts, then scaled and merged; and
2. `test:lighthouse` neither applied reproducible throttling nor computed and enforced the required
   performance score.

The original verification passed build, lint, format, and 73 unit tests, but the **critic-review
gate failed** on those findings.

## Remediation verification

Re-reviewed remediation commits `dfdf3a5` and `3693d41` against the product brief and ADR-002.

- `src/quantity.ts` now leaves an unrecognized multi-token unit-bearing line such as
  `2 quarts milk` unparsed. Parser and rendered-display regressions confirm that its exact text is
  retained, and the shopping regression confirms duplicate unsupported lines remain separate
  rather than scaling or merging as counts.
- Intentional unitless counts remain supported: the existing `3 eggs` parser regression still
  produces canonical count quantity `3`, and the unchanged scale/display path scales parsed
  canonical counts. The sample recipe's `2 eggs` line also remains in this supported form.
- `scripts/check-browser-quality.mjs` now fixes network latency and throughput, disables cache,
  applies 4x CPU slowdown, collects FCP/LCP/TBT/CLS, computes a Lighthouse-style weighted score,
  reports the actual metrics, and throws when the score is below `0.900`.
- Review of the remediation diff and regression coverage found no new high-confidence blocking
  defect.

## Actual results

| Verification | Result |
| --- | --- |
| `npm test -- src/quantity.test.ts src/app.test.ts src/shopping.test.ts` | Passed: 3 files, 61 tests |
| `npm run test:lighthouse` | Passed, including production build |
| Throttled score | **1.000** (minimum **0.900**) |
| Throttled metrics | FCP 456 ms; LCP 540 ms; TBT 17 ms; CLS 0.000 |
| `git diff e76c35a..HEAD --check` | Passed |

Only the previously failed critic-review gate and its smallest relevant regression set were rerun.
Unrelated untracked evidence files were left unchanged.

## Final gate conclusion

Both prior blocking findings are resolved. The **T-012 critic-review gate passes** with no remaining
blocking review findings.
