# Milestone 3 — TODO

One consolidated task. The fix is small and cross-cutting; splitting it would create artificial ordering between files that must change together to keep the test suite green.

- [ ] **task-10: Rename on-disk layout from `.devcontainers/<id>/` to `.devcontainer/<id>/` and rewire forwarders**
  Rename the sandcontainer-managed directory from `.devcontainers/<id>/` (plural) to `.devcontainer/<id>/` (singular) across `init.ts`, `list.ts`, `up.ts`, `exec.ts`, `rebuild.ts`, `down.ts` and their `.test.ts` files. Switch forwarders to pass `--workspace-folder <repoRoot>` plus `--config <abs-path>` to `@devcontainers/cli` for `up` / `exec` / `rebuild`. Rewrite `down` to match containers via the dual docker label (`devcontainer.local_folder=<repoRoot>` + `devcontainer.config_file=<configPath>`). Update user-facing strings (errors, stdout confirmations). Create `.chief/_rules/_contract/filesystem.md` capturing the new convention. Update `README.md` examples. Commit using conventional-commit format with a `BREAKING CHANGE:` footer so release-it produces a v0.2.0 CHANGELOG entry. Full spec in `task-10.md`.
