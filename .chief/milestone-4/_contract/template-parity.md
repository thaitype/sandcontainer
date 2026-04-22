---
name: claude-code template parity
description: Locks which fields must be identical vs may differ between templates/claude-code and templates/claude-code-slim
type: contract
---

# Template Parity — `claude-code` vs `claude-code-slim`

Both `templates/claude-code/devcontainer.json` and `templates/claude-code-slim/devcontainer.json` MUST follow this contract. Any edit that drifts one template away from the other without updating this contract first is a bug.

## Identical fields (MUST be byte-identical modulo whitespace)

Both templates share every field below, with the exact same value:

| Field | Value |
|---|---|
| `name` | `"Claude Code Sandbox"` |
| `remoteUser` | `"node"` |
| `initializeCommand` | `"mkdir -p ${localEnv:HOME}/.claude && touch ${localEnv:HOME}/.claude.json"` |
| `containerEnv.CLAUDE_CODE_OAUTH_TOKEN` | `"${localEnv:CLAUDE_CODE_OAUTH_TOKEN}"` |
| `workspaceFolder` | `"/workspaces/${localWorkspaceFolderBasename}"` |
| `mounts[0]` | `"source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind"` |
| `mounts[1]` | `"source=${localEnv:HOME}/.claude.json,target=/home/node/.claude.json,type=bind"` |
| `mounts[2]` | `"source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"` |

Rationale: a user switching between `scx up claude-code` and `scx up claude-code-slim` must get identical in-container UX (same auth profile, same workspace mount, same env). Only the build path differs.

## Permitted differences

| Field | `claude-code` (features-based) | `claude-code-slim` (Dockerfile-based) |
|---|---|---|
| `image` | `"mcr.microsoft.com/devcontainers/javascript-node:22"` | `"ghcr.io/thaitype/sandcontainer-claude-code-slim:latest"` |
| `features` | Present: `{ "ghcr.io/anthropics/devcontainer-features/claude-code:1": {}, "ghcr.io/devcontainers/features/github-cli:1": {} }` | Absent |
| `Dockerfile` on disk | Absent | Present (see current `templates/claude-code/Dockerfile`, unchanged content) |

No other differences are permitted.

## Enforcement

- At task-spec time, the builder uses the goal.md and this contract as the source of truth for both templates.
- At review time, a diff between the two `devcontainer.json` files should show only the three permitted differences above (and the enclosing JSON braces).
- Any future milestone adding a third Claude-Code-flavored template MUST either extend this contract or supersede it explicitly.

## Out of scope for this contract

- The `Dockerfile` contents themselves — existing file is retained byte-for-byte; milestone 4 only moves it.
- `catalog.json` entries for these templates — covered in goal.md.
- The repo's dogfood `.devcontainer/claude-code/devcontainer.json` — not a published template; it's a consumer of `claude-code-slim`'s published image. Parity with the published template is not required here.
