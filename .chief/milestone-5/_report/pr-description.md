# PR: Add `copilot` and `copilot-slim` templates (Milestone 5)

Targets: `main`
Commits: `473b43f` (impl + planning docs)
Version: `0.4.0` on release (minor, non-breaking; `feat:` marker)

---

## Summary

- Adds a new features-based `copilot` template using `mcr.microsoft.com/devcontainers/javascript-node:22` + `devcontainers/features/copilot-cli` + `features/github-cli`.
- Adds a new Dockerfile-based `copilot-slim` template using `node:22-slim` with hand-installed `gh` CLI and `npm install -g @github/copilot`, published to `ghcr.io/thaitype/sandcontainer-copilot-slim:latest`.
- Catalog lists both templates alphabetically after `claude-code-slim` with neutral descriptions matching the claude-code pair's tone.
- Users pick the tradeoff that fits them (fast pre-built pull vs. familiar standard base).

No CLI source changes. No catalog schema changes. All behavior lives in `templates/**`, `catalog.json`, and docs.

## Non-breaking

Purely additive. Existing `claude-code` / `claude-code-slim` users are unaffected. `scx init copilot` and `scx init copilot-slim` become newly available once this lands.

## What changed

**Templates**
- `templates/copilot/devcontainer.json` — new, features-based, no Dockerfile.
- `templates/copilot-slim/devcontainer.json` — new, points at `ghcr.io/thaitype/sandcontainer-copilot-slim:latest`.
- `templates/copilot-slim/Dockerfile` — new, byte-for-byte mirror of `templates/claude-code-slim/Dockerfile` with `@anthropic-ai/claude-code` replaced by `@github/copilot`.

**Catalog**
- `catalog.json` — two new entries appended alphabetically (`copilot`, `copilot-slim`). No schema change.

**Docs**
- `README.md` — two new rows in the "Available Templates" table; new paragraph in "Choosing a template" covering the copilot pair; a `GH_TOKEN=$(gh auth token) scx up copilot` invocation callout.
- `CHANGELOG.md` — `[0.4.0]` entry listing both new templates and the `GH_TOKEN` usage note.

**Release**
- `package.json` — version bumped `0.3.0` → `0.4.0`.

**Planning artifacts (non-shipping, under `.chief/milestone-5/`)**
- `_goal/goal.md` — scope, non-goals, parity table, expected-invocation section.
- `_contract/template-parity.md` — enforcement contract for copilot/copilot-slim.
- `_plan/_todo.md` — four tasks (11–14).
- `_report/deferred-host-env-injection.md` — rationale for NOT building auto-injection of `GH_TOKEN` in this milestone (see below).
- `_report/rfc-0001-sandboxed-credential-storage.md` — separate RFC draft, referenced from the deferral report.

## Parity contract

`.chief/milestone-5/_contract/template-parity.md` locks what must stay identical between the two copilot templates. Only three things may differ: `image`, presence of the `features` block, and presence of `Dockerfile` on disk. Everything else (`name`, `remoteUser`, `containerEnv`, `mounts`) is byte-identical. `initializeCommand` and `workspaceFolder` are absent in both.

Verified on this branch:

```
$ diff templates/copilot/devcontainer.json templates/copilot-slim/devcontainer.json
3,7c3
<   "image": "mcr.microsoft.com/devcontainers/javascript-node:22",
<   "features": {
<     "ghcr.io/devcontainers/features/copilot-cli:1": {},
<     "ghcr.io/devcontainers/features/github-cli:1": {}
<   },
---
>   "image": "ghcr.io/thaitype/sandcontainer-copilot-slim:latest",
```

Only the two permitted in-file differences show (the third — Dockerfile presence — is a filesystem-level difference not visible in this diff).

## Expected invocation (documented, not auto-magic)

Copilot CLI authenticates via `$GH_TOKEN`. The templates use the standard devcontainer substitution `"GH_TOKEN": "${localEnv:GH_TOKEN}"`, which requires `$GH_TOKEN` in the host shell. The expected user pattern:

```bash
GH_TOKEN=$(gh auth token) scx up copilot
GH_TOKEN=$(gh auth token) scx exec copilot copilot
GH_TOKEN=$(gh auth token) scx rebuild copilot
```

Same for `copilot-slim`. Documented in README and captured in the goal's "Expected Invocation" section.

### Why not auto-inject inside `scx`?

A catalog-level `secrets: [{ name, from }]` field + CLI-side injection was considered during planning. Rejected because it creates a parallel declarative-data path alongside RFC 0001's proposed `files: [...]` manifest and pushes template-specific auth semantics into the CLI — exactly the creep RFC 0001 explicitly rejects (its Option D). Full rationale in `_report/deferred-host-env-injection.md`. When RFC 0001's `scripts/` convention lands, copilot templates can adopt a host-side helper via that mechanism; no dead catalog field to reconcile.

## Non-goals (deliberately out of scope)

- No CLI source code changes. `src/**` stays content-agnostic.
- No catalog schema changes. Existing v1 `TemplateEntry` shape is reused as-is.
- No auto-injection of `GH_TOKEN` or any other host credential.
- No `scripts/` directory inside the copilot templates (RFC 0001 territory).
- No changes to `.github/workflows/publish-templates.yml`. The existing matrix discovery filters on `Dockerfile` presence, so it auto-picks `copilot-slim` and auto-skips the features-based `copilot`.
- No dogfood for copilot. The repo continues to use `.devcontainer/claude-code-slim/` only.
- No migration or deprecation path for claude-code templates — they're unaffected.
- No image signing / SBOM / provenance.
- No changes to `.chief/_rules/_contract/filesystem.md`.

## Test plan

- [x] `templates/copilot/` contains only `devcontainer.json`; `templates/copilot-slim/` contains both `Dockerfile` and `devcontainer.json`.
- [x] `diff templates/copilot/devcontainer.json templates/copilot-slim/devcontainer.json` shows only `image` + `features` differ (and enclosing JSON braces).
- [x] `jq . catalog.json` parses; 4 entries; `ids` sorted alphabetically (`claude-code, claude-code-slim, copilot, copilot-slim`); copilot `url` fields point to `templates/<id>/devcontainer.json` on `main`.
- [x] Name/remoteUser/containerEnv/mounts parity programmatically verified across both copilot templates (all four fields byte-identical).
- [x] `pnpm install` → `pnpm lint` passes (tsc + eslint + prettier).
- [x] `pnpm test:ci` passes — 47 tests across 8 files, all green.
- [x] `pnpm build` produces ESM (12.21 KB), CJS (13.54 KB), DTS without errors.
- [ ] On merge: `publish-templates.yml` runs the matrix including `copilot-slim` (alongside `claude-code-slim`), builds `linux/amd64,linux/arm64`, and pushes `ghcr.io/thaitype/sandcontainer-copilot-slim:latest`.
- [ ] Post-merge smoke test: `scx init copilot` writes the features-based config; `scx init copilot-slim` writes the image-based config; `scx list` shows 4 entries total.
- [ ] Manual: `GH_TOKEN=$(gh auth token) scx up copilot` builds locally via features (slower first build); inside the container, `copilot` and `gh` are on PATH.
- [ ] Manual: `GH_TOKEN=$(gh auth token) scx up copilot-slim` pulls the new GHCR image and starts quickly; inside the container, `copilot` and `gh` are on PATH.

## Post-merge manual steps

1. **First-time only:** after `publish-templates.yml` completes its first publish of `sandcontainer-copilot-slim`, open the package in the GitHub UI and flip visibility to **public** (same one-time step done for `sandcontainer-claude-code-slim` in Milestone 4).
2. Cut the `0.4.0` release via release-it. The `feat:` conventional-commit marker will drive the minor bump automatically.
3. No image deletion needed — this milestone is additive; no old tags are being retired.
