# T-012 critic review evidence

Reviewed the committed `feature/pinch` implementation through `df9664b`, the PRD and quantity
parsing ADR, and `evidence/qa/T-011-qa.md`.

## Findings

| File/line | Severity | Confidence | Finding |
| --- | --- | --- | --- |
| `src/quantity.ts:212-226` | High | High | Unknown units are not preserved as required by R2.2 and ADR-002. Any numeric line whose first token is not one of four hard-coded pinch aliases falls back to `count`; for example, `2 quarts milk` is parsed and scaled instead of remaining exactly as written. This also causes such lines to be merged as fabricated count quantities in the shopping list, contrary to R4.3. Remove the guessed count fallback for unit-bearing unknowns (while retaining intentional unitless counts), and add quantity, display, and shopping regression tests for an unsupported unit. |
| `scripts/check-browser-quality.mjs:6-65` | High | High | The required Lighthouse-style performance check is not implemented. The script applies no throttling, computes only raw navigation duration, and passes for every non-negative value; it never calculates or enforces the product brief's performance score of at least 0.9. The T-011 “test:lighthouse” result therefore does not establish this requirement. Add a reproducible throttled Lighthouse-equivalent measurement with a `>= 0.9` assertion and record the actual result. |

## Gate conclusion

`npm run build`, `npm run lint`, `npm run format:check`, and `npm test` passed (5 files, 73 tests).
The **critic-review gate fails** because the two blocking findings above remain unresolved.
