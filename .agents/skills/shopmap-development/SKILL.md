---
name: shopmap-development
description: Develop, debug, review, or document the SuperNav supermarket-navigation repository while preserving its product truth, state architecture, RTL UI conventions, and deployment workflow. Use for changes inside this ShopMap project; do not use for unrelated repositories or the separate untracked mobile prototype.
---

# ShopMap development

Use the repository documentation as routed context instead of rediscovering or duplicating project rules.

## Route the task

- For features, UX copy, navigation behavior, AI claims, real-versus-demo decisions, or scope questions, read [`docs/PRODUCT.md`](../../../docs/PRODUCT.md).
- For component placement, state, storage, API, server, PWA, or data-flow work, read [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md).
- For setup, validation, secrets, Git, publishing, or deployment, read [`docs/DEVELOPMENT.md`](../../../docs/DEVELOPMENT.md).
- Read only the references relevant to the task. When code and documentation disagree, inspect the running code as the source of current behavior and update the affected documentation with the change.

## Preserve project invariants

- Keep the Hebrew-first RTL, mobile-first experience.
- Reuse `Icon`, shared components, and `.modal-backdrop` / `.modal`; dialogs open centered.
- Distinguish real data, computed estimates, and demonstrations in UI and documentation. Never fill missing price, location, or recognition data with an unlabeled invention.
- Preserve user data stored in localStorage. Schema or storage-key changes require backward-compatible reading or an explicit migration.
- Keep service-role credentials and external API keys on the server.
- Treat `mobile/` and the other untracked workspace directories as separate local work unless the user explicitly puts them in scope.

## Finish changes

Validate in proportion to the change. For code intended for publication, run lint, relevant tests, and the production build. Follow the repository `AGENTS.md` agreement for committing, pushing, deploying, and verifying the live result.
