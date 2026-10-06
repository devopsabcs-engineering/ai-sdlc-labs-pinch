# Deployment and rollback

Pinch is deployed to GitHub Pages by `.github/workflows/pages.yml`. The workflow requires the
`governance_approved=true` input, reruns the quality suite, builds with the repository base path,
uploads an immutable Pages artifact, and deploys through `actions/deploy-pages`.

## Deploy

1. Obtain Product Owner, Security Team, and Tech Lead approval for a pinned commit and tree.
2. Merge the approved commit to `main` without squashing.
3. Verify that the merged `main` tree equals the approved tree.
4. Ensure GitHub Pages uses `build_type: workflow`.
5. Dispatch `.github/workflows/pages.yml` from `main` with `governance_approved=true`.
6. Verify HTTP 200, manifest and service-worker scope, repository-prefixed assets, no third-party
   requests, zero browser errors, and offline reload.

## Rollback

Roll back when the site is unavailable, a core flow is broken, offline startup regresses, an
unexpected third-party request appears, or browser errors cannot be corrected immediately.

1. Create a rollback branch from the current `main`.
2. Restore repository content from the last known-good pre-release commit. For the initial Pinch
   release, that commit is `2aa70d7db33767f50322d82495818de9ba83c24a`.
3. Commit the restoration and merge it through a reviewed pull request.
4. Dispatch `.github/workflows/pages.yml` with `governance_approved=true`.
5. Repeat the complete production smoke checks.

Do not deploy or roll back with a `gh-pages` branch or a manual artifact upload.
