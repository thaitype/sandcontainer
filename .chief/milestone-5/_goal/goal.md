# Milestone 5 — Add `copilot` and `copilot-slim` Templates

## Overview

Add two new devcontainer templates for **GitHub Copilot CLI**, mirroring the `claude-code` / `claude-code-slim` split that shipped in milestone 4 (v0.3.0):

- **`copilot`** — features-based, uses `mcr.microsoft.com/devcontainers/javascript-node:22` + the `copilot-cli` and `github-cli` devcontainer-features. Larger first build (~2.3GB); no pre-built image on GHCR.
- **`copilot-slim`** — Dockerfile-based, uses `node:22-slim` with hand-installed `gh` and `npm install -g @github/copilot`. Pre-built to `ghcr.io/thaitype/sandcontainer-copilot-slim:latest` for fast pull (~800MB).

No CLI source changes. Milestone 5 is template files + `catalog.json` + README/CHANGELOG + version bump. Ships as **v0.4.0** (minor — purely additive, non-breaking).

## Scope

- Create `templates/copilot/devcontainer.json` (features-based, no Dockerfile).
- Create `templates/copilot-slim/devcontainer.json` (image-based, pointing at GHCR).
- Create `templates/copilot-slim/Dockerfile` modeled on `templates/claude-code-slim/Dockerfile` (same apt/gh setup, swap `@anthropic-ai/claude-code` → `@github/copilot`).
- Append two entries to `catalog.json` (alphabetical: `copilot`, `copilot-slim` after `claude-code-slim`).
- Update `README.md` — add rows to "Available Templates" table, add a short paragraph to "Choosing a template" covering the copilot pair.
- Add v0.4.0 entry to `CHANGELOG.md`; bump `package.json` version 0.3.0 → 0.4.0.
- Ship via a conventional-commit `feat:` marker (minor).

## Non-Goals

- **No CLI source code changes.** `src/**` stays content-agnostic.
- **No catalog schema changes.** Two entries in the existing v1 shape, no new fields.
- **No auto-injection of host credentials.** Users prefix `GH_TOKEN=$(gh auth token)` themselves (see "Expected Invocation" below). A generic host-env injection mechanism is deferred to a future milestone that follows up on RFC 0001 (`_report/rfc-0001-sandboxed-credential-storage.md`) — see `_report/deferred-host-env-injection.md` for the rationale.
- **No `scripts/` directory inside copilot templates.** The `scripts/` convention is RFC-0001 territory and depends on `scx init` growing multi-file fetch support. Introducing it in milestone 5 would pre-empt that design.
- **No dogfood for copilot.** The repo continues to use `.devcontainer/claude-code-slim/` only. No `.devcontainer/copilot*/` directory is added.
- **No changes to `.github/workflows/publish-templates.yml`.** The existing matrix discovery auto-picks `copilot-slim` (has Dockerfile) and naturally skips `copilot` (no Dockerfile).
- **No tester-agent integration testing.** Per AGENTS.md, tester is only invoked on explicit user request.
- **No image signing / SBOM / provenance.**
- **No migration or deprecation path for the claude-code templates.** They are unaffected.
- **No `initializeCommand` or `workspaceFolder` fields** in either copilot template — they rely on devcontainer-spec defaults (matches user intent; differs from claude-code templates, which need `initializeCommand` to pre-create the `.claude.json` file).

## Expected Invocation

Copilot CLI authenticates via `$GH_TOKEN`. The templates use the standard devcontainer substitution `"GH_TOKEN": "${localEnv:GH_TOKEN}"`, which means `$GH_TOKEN` must be set in the host shell at invocation time. The expected user pattern is to pipe a fresh token from `gh auth token` on each call:

```bash
GH_TOKEN=$(gh auth token) scx up copilot
GH_TOKEN=$(gh auth token) scx exec copilot copilot
GH_TOKEN=$(gh auth token) scx rebuild copilot
```

Same pattern for `copilot-slim`. This is documented in README's Copilot rows. Automating the `gh auth token` fetch inside the `scx` CLI is out of scope here (see the deferred-host-env-injection report for the direction we'll take later).

## Template Parity

Both `copilot` and `copilot-slim` share the same `devcontainer.json` shape. Only three fields/aspects differ:

| Field | `copilot` (features-based) | `copilot-slim` (Dockerfile-based) |
|---|---|---|
| `image` | `"mcr.microsoft.com/devcontainers/javascript-node:22"` | `"ghcr.io/thaitype/sandcontainer-copilot-slim:latest"` |
| `features` | `{ "ghcr.io/devcontainers/features/copilot-cli:1": {}, "ghcr.io/devcontainers/features/github-cli:1": {} }` | _(absent)_ |
| `Dockerfile` on disk | _(absent)_ | present |

Everything else is byte-identical across both templates:

- `name`: `"Copilot CLI Sandbox"` (both templates share the same `name`; the catalog entry's `name` field distinguishes them for `scx list`)
- `remoteUser`: `"node"`
- `containerEnv`: `{ "GH_TOKEN": "${localEnv:GH_TOKEN}" }`
- `mounts`:
  - `source=${localEnv:HOME}/.copilot,target=/home/node/.copilot,type=bind`
  - `source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly`
- _(no `initializeCommand`, no `workspaceFolder` — both absent in both templates by design)_

Rationale: a user switching between `scx up copilot` and `scx up copilot-slim` must get identical in-container UX (same Copilot CLI auth state at `~/.copilot`, same `GH_TOKEN`, same git config). Only the build path differs. The host and sandbox share one `~/.copilot` directory — same pattern as `~/.claude` for the claude-code templates (one auth profile shared across host and sandbox).

## Catalog Shape

`catalog.json` lists the new entries alphabetically after `claude-code-slim`, with neutral descriptions mirroring the claude-code pair's tone.

```json
{
  "version": 1,
  "templates": [
    { "id": "claude-code", "...": "..." },
    { "id": "claude-code-slim", "...": "..." },
    {
      "id": "copilot",
      "name": "Copilot CLI",
      "description": "Devcontainer for GitHub Copilot CLI using the standard Microsoft JavaScript/Node base image and devcontainer-features. Larger first build (~2.3GB); no pre-built image on GHCR.",
      "tags": ["copilot", "github", "sandbox", "features"],
      "kind": "devcontainer",
      "url": "https://raw.githubusercontent.com/thaitype/sandcontainer/main/templates/copilot/devcontainer.json"
    },
    {
      "id": "copilot-slim",
      "name": "Copilot CLI (Slim)",
      "description": "Devcontainer for GitHub Copilot CLI with a hand-picked node:22-slim base and pre-built GHCR image (~800MB). Faster first run; no devcontainer-features.",
      "tags": ["copilot", "github", "sandbox", "slim", "prebuilt"],
      "kind": "devcontainer",
      "url": "https://raw.githubusercontent.com/thaitype/sandcontainer/main/templates/copilot-slim/devcontainer.json"
    }
  ]
}
```

(Exact wording locked in the task spec; the above captures shape + intent.)

## Publish Workflow Behavior

`publish-templates.yml` matrix discovery (existing, unchanged):

```bash
[ -f "templates/$d/Dockerfile" ] && echo "$d"
```

After milestone 5, the matrix will include:

- `claude-code-slim` (existing) → still built.
- `copilot-slim` (new) → built → `ghcr.io/thaitype/sandcontainer-copilot-slim:latest`.
- `claude-code` and `copilot` are excluded automatically (no Dockerfile).

First publish of `sandcontainer-copilot-slim` requires a one-time visibility flip to **public** in the GHCR UI (same one-time step `sandcontainer-claude-code-slim` needed at milestone 2 / milestone 4).

## Release Summary

| Area | v0.3.x | v0.4.0 (after milestone 5) |
|---|---|---|
| Catalog entries | 2 (`claude-code`, `claude-code-slim`) | 4 (+ `copilot`, `copilot-slim`) |
| GHCR images built by CI | `sandcontainer-claude-code-slim:latest` | + `sandcontainer-copilot-slim:latest` |
| CLI behavior | unchanged | unchanged |
| Existing user installs | unaffected | unaffected |
| Repo dogfood | `.devcontainer/claude-code-slim/` | `.devcontainer/claude-code-slim/` (unchanged) |

**Non-breaking**: no existing user's `scx init <id>` workflow is altered. The change is purely additive.

## Post-Merge Manual Steps

1. Wait for `publish-templates.yml` to complete on `main` (builds `copilot-slim` image).
2. In GHCR UI, flip `sandcontainer-copilot-slim` package visibility to **public**.
3. (Optional smoke tests) Scratch-directory smoke test:
   - `scx init copilot-slim && scx up copilot-slim` with `GH_TOKEN` set → confirm `gh` CLI + `copilot` on PATH.
   - `scx init copilot && scx up copilot` → confirm features install completes and `copilot` + `gh` available.
4. Git tag + npm publish via `pnpm release` (release-it flow — no changes from milestone 4).

## Requirements Respected

- **AGENTS.md — CLI content-agnostic**: no `src/**` changes; all behavior lives in `templates/**`, `catalog.json`, README/CHANGELOG.
- **AGENTS.md — milestone isolation**: milestone 4 artifacts not inherited; parity contract style is re-authored for copilot.
- **AGENTS.md — surgical changes**: README and CHANGELOG edits scoped to specific sections; no reformatting elsewhere.
- **AGENTS.md — tester only on explicit request**: no auto-delegation to tester-agent.
- **`.chief/_rules/_contract/filesystem.md`**: after `scx init copilot[-slim]`, templates land at `.devcontainer/copilot/devcontainer.json` (or `copilot-slim/...`), honoring the established `.devcontainer/<id>/` convention.
- **Milestone 2 decisions still hold**: catalog served via `raw.githubusercontent.com`, images on GHCR with `:latest` tag, public visibility flipped once in UI per new image.

## Out of Scope (Milestone 5)

- Auto-migration or CLI warnings.
- New tags beyond `:latest` for the copilot-slim image.
- Cosign / SBOM / provenance.
- Additional templates beyond these two.
- Changes to `init`, `up`, `exec`, `rebuild`, `down`, or `list` command behavior.
- Changes to `.chief/_rules/_contract/filesystem.md` (remains valid).
- Any changes to the claude-code / claude-code-slim templates.
- Any changes to `.github/workflows/publish-templates.yml`.
