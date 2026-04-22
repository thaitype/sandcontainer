# Filesystem Convention

sandcontainer-managed templates live at `.devcontainer/<id>/devcontainer.json` (devcontainer spec layout #3).

- **Directory**: `.devcontainer/` (singular, matching the devcontainer spec).
- **Per-template subdirectory**: `<id>/` where `<id>` is the catalog template id.
- **Config file**: `devcontainer.json` inside each subdirectory.

## Runtime Invocation

Forwarders invoke `@devcontainers/cli` with the user's repository root as the workspace folder and the per-template config as `--config`:

- `--workspace-folder = path.resolve(cwd)`
- `--config = path.resolve(cwd, '.devcontainer', id, 'devcontainer.json')`

## `down` Container Matching

`scx down <id>` identifies the target container by the dual docker label pair written by `@devcontainers/cli`:

- `devcontainer.local_folder = <repoRoot>`
- `devcontainer.config_file = <configPath>`

Both labels MUST match; either alone is insufficient because multiple templates under one repo share the `local_folder`.

## Pre-flight Check

Every forwarder (`up`, `exec`, `rebuild`, `down`) verifies that `<configPath>` exists before invoking `@devcontainers/cli` or `docker`. If absent, it prints `error: Template "<id>" is not initialized. Run: sandcontainer init <id>` to stderr and exits 1.

## Reserved Locations

sandcontainer does NOT manage:

- `.devcontainer/devcontainer.json` (root-level config, spec layout #2) — ignored by `list` and forwarders.
- `.devcontainer.json` (spec layout #1) — ignored.

These may exist alongside sandcontainer-managed template subdirectories without conflict.
