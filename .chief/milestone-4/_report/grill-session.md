# Milestone 4 — Grill-Me Session Notes

Date: 2026-04-22
Status: In Progress

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

### CI/Publishing Impact

- The publish workflow (`publish-templates.yml`) only discovers templates that have a `Dockerfile`. The features-based `claude-code` template would naturally be skipped (no Dockerfile = no GHCR publish).
- After rename, CI builds `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` instead of the current `ghcr.io/thaitype/sandcontainer-claude-code:latest`.
- The old `ghcr.io/thaitype/sandcontainer-claude-code:latest` image — user will remove it manually.

### Scope Clarification

- Milestone 4 focuses on **Dockerfile-based (pre-built) templates only**
- The features-based `claude-code` template is provided as a reference/example but its config should be merged with learnings from the existing Dockerfile-based template (mounts, env vars, etc.)

---

## Grill Questions & Decisions

### Q1: Old GHCR image (`ghcr.io/thaitype/sandcontainer-claude-code:latest`) after rename?

**Decision**: User will remove it manually. No automation needed in milestone 4.

### Q2: Mount directories — shared or isolated between templates?

**Status**: OPEN — awaiting user answer.

Should both templates share `~/.claude` for host mounts, or use separate directories (`~/.claude` for slim, `~/.claude-sandbox` for features-based)?

---

## Open Items

- Q2 answer pending
- Grill session not yet complete — more questions to follow
