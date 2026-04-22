**Design Spec — Sandcontainer (v0.1) — Phase 1**

**Overview**
- Catalog-driven CLI for distributing devcontainer configurations
- Thin wrapper around `@devcontainers/cli` — resolves template IDs from the catalog, downloads `devcontainer.json` into `.devcontainers/<template-id>/`, forwards lifecycle commands
- Content-agnostic: doesn't know about AI agents, databases, ML stacks, etc. — only moves config files and invokes devcontainer CLI

**Template Schema**
- JSON entry with `id`, `kind` (backend selector), and kind-specific fields
- Phase 1 supports `kind: "devcontainer"` only — payload is a `devcontainer.json` (inline or URL-referenced) + optional metadata (name, description, tags)
- Discriminated union on `kind` so future backends (`dockerfile`, `compose`, etc.) can be added without breaking existing catalogs

**Catalog Source**
- Plain JSON file hosted at a reachable URL (git raw, gist, own server)
- One **official catalog URL** hard-coded in source — fetched on demand, cached locally, not user-configurable
- User-defined additional sources: out of scope for phase 1

**Commands & Project Layout**
- `init <template-id>` — fetch template, write to `.devcontainers/<template-id>/devcontainer.json`
- No marker file, no state, no overrides — downloaded config is the single source of truth; user edits it directly if needed
- Projects can hold multiple templates side by side (e.g. `.devcontainers/copilot/`, `.devcontainers/claude-code/`)
- `list` — scan local `.devcontainers/` folder, show available templates
- `up <template-id>` / `exec <template-id> <cmd>` / `rebuild <template-id>` / `down <template-id>` — all forward to `@devcontainers/cli` with workspace folder pointing at `.devcontainers/<template-id>/`

**Tech Stack**
- TypeScript + Bun runtime
- `citty` for CLI, `@clack/prompts` for interactive UX
- Zod for catalog validation (discriminated unions on `kind`)
- `execa` for spawning external processes
- Distributed via npm (`npm install -g sandcontainer` or `npx sandcontainer`)
- Platforms at launch: macOS, Linux; Windows via WSL2
