# AGENTS.md

This repository uses the **ai-team-sdlc** GitHub Copilot plugin: an orchestrator plus `ait-`
specialist agents and skills that take an idea from ideation to deploy with quality gates and one
human governance sign-off.

- **Shared contract:** the `ait-conventions` skill is the single source of truth (tracking store,
  task schema, handoff contract, quality gates, resumability, sign-off).
- **Run the lifecycle:** `/product-run` (VS Code) or "Use the ait-sdlc-orchestrate skill" (CLI).
- **Single phase:** the `/product-*` commands, or invoke the matching `ait-*` skill directly.
- **Runtime state:** lives under `.copilot-tracking/<run-id>/` and is git-ignored.

Do not copy the plugin's agents or skills into this repo; update them with `copilot plugin update`.
