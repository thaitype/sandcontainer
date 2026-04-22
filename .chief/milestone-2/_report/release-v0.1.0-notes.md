# v0.1.0 — First Public Release

Sandcontainer is a catalog-driven CLI for distributing devcontainer configurations. Install it, pick a template, and have a fully-provisioned sandbox container running in one command.

## Quick Start

```bash
# no install
npx sandcontainer init claude-code && npx sandcontainer up claude-code

# global install
npm i -g sandcontainer
scx init claude-code && scx up claude-code

# pnpm
pnpm dlx sandcontainer init claude-code
```

Then drop into the container:

```bash
scx exec claude-code bash
# or run Claude Code directly
scx exec claude-code claude --dangerously-skip-permissions
```

## What's in this release

### Commands

- `init <id> [--force]` — download a template's `devcontainer.json` into `.devcontainers/<id>/`
- `list` — show local templates in `.devcontainers/`
- `up <id>` / `exec <id>` / `rebuild <id>` / `down <id>` — forward to `@devcontainers/cli`, with transparent pass-through of devcontainer flags and the exec'd command's flags (works just like `docker run`)
- Two bin names: long (`sandcontainer`) and short (`scx`)

### Catalog

- Zod-validated catalog schema with discriminated-union `kind` field — future template types (Dockerfile, Compose) can ship without breaking existing catalogs
- Official catalog hosted at `raw.githubusercontent.com/thaitype/sandcontainer/main/catalog.json`, fetched fresh on every invocation

### Templates

- First-party `claude-code` template — hardened Node 22 base with `gh`, `git`, passwordless sudo for `node`, and `@anthropic-ai/claude-code` preinstalled
- Template images built multi-arch (`linux/amd64` + `linux/arm64`) and published to GHCR via GitHub Actions on every push to `main` that touches `templates/`
- Image naming: `ghcr.io/thaitype/sandcontainer-<template-id>:latest`

## Known Limitations

- **GHCR visibility:** newly-published images start private by default. The maintainer must flip visibility to public once per image in the GitHub Packages UI before anonymous `scx up` works.
- **One template so far** (`claude-code`) — more to come; contributions welcome.
- **No catalog caching** — every `init` does a fresh fetch. Acceptable for now; revisit if GitHub raw rate limits bite.
- **No remote template discovery** — `list` shows only local templates. Browse templates via the catalog JSON for now.
- **No schema validation** of the downloaded `devcontainer.json` itself — Sandcontainer only checks it parses as JSON. `@devcontainers/cli` validates the real schema at `up` time.

## Platforms

macOS, Linux, Windows via WSL2. Requires Node ≥20 and Docker.

## Links

- Source: https://github.com/thaitype/sandcontainer
- npm: https://www.npmjs.com/package/sandcontainer
- Catalog: https://github.com/thaitype/sandcontainer/blob/main/catalog.json
- Template images: https://github.com/thaitype?tab=packages&repo_name=sandcontainer
