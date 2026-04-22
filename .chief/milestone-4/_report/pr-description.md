# PR: Split `claude-code` into features-based and slim templates (Milestone 4)

Targets: `main`
Branch: `main.m4`
Commits: `646300c` (impl), `c55d460` (planning docs)
Version: `0.3.0` on release (breaking; `refactor!:` marker)

---

## Summary

- Renames the existing Dockerfile-based `claude-code` template to `claude-code-slim`.
- Adds a new features-based `claude-code` template using `mcr.microsoft.com/devcontainers/javascript-node:22` + `devcontainer-features/claude-code` + `features/github-cli`.
- Catalog lists both templates alphabetically with neutral descriptions; users pick the tradeoff that fits them (fast pre-built pull vs. familiar standard base).

No CLI source changes. All behavior lives in `templates/**`, `catalog.json`, the repo's dogfood config, and the docs.

## Breaking change

Existing installs that ran `scx init claude-code` on `0.2.x` have a local `.devcontainer/claude-code/devcontainer.json` pointing at `ghcr.io/thaitype/sandcontainer-claude-code:latest`. After this merges, that GHCR tag is no longer rebuilt, and will be deleted manually. Users must re-run `scx init claude-code` to get the new features-based config, or run `scx init claude-code-slim` to keep the pre-built image path.

## What changed

**Templates**
- `templates/claude-code/Dockerfile` → `templates/claude-code-slim/Dockerfile` (git-rename; byte-identical content).
- `templates/claude-code-slim/devcontainer.json` — image tag updated to `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest`.
- `templates/claude-code/devcontainer.json` — new file, features-based, full mount/env parity with the slim template.

**Catalog**
- `catalog.json` now has two entries (alphabetical, neutral descriptions, correct `url`s).

**Repo dogfood**
- `.devcontainer/claude-code/devcontainer.json` — directory name kept as `claude-code`; image tag updated to `sandcontainer-claude-code-slim:latest`.

**Docs**
- `README.md` — new two-template table plus a "choosing a template" section with neutral tradeoffs.
- `CHANGELOG.md` — `[0.3.0]` entry calling out the breaking change and re-init requirement.

**Planning artifacts (non-shipping)**
- `.chief/milestone-4/_goal/goal.md`, `.chief/milestone-4/_contract/template-parity.md`, updated `.chief/milestone-4/_report/grill-session.md`.

## Parity contract

`.chief/milestone-4/_contract/template-parity.md` locks what must stay identical between the two templates. Only three things may differ: `image`, presence of the `features` block, and presence of `Dockerfile` on disk. Everything else (`name`, `remoteUser`, `initializeCommand`, `containerEnv`, `mounts`, `workspaceFolder`) is byte-identical.

Verified on this branch:

```
$ diff templates/claude-code/devcontainer.json templates/claude-code-slim/devcontainer.json
3c3
<   "image": "mcr.microsoft.com/devcontainers/javascript-node:22",
---
>   "image": "ghcr.io/thaitype/sandcontainer-claude-code-slim:latest",
8,11d7
<   },
<   "features": {
<     "ghcr.io/anthropics/devcontainer-features/claude-code:1": {},
<     "ghcr.io/devcontainers/features/github-cli:1": {}
```

Only the three permitted differences.

## Non-goals (deliberately out of scope)

- No CLI source code changes. `src/**` stays content-agnostic.
- No changes to `.github/workflows/publish-templates.yml`. The existing matrix discovery filters on `Dockerfile` presence, so it auto-picks `claude-code-slim` and auto-skips the features-based `claude-code`.
- No auto-migration tooling or CLI deprecation warning. Users re-run `scx init claude-code` after upgrading.
- No automation for deleting the old GHCR image. Handled manually (see post-merge steps).
- No image signing / SBOM / provenance in this milestone.
- No changes to `.chief/_rules/_contract/filesystem.md`.

## Test plan

- [x] `templates/claude-code/` contains only `devcontainer.json`; `templates/claude-code-slim/` contains both `Dockerfile` and `devcontainer.json`.
- [x] `diff templates/claude-code/devcontainer.json templates/claude-code-slim/devcontainer.json` shows only `image` + `features` differ.
- [x] `jq . catalog.json` parses; both `url` fields point to the correct `templates/<id>/devcontainer.json` path on `main`.
- [x] `tsc --noEmit` passes; `eslint ./src` passes; `prettier --check` passes.
- [ ] On merge: `publish-templates.yml` runs the matrix with a single entry `claude-code-slim`, builds `linux/amd64,linux/arm64`, and pushes `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest`.
- [ ] Post-merge smoke test: `scx init claude-code` writes the new features-based config; `scx init claude-code-slim` writes the slim config; `scx list` shows both entries.
- [ ] Manual: `scx up claude-code` builds locally via features (slower first build); `scx up claude-code-slim` pulls the new GHCR image and starts quickly.

**Note on local test/build:** `vitest`/`tsup build` currently fail locally with `@rollup/rollup-linux-arm64-gnu: MODULE_NOT_FOUND`. Confirmed identical failure on the baseline commit (`50c18e3`) with no milestone-4 changes applied. This is a node_modules native-binary environment artifact (missing arm64 optional dependency), not caused by this PR. CI (Ubuntu x64) is unaffected, and the publish workflow does not run tests.

## Post-merge manual steps

1. **First-time only:** open the new `ghcr.io/thaitype/sandcontainer-claude-code-slim` package in GitHub UI and flip visibility to **public** (same one-time step done for the original image in Milestone 2).
2. Delete the old `ghcr.io/thaitype/sandcontainer-claude-code` image from GHCR. After this, any user still on `0.2.x` with a pre-existing init will see an image-pull error on `scx up claude-code` until they re-run `scx init`.
3. Cut the `0.3.0` release via release-it. The `refactor!:` + `BREAKING CHANGE:` commit will drive the bump automatically.
