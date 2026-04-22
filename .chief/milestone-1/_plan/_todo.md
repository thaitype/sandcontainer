# Milestone 1 — TODO

Five tasks. Executed sequentially; each depends on the previous.

- [ ] **task-1: Scaffold CLI package and shell**
  Add deps (`citty`, `zod`, `execa`), configure `package.json` with `sandcontainer` + `scx` bin entries pointing at the built JS entry. Replace `src/main.ts` with a citty root command supporting `--version` / `--help` and stub subcommands (`init`, `list`, `up`, `exec`, `rebuild`, `down`) that print "not implemented" for now. Update `tsup` build config to produce an executable bin. Ensure `pnpm lint`, `pnpm test:ci`, and `pnpm build` all pass on an empty project.

- [ ] **task-2: Catalog module**
  Implement `src/catalog.ts`: Zod schemas (envelope + `TemplateEntry` discriminated union on `kind`), hard-coded catalog URL constant, `fetchCatalog()` with the exact error-message contract from `_contract/catalog-schema.md`, and `findTemplate(catalog, id)` helper. Unit tests in `src/catalog.test.ts` mocking `fetch` — cover: happy path, HTTP non-200, invalid JSON, Zod failure, network error, unknown `kind`, unknown `version`, duplicate ids.

- [ ] **task-3: `init` and `list` commands**
  Wire `init <id> [--force]` per `_contract/cli-surface.md`: fetch catalog, find entry, pre-check target file, fetch + JSON.parse the `devcontainer.json`, mkdir-p, write, print confirmation. Wire `list` to scan `.devcontainers/` subdirs with a `devcontainer.json`, sort, print (or `No templates found.`). Unit tests in `src/commands/init.test.ts` and `src/commands/list.test.ts` using tmp dirs and mocked `fetch`.

- [ ] **task-4: Forwarder commands (`up`, `exec`, `rebuild`, `down`)**
  Implement the four forwarders per `_contract/cli-surface.md`'s "How Forwarding Works" section. Handler reads `process.argv` directly, locates `<id>`, forwards the tail to `@devcontainers/cli` (or `docker` for `down`) via `execa` in inherit-stdio mode, propagating exit codes. Pre-flight check: error if `.devcontainers/<id>/devcontainer.json` does not exist. Unit tests mocking `execa` — verify argv construction including `--workspace-folder` injection, `rebuild` → `up --remove-existing-container`, forwarded flags like `--dangerously-skip-permissions` pass through untouched.

- [ ] **task-5: Seed catalog and first-party template**
  Create `/catalog.json` at repo root with one real entry (`claude-code`, kind `devcontainer`, url pointing at `raw.githubusercontent.com/thaitype/sandcontainer/main/templates/claude-code/devcontainer.json`). Create `/templates/claude-code/devcontainer.json` based on the existing `package.json` sandbox scripts (Dockerfile-driven claude sandbox). Update the top-level README with the installation + usage examples from `_contract/cli-surface.md`. Verify `pnpm build && node dist/main.js init claude-code` works end-to-end in a scratch directory (Builder-level smoke; full Docker run is Tester's call later).
