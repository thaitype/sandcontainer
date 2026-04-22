# Milestone 2 — TODO

Four tasks. Tasks 6 and 7 can run in parallel; task 8 depends on task 6; task 9 is last.

- [ ] **task-6: Port Dockerfile to `templates/claude-code/`**
  Copy the hardened setup from `.devcontainer/Dockerfile` into `templates/claude-code/Dockerfile`. Strip repo-specific bits (pnpm global setup, Sandcontainer workspace assumptions, any env vars tied to this project). Keep: base image, `gh`/`git`/`curl`/`ca-certificates`/`sudo`/`bash`, passwordless sudo for `node`, `npm install -g @anthropic-ai/claude-code`. Verify `docker build templates/claude-code/` succeeds locally for at least `linux/amd64`. Do NOT delete `.devcontainer/Dockerfile` yet — that happens in task-8 after the image is published.

- [ ] **task-7: Add `publish-templates.yml` workflow**
  Create `.github/workflows/publish-templates.yml` matching `_contract/publish-workflow.md` exactly: two jobs (`discover` → `publish`), path-filtered push + workflow_dispatch triggers, `contents: read` + `packages: write` permissions, per-template concurrency with `cancel-in-progress`, matrix discovery shell script, multi-arch `linux/amd64,linux/arm64` build with GHA layer cache keyed per template, `:latest` tag only. Use pinned major versions of `actions/checkout@v4`, `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v6`. Do NOT add lint/test steps. Verify YAML validity (e.g. `yamllint` or via `gh workflow view` after a dry-run commit on a branch); do not merge.

- [ ] **task-8: Update template + repo devcontainer.json to reference published image**
  Rewrite `templates/claude-code/devcontainer.json` to use `"image": "ghcr.io/thaitype/sandcontainer-claude-code:latest"`, drop `postCreateCommand`, keep only fields that still make sense (`name`, `remoteUser`, etc. per `_contract/template-layout.md`). Rewrite `.devcontainer/devcontainer.json` to reference the same published image. Delete `.devcontainer/Dockerfile` (its content has moved to `templates/claude-code/Dockerfile` in task-6). Note: the published image must exist in GHCR with public visibility before this change is useful; do not block the merge on that, but flag in the commit body that a one-time manual visibility flip in the GHCR UI is required after the first workflow run.

- [ ] **task-9: README and docs update**
  Add a section to the top-level README covering: (a) that template images are published to `ghcr.io/thaitype/sandcontainer-<id>:latest` via GitHub Actions on push to `main` with changes under `templates/**`; (b) the one-time manual visibility flip requirement per image; (c) the rule that templates with a Dockerfile must reference the published image via `image:` in their `devcontainer.json` (no `build:`/`dockerFile:`). Keep it tight — existing README sections should not be rewritten, only extended. No code changes.
