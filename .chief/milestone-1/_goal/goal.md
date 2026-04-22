# Milestone 1 — Sandcontainer v0.1 (Phase 1)

## Overview

Catalog-driven CLI for distributing devcontainer configurations. Thin wrapper around `@devcontainers/cli`: resolves template IDs from a remote catalog, downloads `devcontainer.json` into `.devcontainers/<template-id>/`, and forwards lifecycle commands.

Content-agnostic — Sandcontainer does not know about AI agents, databases, or ML stacks. It only moves config files and invokes `@devcontainers/cli`.

## Scope

Milestone 1 delivers the full Phase 1 feature set:

- Catalog fetch + schema validation
- `init <id>` — download template into `.devcontainers/<id>/`
- `list` — show local templates
- `up <id>` / `exec <id> [...args]` / `rebuild <id>` / `down <id>` — forward to `@devcontainers/cli`

## Catalog

- **Source:** `https://raw.githubusercontent.com/thaitype/sandcontainer/main/catalog.json` (hard-coded, not user-configurable)
- **Hosted in this repo** as `/catalog.json`
- **No local cache** — fetched fresh on every invocation that needs it
- **Envelope:** `{ version: 1, templates: Entry[] }` — the `version` field is the forward-compat escape hatch: if a future CLI ships a breaking catalog schema, it can refuse unknown envelope versions and ask the user to upgrade. Tag-pinning is deferred until that is actually needed.

### Template Entry Schema

```ts
{
  id: string,                // slug, unique within the catalog
  name: string,              // display name
  description: string,
  tags?: string[],
  kind: "devcontainer",      // discriminator for future backends
  url: string                // URL to the devcontainer.json payload
}
```

Zod validation with discriminated union on `kind` so future backends (`dockerfile`, `compose`) can be added without breaking existing catalogs. Phase 1 supports only `kind: "devcontainer"`.

### Template Payload

- **URL-referenced only** in Phase 1 (no inline payloads)
- First-party templates live at `/templates/<id>/devcontainer.json` in this repo
- On download, Sandcontainer performs a `JSON.parse` sanity check only — no schema validation of the `devcontainer.json` itself (that is `@devcontainers/cli`'s job)

## Commands

### `init <id> [--force]`
1. Fetch catalog, find entry by `id` (error if missing).
2. Fetch `entry.url`, parse as JSON (error if malformed).
3. Write to `.devcontainers/<id>/devcontainer.json`.
4. If the target file already exists: **error and exit non-zero** unless `--force` is passed.

### `list`
- Scans local `.devcontainers/` directory.
- Lists every subdirectory that contains a `devcontainer.json`.
- Phase 1 does **not** show remote catalog entries.

### `up <id> [...args]` / `exec <id> [...args]` / `rebuild <id> [...args]` / `down <id> [...args]`
- Everything after `<id>` is forwarded verbatim to `@devcontainers/cli`.
- Sandcontainer auto-injects `--workspace-folder .devcontainers/<id>`.
- `rebuild` maps to `@devcontainers/cli up --remove-existing-container`.
- Sandcontainer does not own any other flag for these commands.

## Project Layout in User Projects

```
<user-project>/
  .devcontainers/
    claude-code/
      devcontainer.json
    copilot/
      devcontainer.json
```

- No marker file, no state, no overrides.
- The downloaded `devcontainer.json` is the single source of truth — users edit it directly if needed.
- Multiple templates coexist side by side.

## Tech Stack

- **Runtime:** Node (>=20)
- **Language:** TypeScript (ESM)
- **Package manager:** pnpm
- **CLI framework:** `citty`
- **Interactive UX:** `@clack/prompts` (as needed)
- **Validation:** Zod (discriminated union on `kind`)
- **Subprocess spawning:** `execa`
- **Testing:** Vitest (unit only in milestone 1)
- **Build:** tsup (ESM + CJS)
- **Lint/format:** ESLint + Prettier (existing setup)

## Distribution

- Published to npm as `sandcontainer`
- Install via `npm install -g sandcontainer` or run via `npx sandcontainer`
- Two bin entries pointing at the same JS file:
  - `sandcontainer` (discoverability)
  - `scx` (daily use)

## Platforms

macOS, Linux; Windows via WSL2.

## Testing Scope (Milestone 1)

- **Unit tests only.** Mock `fetch` and `execa`; test against tmp dirs.
- Covered: catalog parsing, template lookup, path resolution, `init` write behavior (including `--force`), forwarder argument construction, `list` scan logic.
- Integration tests (real Docker, real network) are **out of scope** for milestone 1 and only run on explicit Tester request.

## Out of Scope (Milestone 1)

- User-defined catalog sources
- Remote template discovery (`catalog`/`search` command)
- Catalog caching
- Inline `devcontainer.json` payloads
- Non-`devcontainer` kinds (`dockerfile`, `compose`, etc.)
- Schema validation of the downloaded `devcontainer.json`
- Windows native (non-WSL) support
