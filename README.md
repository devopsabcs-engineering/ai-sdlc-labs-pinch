# Pinch

Pinch is a bilingual English/French recipe companion built as the reference application for the
AI-SDLC labs. It scales ingredient quantities, converts supported metric and imperial units,
maintains a local shopping list, and provides an accessible step-by-step cook mode. The
framework-free TypeScript progressive web app stores data locally and continues to work offline.

- **Live app:** https://devopsabcs-engineering.github.io/ai-sdlc-labs-pinch/
- **AI-SDLC labs:** https://devopsabcs-engineering.github.io/ai-sdlc-labs/

## Local development

```shell
npm ci
npm run dev
```

Run `npm test` for unit tests and `npm run test:e2e` for browser acceptance coverage.

## Deployment

Production deploys use the manually governed
[GitHub Pages workflow](.github/workflows/pages.yml). Operational deployment and rollback steps
are documented in [docs/deployment.md](docs/deployment.md).
