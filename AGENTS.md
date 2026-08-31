# Project working agreement

- The user authorizes committing, pushing, and deploying each completed project change. Do not stop at local edits or ask for this authorization again unless the user requests local-only work.
- Run the relevant checks and a production build before publishing code changes.
- Commit only files belonging to the requested change; preserve unrelated local work and never commit secrets.
- Push to the repository and deploy using the existing hosting workflow. The current website uses `.github/workflows/deploy-pages.yml`, triggered by pushes to `main`.
- Verify deployment success before reporting that the live site is updated. If access or deployment fails, explain the blocker and distinguish local, pushed, and deployed status.
- Do not force-push or overwrite unrelated remote changes to publish a fix.
