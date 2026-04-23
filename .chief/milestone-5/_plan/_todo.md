# Milestone 5 — TODO

Global task numbering continues from milestone 3's task-10 (milestone 4 shipped without task specs).

- [ ] **task-11** — Create `templates/copilot/devcontainer.json`, `templates/copilot-slim/devcontainer.json`, and `templates/copilot-slim/Dockerfile`. Must satisfy `_contract/template-parity.md`: identical fields byte-for-byte except `image` / `features` / Dockerfile-on-disk. No `initializeCommand` or `workspaceFolder` in either template. Dockerfile modeled on `templates/claude-code-slim/Dockerfile` with `@anthropic-ai/claude-code` replaced by `@github/copilot` (keep the single-line `github-cli.list` form; the user's pasted Dockerfile had a line-break bug there).

- [ ] **task-12** — Append two entries to `catalog.json` (alphabetical, after `claude-code-slim`): `copilot` (features-based) and `copilot-slim` (Dockerfile-based). No schema change — reuses the existing v1 `TemplateEntry` shape. URLs point to `raw.githubusercontent.com/thaitype/sandcontainer/main/templates/<id>/devcontainer.json`.

- [ ] **task-13** — Update `README.md`: add two rows to the "Available Templates" table, extend the "Choosing a template" section with a short paragraph on the copilot pair (fast-pull slim vs. features-based full), and explicitly document the `GH_TOKEN=$(gh auth token) scx up copilot` invocation pattern per `_goal/goal.md`'s "Expected Invocation" section.

- [ ] **task-14** — Release prep: bump `package.json` version `0.3.0` → `0.4.0`, add a `[0.4.0] - 2026-04-23` entry to `CHANGELOG.md` under an **Added** subsection ("Add `copilot` and `copilot-slim` templates for GitHub Copilot CLI"). Commit with conventional-commit prefix `feat:` (minor, non-breaking).

## Execution notes

- **Sequencing**: task-11 → task-12 → task-13 → task-14. Strict order: catalog entries (task-12) reference files created in task-11; README copy (task-13) references catalog descriptions from task-12; release entry (task-14) describes the changes from 11–13.
- **Single PR**: land all four tasks in one PR / one merged branch, matching the milestone-4 pattern.
- **Builder scope**: JSON + Dockerfile + Markdown + one version bump. No `src/**` edits.
- **Verification per task**: each task spec includes its own `pnpm lint` / `pnpm test:ci` gate and file-specific checks (jq JSON validity, parity diff).
- **Post-merge (out of builder scope, documented in goal.md)**: GHCR publishes `sandcontainer-copilot-slim:latest`; user flips package visibility to public in the GHCR UI; `pnpm release` tags + publishes `v0.4.0`.
