# Plan — 2026-10-05-pinch

Spec: `./specs/idea.md`
Created: 2026-10-05

Resumability: `state.json` is canonical; this file is a human-readable projection of it.
`[x]` = done, `[ ]` = pending. On resume, skip every `[x]` and continue at the first `[ ]` whose
deps are done. When this file and `state.json` disagree, `state.json` wins.

## Plan

- [x] T-001 Design the Pinch experience
- [x] T-002 Build and verify the Pinch prototype
- [x] T-003 Define the Pinch product and technical specification

## Build backlog

- [x] T-004 Scaffold the portable bilingual app shell
- [x] T-005 Implement quantity scaling and conversion
- [x] T-006 Add local recipe and data management
- [x] T-007 Build the responsive recipe scaler
- [x] T-008 Add the persistent shopping list
- [x] T-009 Add accessible cook mode
- [x] T-010 Complete offline PWA and browser coverage

## Test

- [x] T-011 Validate PRD acceptance criteria
- [x] T-012 Perform critic review
- [x] T-013 Review security privacy and responsible AI (passed with human waiver; production audit has 0 vulnerabilities)

## Deploy

- [x] T-014 Deploy the approved Pinch artifact to GitHub Pages
