# sandcontainer

Catalog-driven CLI for distributing devcontainer configurations. Resolves template IDs from a remote catalog, downloads `devcontainer.json` into `.devcontainer/<id>/`, and forwards lifecycle commands to `@devcontainers/cli`.

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

Download a template from the catalog into `.devcontainer/<id>/devcontainer.json`.

```bash
$ scx init claude-code
Initialized template "claude-code" at .devcontainer/claude-code/devcontainer.json

$ scx init claude-code
error: .devcontainer/claude-code/devcontainer.json already exists. Use --force to overwrite.

$ scx init claude-code --force
Initialized template "claude-code" at .devcontainer/claude-code/devcontainer.json

$ scx init nonexistent
error: Template "nonexistent" not found in catalog.
```

### `scx list`

List templates already initialized in the current project.

```bash
$ scx list
claude-code
copilot

$ scx list         # in a project without .devcontainer/
No templates found.
```

### `scx up <id> [...args]`

Start the devcontainer. All args after `<id>` are forwarded to `@devcontainers/cli`.

```bash
$ scx up claude-code
# → devcontainer up --workspace-folder . --config .devcontainer/claude-code/devcontainer.json
# (streams @devcontainers/cli output)

$ scx up claude-code --build-no-cache
# → devcontainer up --workspace-folder . --config .devcontainer/claude-code/devcontainer.json --build-no-cache
```

### `scx exec <id> [...args]`

Run a command inside the container.

```bash
$ scx exec claude-code bash
# → devcontainer exec --workspace-folder . --config .devcontainer/claude-code/devcontainer.json bash
# (interactive shell inside the container)

$ scx exec claude-code claude --dangerously-skip-permissions
# → devcontainer exec --workspace-folder . --config .devcontainer/claude-code/devcontainer.json claude --dangerously-skip-permissions
# (flags after <id> are NOT intercepted by sandcontainer)

$ scx exec claude-code bash -lc "pnpm install && pnpm test"
```

### `scx rebuild <id>`

Rebuild the container from scratch.

```bash
$ scx rebuild claude-code
# → devcontainer up --workspace-folder . --config .devcontainer/claude-code/devcontainer.json --remove-existing-container
```

### `scx down <id>`

Stop the running container.

```bash
$ scx down claude-code
# → docker stop <container with labels devcontainer.local_folder=<repo> AND devcontainer.config_file=<config>>
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
| `claude-code` | Devcontainer for Claude Code using the standard Microsoft JavaScript/Node base image and devcontainer-features. Larger first build (~2.3GB); no pre-built image on GHCR. |
| `claude-code-slim` | Devcontainer for Claude Code with a hand-picked node:22-slim base and pre-built GHCR image (~800MB). Faster first run; no devcontainer-features. |

### Choosing a template

Both templates produce an identical in-container experience: the same `name`, `remoteUser`, `initializeCommand`, environment variables, bind mounts (including `~/.claude` and `~/.claude.json`), and `workspaceFolder`. The only difference is the build path:

- **`claude-code`** (features-based): starts from `mcr.microsoft.com/devcontainers/javascript-node:22` and installs Claude Code via `devcontainer-features`. No pre-built image. First build downloads and installs features (~2.3GB). Standard base image — good if you want to layer in additional features.
- **`claude-code-slim`** (Dockerfile-based): starts from a pre-built GHCR image (`ghcr.io/thaitype/sandcontainer-claude-code-slim:latest`) based on `node:22-slim` (~800MB). Faster first pull; no features step.

### Pre-building the features-based template (optional)

`scx` does not expose a `build` subcommand today. The features-based `claude-code` template installs features during the first `scx up`, which can take several minutes. If you want to pre-build the image separately (for CI, or to warm the Docker cache before working offline), invoke `@devcontainers/cli` directly:

```bash
npx @devcontainers/cli build \
  --workspace-folder . \
  --config .devcontainer/claude-code/devcontainer.json
```

This builds the image — including feature installation — without starting a container. Subsequent `scx up claude-code` will reuse the cached layers and start quickly. The slim template does not need this step; it pulls a pre-built image from GHCR.

## Project Layout

After running `scx init`, your project will look like:

```
<your-project>/
  .devcontainer/
    claude-code/
      devcontainer.json
```

Multiple templates coexist side by side. The downloaded `devcontainer.json` is the single source of truth — edit it directly if you need to customize.

## Template Images

Templates that ship a `Dockerfile` are built and published to the GitHub Container Registry automatically. The features-based `claude-code` template has no `Dockerfile` and therefore has no pre-built image — devcontainers handles installation via `devcontainer-features` at first build time.

**Published image name:** `ghcr.io/thaitype/sandcontainer-<id>:latest`

For example, the `claude-code-slim` template publishes to:

```
ghcr.io/thaitype/sandcontainer-claude-code-slim:latest
```

### How publishing works

A GitHub Actions workflow (`.github/workflows/publish-templates.yml`) triggers on every push to `main` that touches files under `templates/**`, plus on manual `workflow_dispatch`. It discovers which templates contain a `Dockerfile`, then builds and pushes a multi-arch image (`linux/amd64`, `linux/arm64`) for each one. Only the `:latest` tag is published.

### One-time visibility flip (required after first publish)

GHCR creates new packages as **private** by default. After the workflow runs for the first time for a template, a maintainer must make the package public manually:

```
GitHub → your profile → Packages → sandcontainer-<id>
  → Package settings → Change visibility → Public
```

This is a one-time step per template. Once public, the image can be pulled anonymously — end users do not need a GHCR account or `docker login`.

### devcontainer.json rule for templates

Templates that have a `Dockerfile` must reference the already-published image via `"image":` in their `devcontainer.json`. Using `"build":` or `"dockerFile":` is not allowed in a template, because the template travels to the end user as a plain JSON file — the user never sees the Dockerfile.

Correct (example using the slim template):

```json
{
  "name": "claude-code-slim",
  "image": "ghcr.io/thaitype/sandcontainer-claude-code-slim:latest",
  "remoteUser": "node"
}
```

Not allowed in a template:

```json
{
  "build": { "dockerfile": "Dockerfile" }
}
```

## License

MIT
