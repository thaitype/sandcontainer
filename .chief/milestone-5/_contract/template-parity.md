---
name: copilot template parity
description: Locks which fields must be identical vs may differ between templates/copilot and templates/copilot-slim
type: contract
---

# Template Parity — `copilot` vs `copilot-slim`

Both `templates/copilot/devcontainer.json` and `templates/copilot-slim/devcontainer.json` MUST follow this contract. Any edit that drifts one template away from the other without updating this contract first is a bug.

## Identical fields (MUST be byte-identical modulo whitespace)

Both templates share every field below, with the exact same value:

| Field | Value |
|---|---|
| `name` | `"Copilot CLI Sandbox"` |
| `remoteUser` | `"node"` |
| `containerEnv.GH_TOKEN` | `"${localEnv:GH_TOKEN}"` |
| `mounts[0]` | `"source=${localEnv:HOME}/.copilot,target=/home/node/.copilot,type=bind"` |
| `mounts[1]` | `"source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"` |

## Fields that MUST be absent from both templates

To stay in parity by absence:

- `initializeCommand` — absent in both. (The `~/.copilot` dir is auto-created by Docker on first mount; no pre-creation step is required. The host `~/.gitconfig` file is assumed to exist since the user has git configured.)
- `workspaceFolder` — absent in both. Relies on devcontainer-spec default.

Rationale: a user switching between `scx up copilot` and `scx up copilot-slim` must get identical in-container UX — same Copilot CLI auth state at `~/.copilot`, same `GH_TOKEN` env, same git config, same workspace layout. Only the build path (features install vs. pre-built image) differs.

## Permitted differences

| Aspect | `copilot` (features-based) | `copilot-slim` (Dockerfile-based) |
|---|---|---|
| `image` | `"mcr.microsoft.com/devcontainers/javascript-node:22"` | `"ghcr.io/thaitype/sandcontainer-copilot-slim:latest"` |
| `features` | Present: `{ "ghcr.io/devcontainers/features/copilot-cli:1": {}, "ghcr.io/devcontainers/features/github-cli:1": {} }` | Absent |
| `Dockerfile` on disk | Absent | Present (`templates/copilot-slim/Dockerfile`) |

No other differences are permitted.

## Enforcement

- At task-spec time, the builder uses `_goal/goal.md` and this contract as the source of truth for both templates.
- At review time, a diff between the two `devcontainer.json` files should show only the three permitted differences above (and the enclosing JSON braces / formatting).
- Any future milestone adding a third Copilot-flavored template MUST either extend this contract or supersede it explicitly.

## Out of scope for this contract

- The `Dockerfile` contents themselves — defined in task-11, modeled on `templates/claude-code-slim/Dockerfile` with `@anthropic-ai/claude-code` replaced by `@github/copilot`.
- `catalog.json` entries for these templates — covered in `_goal/goal.md` and task-12.
- The repo's own `.devcontainer/` dogfood directory — unaffected by milestone 5 (continues to use `claude-code-slim`).
- Parity with the claude-code templates — intentionally not enforced. The two template families use different host paths, env vars, and feature sets; only the file-shape pattern is shared.
