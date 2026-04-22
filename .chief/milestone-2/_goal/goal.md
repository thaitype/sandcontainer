# Milestone 2 — Publish Template Images to GHCR

## Overview

Add a GitHub Actions workflow that builds each template's Dockerfile and publishes the resulting image to GitHub Container Registry (GHCR). Template `devcontainer.json` files reference the published image directly, restoring the ability to ship hardened/custom base images that were lost in milestone 1 when templates were forced to use public upstream images.

No CLI code changes. Milestone 2 is CI + Docker + template JSON + README.

## Scope

- One reusable GitHub Actions workflow that discovers `templates/*/Dockerfile`, builds each, and pushes to GHCR
- Port the existing hardened Dockerfile from `.devcontainer/Dockerfile` to `templates/claude-code/Dockerfile`, stripping repo-specific bits
- Update `templates/claude-code/devcontainer.json` to reference the published image
- Update the repo's own `.devcontainer/devcontainer.json` to reference the same published image (dogfooding)
- README updates explaining the GHCR publishing flow

## Non-Goals

- No OCI-artifact catalog (`catalog.json` continues to ship via `raw.githubusercontent.com`)
- No CLI changes
- No image signing / SBOM / provenance attestation (future milestone if needed)
- No tag-based releases; only `:latest`
- No lint/test gating in this workflow (separate future CI concern)
- No automated visibility flip; public visibility is set once per image manually in GHCR UI

## Image Naming

- Pattern: `ghcr.io/thaitype/sandcontainer-<template-id>:latest`
- Milestone 2 ships one image: `ghcr.io/thaitype/sandcontainer-claude-code:latest`
- All published images are **public** (manual first-time UI flip)

## Workflow Behavior

- **File:** `.github/workflows/publish-templates.yml`
- **Triggers:**
  - `push` to `main` with path filter `templates/**` and `.github/workflows/publish-templates.yml`
  - `workflow_dispatch` (manual run button)
- **Discovery:** enumerate `templates/*/Dockerfile` — each directory with a `Dockerfile` becomes a matrix job
- **Per-job steps:**
  1. Checkout
  2. Set up QEMU + docker buildx
  3. Login to GHCR with `GITHUB_TOKEN`
  4. Build + push multi-arch (`linux/amd64`, `linux/arm64`), tag `:latest`, with GHA layer cache (`type=gha`)
- **Permissions:** `contents: read`, `packages: write`
- **Concurrency:** per-template concurrency key, `cancel-in-progress: true` — avoid overlapping pushes of the same image
- Templates **without** a Dockerfile (pure image-based) are simply excluded from the matrix; not an error

## Template Changes

### `templates/claude-code/Dockerfile` (new)

Ported from `.devcontainer/Dockerfile` with repo-specific bits removed. Preserved hardening:

- Base image: `mcr.microsoft.com/devcontainers/javascript-node:22-bookworm` (or whatever `.devcontainer/Dockerfile` currently uses)
- `gh` CLI, `git`, `curl`, `ca-certificates`, `sudo`, `bash`
- Passwordless sudo for `node` user
- `npm install -g @anthropic-ai/claude-code` at image-build time
- No workspace mounts, no pnpm-specific setup, no repo-specific env vars

### `templates/claude-code/devcontainer.json` (updated)

```json
{
  "name": "Claude Code",
  "image": "ghcr.io/thaitype/sandcontainer-claude-code:latest",
  "remoteUser": "node"
}
```

Drop `postCreateCommand` (claude-code is preinstalled), drop the public-image reference, keep only fields that still make sense.

### `.devcontainer/devcontainer.json` (repo dogfood, updated)

Replace current content with a reference to the published image. Keep any repo-specific mounts/settings required for local development of Sandcontainer itself. `.devcontainer/Dockerfile` can be removed once dogfooding is verified.

## Publication Flow

1. PR merges to `main` with a change under `templates/**`
2. Workflow fires, builds + pushes `ghcr.io/thaitype/sandcontainer-claude-code:latest`
3. First-time only: maintainer opens the package settings in GitHub UI and flips visibility to public
4. End users running `scx up claude-code` now pull the hardened GHCR image via `@devcontainers/cli`

## Requirements Respected

- Catalog URL hard-coded in CLI (milestone 1 decision) — unchanged
- CLI content-agnostic (AGENTS.md) — unchanged; the CLI does not know about GHCR
- Runs on macOS, Linux, Windows/WSL2 — covered by multi-arch amd64+arm64

## Out of Scope (Milestone 2)

- Additional templates beyond `claude-code`
- Image signing (`cosign`) / attestation
- Automatic visibility flips
- Per-SHA tags, semver tags, or tag-on-release workflow
- Pull-through CI gates (lint/test/build before image publish)
- OCI-hosted catalog.json
- CLI-level OCI auth or pull logic
