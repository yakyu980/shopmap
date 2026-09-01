# Project working agreement

## Start here

- Use `README.md` as the entry point.
- Read `docs/PRODUCT.md` for product scope, user flows, and real-versus-demo claims.
- Read `docs/ARCHITECTURE.md` for component, state, API, storage, and PWA decisions.
- Read `docs/DEVELOPMENT.md` for local setup, validation, secrets, and publishing.
- For work in this repository, use the project skill at `.agents/skills/shopmap-development/SKILL.md` when it is available.
- Treat untracked workspace directories, including `mobile/`, `certs/`, `.codex-compare-tabs/`, `.codex-publish-site/`, and `.claude/`, as out of scope unless the user explicitly includes them.

## Delivery

- The user authorizes committing, pushing, and deploying each completed project change. Do not stop at local edits or ask for this authorization again unless the user requests local-only work.
- Run the relevant checks and a production build before publishing code changes.
- Commit only files belonging to the requested change; preserve unrelated local work and never commit secrets.
- Push to the repository and deploy using the existing hosting workflow. The current website uses `.github/workflows/deploy-pages.yml`, triggered by pushes to `main`.
- Verify deployment success before reporting that the live site is updated. If access or deployment fails, explain the blocker and distinguish local, pushed, and deployed status.
- Do not force-push or overwrite unrelated remote changes to publish a fix.
