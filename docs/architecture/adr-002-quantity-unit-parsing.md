# ADR-002: Parse a conservative quantity prefix into canonical units

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Ingredient input is human-authored and may begin with integers, dot/comma decimals, fractions, or
mixed numbers. Scaling and conversion must be predictable without inventing meaning for ambiguous
text or converting mass to volume without ingredient density.

## Decision

Parse only a recognized quantity prefix, optional known unit alias, and remaining ingredient name.
Normalize Unicode fraction characters before parsing and accept `2`, `1.5`, `1,5`, `1/2`, and
`1 1/2`. Reject zero denominators, negative values, and malformed numeric prefixes. Preserve every
original localized line alongside the parsed form; failure produces an unparsed ingredient, not an
exception or guessed value.

Normalize known aliases into canonical dimensions:

- mass: gram as the base (`1 kg = 1000 g`, `1 oz = 28.349523125 g`,
  `1 lb = 453.59237 g`);
- volume: millilitre as the base (`1 L = 1000 mL`, `1 tsp = 4.92892159375 mL`,
  `1 tbsp = 14.78676478125 mL`, `1 fl oz = 29.5735295625 mL`,
  `1 US cup = 236.5882365 mL`);
- count: unitless values, not convertible to mass or volume.

Store canonical numeric values and always scale from them. Convert only within the same dimension.
Format count/cup/spoon values as an eighth when the nearest eighth is within `0.02`; otherwise show
a locale-formatted value with at most two decimals. Display grams and millilitres as whole values at
10 or above and one decimal below 10. Preserve unknown units and unparsed lines exactly as written.
Never infer ingredient density.

## Consequences

- Repeated serving and unit toggles do not accumulate display-rounding error.
- English and French decimal input is accepted while storage remains locale-neutral.
- Ambiguous prose remains visible and safe instead of being silently misconverted.
- US customary volume is the documented imperial convention; other cup definitions are out of
  scope for v1.
