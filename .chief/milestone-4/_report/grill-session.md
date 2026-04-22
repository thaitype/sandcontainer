---
name: Milestone 4 grill-me session
description: Requirements-clarification interview for Milestone 4 — rename claude-code to claude-code-slim, add new features-based claude-code template
type: project
---

# Milestone 4 — Grill-Me Session Notes

Date: 2026-04-22
Status: Complete

---

## Background Discussion (Pre-Grill)

### Why `claude-code-slim`?

The standard devcontainer features-based approach (using `mcr.microsoft.com/devcontainers/javascript-node:22` with devcontainer features) produces ~2.3GB images. This is too large for the project's use case. The current template uses a custom Dockerfile based on `node:22-slim` that comes in at ~800MB after installing all dependencies.

The rename from `claude-code` → `claude-code-slim` communicates this deliberate tradeoff: smaller image, hand-picked packages, no devcontainer features.

### Two-Template Strategy

| | `claude-code-slim` (renamed from `claude-code`) | `claude-code` (new) |
|---|---|---|
| Base | `node:22-slim` | `mcr.microsoft.com/devcontainers/javascript-node:22` |
| Image size | ~800MB | ~2.3GB |
| Pre-built on GHCR | Yes (Dockerfile-based) | No (features-based, user builds locally) |
| Dockerfile | Yes | No |
| First run speed | Fast (pull only) | Slower (pull + feature install) |

### Features-Based Template Example

User provided this as the target `devcontainer.json` for the new `claude-code`:

```json
{
  "name": "Claude Code Sandbox",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:22",
  "features": {
    "ghcr.io/anthropics/devcontainer-features/claude-code:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "remoteUser": "node",
  "mounts": [
    "source=${localEnv:HOME}/.claude-sandbox,target=/home/node/.claude,type=bind",
    "source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"
  ]
}
```

Per Q2/Q3 below, the final features-based template will use `~/.claude` (not `~/.claude-sandbox`) and inherit the slim template's full mount/env setup.

### CI/Publishing Impact

- The publish workflow (`publish-templates.yml`) only discovers templates that have a `Dockerfile`. The features-based `claude-code` template is naturally skipped (no Dockerfile = no GHCR publish).
- After rename, CI builds `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` instead of the current `ghcr.io/thaitype/sandcontainer-claude-code:latest`.
- The old `ghcr.io/thaitype/sandcontainer-claude-code:latest` image — user will remove it manually.

### Scope Clarification

- Milestone 4 focuses on **Dockerfile-based (pre-built) templates only** for image publishing; the features-based `claude-code` template adds a second catalog entry but does not go through CI.
- The features-based `claude-code` template's config is merged with learnings from the existing Dockerfile-based template (mounts, env vars, etc.) — see Q3.

---

## Grill Questions & Decisions

### Q1: Old GHCR image (`ghcr.io/thaitype/sandcontainer-claude-code:latest`) after rename?

**Decision**: User will remove it manually. No automation needed in milestone 4.

### Q2: Mount directories — shared or isolated between templates?

**Decision**: Both templates share `~/.claude` on the host. One Claude profile is reused across both sandboxes. No per-template suffix (no `~/.claude-sandbox`).

### Q3: Feature parity for the new features-based template

**Decision**: Full parity with the slim template. Both templates have identical mounts, env, and init:
- Mounts: `~/.claude`, `~/.claude.json`, `~/.gitconfig` (readonly)
- `CLAUDE_CODE_OAUTH_TOKEN` container env
- `initializeCommand` to create `~/.claude` dir and touch `~/.claude.json` on host
- `workspaceFolder: /workspaces/${localWorkspaceFolderBasename}`

The only intentional differences are:
- `image` (slim: GHCR pre-built; features: microsoft base)
- Presence of `features: {...}` block (features-based only)
- Presence of `Dockerfile` on disk (slim only)

### Q4: Repo's own `.devcontainer/` dogfood

**Decision**: Keep directory name as `.devcontainer/claude-code/` (no rename). Update the image tag inside to `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest`. The dogfood dir name is internal and need not track the catalog id.

### Q5: Catalog ordering and positioning

**Decision**: Equal billing, alphabetical order. `claude-code` first, `claude-code-slim` second. Descriptions are neutral (describe tradeoffs without recommending either).

### Q6: Version bump

**Decision**: 0.3.0 breaking. Commit with `feat!:` or `refactor!:` marker so release-it produces a 0.3.0 release. Signals users must re-run `scx init claude-code` after upgrading.

---

## Scope Summary

### In scope

1. Rename `templates/claude-code/` → `templates/claude-code-slim/` (dir and Dockerfile unchanged in content)
2. Add new `templates/claude-code/devcontainer.json` (features-based, full mount/env parity, no Dockerfile)
3. Update `catalog.json`: two entries (alphabetical, neutral descriptions, correct `url` per template)
4. Update `.devcontainer/claude-code/devcontainer.json` image tag → `-claude-code-slim:latest` (dir name unchanged)
5. Update `README.md` to document the two templates and the rename
6. Update `CHANGELOG.md` with a breaking-change note (users must re-init)
7. No CLI source code changes; `src/**` is content-agnostic
8. Commit with breaking marker so release-it produces `0.3.0`

### Out of scope

- Auto-migration of user installs (no CLI warning, no rename helper)
- Tester-agent integration testing (user triggers explicitly if wanted)
- Image signing / SBOM / provenance (future milestone)
- Changes to the publish workflow (existing matrix discovery handles the rename)
- New CLI commands or flags
- Changes to catalog schema
