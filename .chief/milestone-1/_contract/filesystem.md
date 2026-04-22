# Contract — Filesystem Layout

## User Project Layout

```
<cwd>/
  .devcontainers/
    <template-id>/
      devcontainer.json
    <another-id>/
      devcontainer.json
```

- All sandcontainer-managed files live under `.devcontainers/<id>/`.
- One directory per initialized template; they coexist without interference.
- The directory name equals the catalog template `id`.

## Path Resolution

- All paths are resolved relative to `process.cwd()` at the time the command runs.
- No upward search for a project root. Running `sandcontainer` in a subdirectory does **not** find a parent project's `.devcontainers/`.
- Absolute paths are computed via `path.resolve(cwd, ".devcontainers", id)` and passed to `@devcontainers/cli` as `--workspace-folder`.

## Write Rules

- `init` is the only command that creates files or directories.
- `init` creates `.devcontainers/<id>/` with `recursive: true`. If the directory already exists, reuse it.
- `init` writes only one file: `devcontainer.json`. It does not create, delete, or touch any sibling file.
- `init` never writes outside `.devcontainers/<id>/`.
- Without `--force`, `init` refuses to touch an existing `devcontainer.json`. With `--force`, it overwrites (truncate + write, not patch).

## Read Rules

- `list` reads only `.devcontainers/` and its immediate children — no recursion into template directories beyond checking for `devcontainer.json`.
- `up`/`exec`/`rebuild`/`down` read only `.devcontainers/<id>/devcontainer.json` existence (for the pre-flight check). The actual parsing is delegated to `@devcontainers/cli`.

## Out of Scope (Milestone 1)

- No lockfile, marker file, or state file written by sandcontainer.
- No `.sandcontainerrc`, no config files, no env-var overrides.
- No `~/.config/sandcontainer/` or `~/.cache/sandcontainer/` — sandcontainer writes nothing outside `cwd/.devcontainers/`.
