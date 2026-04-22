# Milestone 3 — Align On-Disk Layout with the Devcontainer Spec

## Overview

Fix a spec-incompatibility bug inherited from milestone 1: sandcontainer stores templates under `.devcontainers/<id>/` (plural) and passes that directory as `--workspace-folder` to `@devcontainers/cli`. The devcontainer spec requires configs at `<workspace>/.devcontainer/devcontainer.json` (singular), so `@devcontainers/cli` cannot find the config and `up` / `exec` / `rebuild` fail with `Dev container config ... not found`.

Milestone 3 adopts the spec's native multi-config layout (`.devcontainer/<id>/devcontainer.json`), switches the forwarders to mount the user's repo as the workspace, and selects the per-template config via `--config`. The change is a breaking on-disk and runtime rename; v0.2.0 ships the fix.

## Scope

- Rename on-disk layout: `.devcontainers/<id>/devcontainer.json` → `.devcontainer/<id>/devcontainer.json`
- Switch `--workspace-folder` from the template directory to the user's repository root
- Forward `--config <abs-path>` to `@devcontainers/cli` for `up` / `exec` / `rebuild`
- Rewrite `down` to use the dual-label filter (`devcontainer.local_folder` AND `devcontainer.config_file`)
- Update every forwarder's pre-flight existence check to the new path
- Update all affected unit tests
- Promote the new filesystem convention to `.chief/_rules/_contract/filesystem.md` so future milestones don't regress
- Update `README.md` examples and user-facing output strings
- Add a CHANGELOG note for the breaking change (users must re-run `init`)

## Non-Goals

- No auto-migration from `.devcontainers/<id>/` to `.devcontainer/<id>/`. Users of v0.1.x re-run `sandcontainer init <id>` and manually remove the orphan directory.
- No new commands or features. This milestone is behavior-preserving except for the layout change.
- No catalog.json schema changes.
- No retroactive edits to `.chief/milestone-1/_contract/filesystem.md`; milestone artifacts are historical (AGENTS.md rule).
- No Windows path-normalization work for docker labels (drive-letter lowercasing). `@devcontainers/cli` normalizes these; sandcontainer passes raw `path.resolve()` output. Documented as a known quirk; follow-up milestone if Windows users report issues.
- No version-bump automation. The 0.1.x → 0.2.0 bump happens via the existing release-it flow, outside milestone-3 tasks.

## Filesystem Layout (New)

```
<user-repo>/
├── .devcontainer/
│   ├── <id-a>/
│   │   └── devcontainer.json
│   └── <id-b>/
│       └── devcontainer.json
└── <rest of user's project>
```

- Matches devcontainer spec layout #3 (`.devcontainer/<name>/devcontainer.json`)
- Multiple templates coexist natively; no custom namespace
- A root-level `.devcontainer/devcontainer.json` (spec layout #2) is permitted to exist but is **not** managed by sandcontainer (`list` ignores files, only directories with `devcontainer.json` inside are templates)

## Runtime Invocation (New)

For every forwarder, let:
- `repoRoot = process.cwd()` (absolute)
- `configPath = path.resolve(repoRoot, '.devcontainer', id, 'devcontainer.json')`

| Command | Invocation |
|---|---|
| `up <id> [...args]` | `npx @devcontainers/cli up --workspace-folder <repoRoot> --config <configPath> ...args` |
| `exec <id> [...args]` | `npx @devcontainers/cli exec --workspace-folder <repoRoot> --config <configPath> ...args` |
| `rebuild <id> [...args]` | `npx @devcontainers/cli up --workspace-folder <repoRoot> --config <configPath> --remove-existing-container ...args` |
| `down <id>` | `docker ps -q --filter label=devcontainer.local_folder=<repoRoot> --filter label=devcontainer.config_file=<configPath>` then `docker stop <id>` on matches. No matches → exit 0. |

## Workspace Semantics Change

Pre-milestone-3: the container's workspace was the template directory itself (essentially empty). Post-milestone-3: the container's workspace is the user's repository root. The user's project code is mounted into `/workspaces/<repo-name>` inside the container.

Rationale:
- Matches how every standard devcontainer tool (VS Code, JetBrains, Codespaces) operates
- The `claude-code` template is only useful with code to work on; mounting an empty dir made it effectively unusable
- "Sandcontainer" still provides **container-level** isolation (no host escape); it was never intended to also hide the user's own code from themselves

## Breaking Changes Summary

| Area | v0.1.x | v0.2.0 (after milestone 3) |
|---|---|---|
| Init target path | `.devcontainers/<id>/devcontainer.json` | `.devcontainer/<id>/devcontainer.json` |
| Workspace mount | template dir (empty) | user repo root |
| `list` scan root | `.devcontainers/` | `.devcontainer/` |
| `down` container match | single label (`local_folder` = template dir) | dual label (`local_folder` = repo root, `config_file` = config path) |
| Existing `.devcontainers/` dirs | — | Orphaned. User re-runs `init` and removes the old dir manually. |

## Requirements Respected

- AGENTS.md rule: milestone-1 contracts are historical, not inherited — we are free to supersede them in the new `.chief/_rules/_contract/filesystem.md`.
- CLI remains content-agnostic; no template-specific behavior is introduced.
- No changes to catalog format, image publishing, or the repo's own `.devcontainer/claude-code/` dogfood (it already uses the spec layout).

## Out of Scope (Milestone 3)

- Windows docker-label path normalization
- Migration tooling (scan for `.devcontainers/` and offer auto-rename)
- New forwarded flags or commands
- Changes to `catalog.json` or template-image publishing
- Changes to `init`'s force/overwrite behavior beyond the path rename
