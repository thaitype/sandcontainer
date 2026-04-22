# sandcontainer

Catalog-driven CLI for distributing devcontainer configurations. Resolves template IDs from a remote catalog, downloads `devcontainer.json` into `.devcontainers/<id>/`, and forwards lifecycle commands to `@devcontainers/cli`.

## Requirements

- Node >= 20
- Docker
- macOS / Linux (Windows via WSL2)

## Install

```bash
npm install -g sandcontainer
```

Or run without installing:

```bash
npx sandcontainer <command>
```

Both `sandcontainer` and `scx` resolve to the same binary. Use `scx` for daily use.

## Quick Start

```bash
# 1. Browse available templates
scx list

# 2. Download a template into your project
scx init claude-code

# 3. Start the container
scx up claude-code

# 4. Run claude inside it
scx exec claude-code claude
```

## Command Reference

### `scx init <id> [--force]`

Download a template from the catalog into `.devcontainers/<id>/devcontainer.json`.

```bash
$ scx init claude-code
Initialized template "claude-code" at .devcontainers/claude-code/devcontainer.json

$ scx init claude-code
error: .devcontainers/claude-code/devcontainer.json already exists. Use --force to overwrite.

$ scx init claude-code --force
Initialized template "claude-code" at .devcontainers/claude-code/devcontainer.json

$ scx init nonexistent
error: Template "nonexistent" not found in catalog.
```

### `scx list`

List templates already initialized in the current project.

```bash
$ scx list
claude-code
copilot

$ scx list         # in a project without .devcontainers/
No templates found.
```

### `scx up <id> [...args]`

Start the devcontainer. All args after `<id>` are forwarded to `@devcontainers/cli`.

```bash
$ scx up claude-code
# → devcontainer up --workspace-folder .devcontainers/claude-code
# (streams @devcontainers/cli output)

$ scx up claude-code --build-no-cache
# → devcontainer up --workspace-folder .devcontainers/claude-code --build-no-cache
```

### `scx exec <id> [...args]`

Run a command inside the container.

```bash
$ scx exec claude-code bash
# → devcontainer exec --workspace-folder .devcontainers/claude-code bash
# (interactive shell inside the container)

$ scx exec claude-code claude --dangerously-skip-permissions
# → devcontainer exec --workspace-folder .devcontainers/claude-code claude --dangerously-skip-permissions
# (flags after <id> are NOT intercepted by sandcontainer)

$ scx exec claude-code bash -lc "pnpm install && pnpm test"
```

### `scx rebuild <id>`

Rebuild the container from scratch.

```bash
$ scx rebuild claude-code
# → devcontainer up --workspace-folder .devcontainers/claude-code --remove-existing-container
```

### `scx down <id>`

Stop the running container.

```bash
$ scx down claude-code
# → docker stop <container with label devcontainer.local_folder=<absolute path>>
```

### Using the long name or npx

```bash
$ sandcontainer init claude-code
$ sandcontainer up claude-code
# `sandcontainer` and `scx` are interchangeable; same binary, two names.

$ npx sandcontainer init claude-code
$ npx sandcontainer up claude-code
```

### Global Flags

```bash
$ scx --version
0.1.0

$ scx --help
# prints top-level help listing init / list / up / exec / rebuild / down

$ scx exec --help
# prints sandcontainer's help for `exec` (not @devcontainers/cli help)
```

## Available Templates

| ID | Description |
|----|-------------|
| `claude-code` | Devcontainer for running Claude Code in an isolated sandbox |

## Project Layout

After running `scx init`, your project will look like:

```
<your-project>/
  .devcontainers/
    claude-code/
      devcontainer.json
```

Multiple templates coexist side by side. The downloaded `devcontainer.json` is the single source of truth — edit it directly if you need to customize.

## License

MIT
