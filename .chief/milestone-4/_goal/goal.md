# Milestone 4 — Split `claude-code` into Two Templates

## Overview

Rename the existing Dockerfile-based `claude-code` template to `claude-code-slim`, and introduce a new features-based `claude-code` template. The rename signals the deliberate tradeoff of the hand-picked `node:22-slim` base (~800MB) versus the standard `mcr.microsoft.com/devcontainers/javascript-node:22` + devcontainer-features path (~2.3GB). Users pick the one that matches their preference — fast pull vs. familiar standard base.

No CLI source changes. Milestone 4 is template files + `catalog.json` + CI-side naming + README/CHANGELOG + the repo's dogfood image tag. Ships as `0.3.0` (breaking: existing installs must re-run `scx init claude-code`).

## Scope

- Rename `templates/claude-code/` → `templates/claude-code-slim/` on disk. Dockerfile contents unchanged.
- Add a new `templates/claude-code/devcontainer.json` (features-based, no Dockerfile).
- Make mount/env/init identical across both templates (see "Template Parity" below).
- Update `catalog.json` to list both templates alphabetically with equal, neutral descriptions.
- Update the repo's own `.devcontainer/claude-code/devcontainer.json` image tag to `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` (keep dogfood directory name as `claude-code`).
- Update `README.md` to explain the two templates and the rename.
- Add a `CHANGELOG.md` entry noting the breaking change (users must re-run `scx init claude-code`).
- Ship as `0.3.0` via a conventional-commit breaking marker (`feat!:` or `refactor!:`).

## Non-Goals

- **No CLI source code changes.** `src/**` stays content-agnostic. Unit tests that reference `claude-code` as a fixture id remain unchanged.
- **No auto-migration.** Users with an existing `.devcontainer/claude-code/devcontainer.json` pointing at the old GHCR tag must re-run `scx init claude-code` after upgrading.
- **No CLI warning/deprecation path.** The CLI does not know about template-image names.
- **No changes to the publish workflow.** `.github/workflows/publish-templates.yml` already discovers templates by `Dockerfile` presence, so the features-based `claude-code` is skipped naturally and the renamed `claude-code-slim` is picked up automatically.
- **No tester-agent integration testing.** Per AGENTS.md, tester is only invoked when the user explicitly requests real-world validation.
- **No image signing / SBOM / provenance work.**
- **No deletion of the old GHCR image from within this milestone.** The user removes `ghcr.io/thaitype/sandcontainer-claude-code:latest` manually in the GHCR UI after release.
- **No catalog schema changes.** Two entries in the same v1 shape.

## Template Parity

Both `claude-code` and `claude-code-slim` share the same `devcontainer.json` shape. Only three fields differ:

| Field | `claude-code-slim` | `claude-code` |
|---|---|---|
| `image` | `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` | `mcr.microsoft.com/devcontainers/javascript-node:22` |
| `features` | _(absent)_ | `{ "ghcr.io/anthropics/devcontainer-features/claude-code:1": {}, "ghcr.io/devcontainers/features/github-cli:1": {} }` |
| `Dockerfile` on disk | present (unchanged from current) | absent |

Everything else is identical across both templates:

- `name`: `"Claude Code Sandbox"`
- `remoteUser`: `"node"`
- `initializeCommand`: `"mkdir -p ${localEnv:HOME}/.claude && touch ${localEnv:HOME}/.claude.json"`
- `containerEnv`: `{ "CLAUDE_CODE_OAUTH_TOKEN": "${localEnv:CLAUDE_CODE_OAUTH_TOKEN}" }`
- `mounts`:
  - `source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind`
  - `source=${localEnv:HOME}/.claude.json,target=/home/node/.claude.json,type=bind`
  - `source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly`
- `workspaceFolder`: `"/workspaces/${localWorkspaceFolderBasename}"`

Both templates mount the host's `~/.claude` (and `~/.claude.json`) — one Claude profile is shared across both sandboxes by design (grill Q2).

## Catalog Shape

`catalog.json` lists both entries alphabetically, with neutral descriptions that describe tradeoffs without recommending either.

```json
{
  "version": 1,
  "templates": [
    {
      "id": "claude-code",
      "name": "Claude Code",
      "description": "Devcontainer for Claude Code using the standard Microsoft JavaScript/Node base image and devcontainer-features. Larger first build (~2.3GB); no pre-built image on GHCR.",
      "tags": ["claude", "ai", "sandbox", "features"],
      "kind": "devcontainer",
      "url": "https://raw.githubusercontent.com/thaitype/sandcontainer/main/templates/claude-code/devcontainer.json"
    },
    {
      "id": "claude-code-slim",
      "name": "Claude Code (Slim)",
      "description": "Devcontainer for Claude Code with a hand-picked node:22-slim base and pre-built GHCR image (~800MB). Faster first run; no devcontainer-features.",
      "tags": ["claude", "ai", "sandbox", "slim", "prebuilt"],
      "kind": "devcontainer",
      "url": "https://raw.githubusercontent.com/thaitype/sandcontainer/main/templates/claude-code-slim/devcontainer.json"
    }
  ]
}
```

(Exact wording in task-spec phase; the above captures shape + intent.)

## Publish Workflow Behavior

`publish-templates.yml` matrix discovery (existing, unchanged):

```bash
[ -f "templates/$d/Dockerfile" ] && echo "$d"
```

After milestone 4:
- `templates/claude-code-slim/` has a `Dockerfile` → builds `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` on push to `main`.
- `templates/claude-code/` has no `Dockerfile` → naturally excluded from the matrix.
- The old `ghcr.io/thaitype/sandcontainer-claude-code:latest` tag is no longer rebuilt. User deletes it manually.

## Breaking Changes Summary

| Area | v0.2.x | v0.3.0 (after milestone 4) |
|---|---|---|
| Catalog entries | one (`claude-code`, Dockerfile-based) | two (`claude-code` = features; `claude-code-slim` = Dockerfile) |
| `scx init claude-code` output | writes slim-style config pointing at `ghcr.io/.../claude-code:latest` | writes features-based config using `mcr.microsoft.com/...:22` + features |
| GHCR image built by CI | `sandcontainer-claude-code:latest` | `sandcontainer-claude-code-slim:latest` |
| Existing user installs | continue to work until old GHCR image is deleted | break once user deletes old image; re-run `scx init claude-code` to get new config |
| Repo dogfood image tag | `sandcontainer-claude-code:latest` | `sandcontainer-claude-code-slim:latest` (same path `.devcontainer/claude-code/`) |

## Requirements Respected

- **AGENTS.md — CLI content-agnostic**: no `src/**` changes; all template behavior lives in `templates/**`, `catalog.json`, and the workflow.
- **AGENTS.md — milestone isolation**: prior milestones' goals/contracts are not inherited; references here are historical only. The `.chief/_rules/_contract/filesystem.md` (written in milestone 3) still applies: sandcontainer-managed templates live at `.devcontainer/<id>/devcontainer.json`, which the new features-based `claude-code` honors.
- **AGENTS.md — tester only on explicit request**: no auto-delegation to tester-agent.
- **Milestone 2 decisions still hold**: catalog served via `raw.githubusercontent.com`, images on GHCR with `:latest` tag, public visibility flipped once in UI. A second `sandcontainer-claude-code-slim` image will need its first-time visibility flip after the initial publish.

## Out of Scope (Milestone 4)

- Auto-migration tooling or CLI warnings for users on the old template.
- New tags beyond `:latest` for the slim image.
- Cosign / SBOM / provenance.
- Additional templates beyond these two.
- Any changes to `init`, `up`, `exec`, `rebuild`, `down`, or `list` command behavior.
- Changes to `.chief/_rules/_contract/filesystem.md` (remains valid as written).
