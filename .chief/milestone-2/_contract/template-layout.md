# Contract — Template Directory Layout & Image References

## Directory Structure

```
templates/
  <template-id>/
    devcontainer.json    # REQUIRED
    Dockerfile           # OPTIONAL — presence triggers image build
```

- `<template-id>` matches the `id` in `catalog.json` — lowercase slug `[a-z0-9][a-z0-9-]*`.
- `devcontainer.json` is always required (it's the payload the CLI downloads).
- `Dockerfile` is optional — a template may be purely image-based (pointing at a public registry) and skip the build pipeline.
- No other files are meaningful to milestone 2. `.dockerignore`, `README.md`, etc. may be added but are not contractually required.

## Image Naming

- Pattern: `ghcr.io/thaitype/sandcontainer-<template-id>:latest`
- Lowercase only (OCI requirement).
- Only `:latest` is published in milestone 2.
- The image name is derived mechanically from the template directory name — **no override mechanism** in milestone 2.

## Image Visibility

- All published images MUST be public.
- First-push visibility flip is a manual one-time action in the GHCR UI by the maintainer. The workflow does not script this.

## Multi-Arch

- Every published image MUST support both `linux/amd64` and `linux/arm64`.
- If a template's Dockerfile cannot build on arm64 (e.g. architecture-specific binaries), the template must be redesigned or the workflow updated per-template — no mixed-arch fallback in milestone 2.

## `devcontainer.json` Requirements (for templates with a Dockerfile)

- MUST reference the published GHCR image via `"image"`:
  ```json
  "image": "ghcr.io/thaitype/sandcontainer-<template-id>:latest"
  ```
- MUST NOT use `"build"` / `"dockerFile"` fields — the Dockerfile exists only for CI; end users never see it.
- SHOULD NOT carry a `postCreateCommand` duplicating tools that are preinstalled in the image.
- Other devcontainer spec fields (`remoteUser`, `mounts`, `features`, etc.) are unrestricted.

## `devcontainer.json` Requirements (for templates WITHOUT a Dockerfile)

- MUST reference a publicly pullable image via `"image"` (e.g. `mcr.microsoft.com/...` or another GHCR image).
- `postCreateCommand` and other customization is allowed.

## Dockerfile Requirements

- MUST build context-free: `docker build templates/<id>/` must succeed with no external context.
- SHOULD avoid assumptions about the user's host (no mounts, no host env vars referenced at build time).
- SHOULD be minimal — runtime setup (tokens, credentials) belongs in the running container, not baked in.
- MUST NOT include secrets of any kind.

## Catalog Coupling

- A template entry in `catalog.json` with `id: X` points at `templates/X/devcontainer.json` via its `url` field.
- If `templates/X/Dockerfile` exists, the workflow will also publish `ghcr.io/thaitype/sandcontainer-X:latest`.
- The catalog does NOT list image names — the image reference is carried inside the template's `devcontainer.json`. This keeps the catalog free of infrastructure details.

## Repo Dogfood — `.devcontainer/`

- The repo's own `.devcontainer/devcontainer.json` MUST reference the same published `ghcr.io/thaitype/sandcontainer-claude-code:latest` image used by the claude-code template.
- `.devcontainer/Dockerfile` is removed from the repo as part of milestone 2 (its content lives in `templates/claude-code/Dockerfile` now).
- This is a consequence of scope, not a separately configurable toggle.

## Out of Scope

- Private images.
- Image version negotiation (CLI pinning to a specific sha/tag).
- `:latest`-alternative tags.
- Per-template registry overrides.
- Build-arg threading from the workflow into the Dockerfile.
