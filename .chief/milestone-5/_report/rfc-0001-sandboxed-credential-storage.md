# RFC 0001: Sandboxed Credential Storage for Claude Code Templates

**Status:** Draft
**Author:** @thada
**Target:** `thaitype/sandcontainer`
**Affects:** `templates/claude-code`, `templates/claude-code-slim`

---

## Summary

Replace host bind mounts of `~/.claude/` and `~/.claude.json` with Docker named volumes. Introduce a `scripts/` convention inside each template for user-invoked helper scripts (e.g., one-time credential seeding across sandboxes). This change fixes a long-standing race condition that corrupts `~/.claude.json` when Claude Code runs concurrently on host and in container, and establishes a pattern for future templates that need auxiliary tooling without growing the `scx` CLI surface.

**This is a breaking change.** Existing users' in-container state will not carry over.

---

## Motivation

### The race condition

The current `claude-code` and `claude-code-slim` templates both mount host files directly into the container:

```jsonc
"mounts": [
  "source=${localEnv:HOME}/.claude,target=/home/node/.claude,type=bind",
  "source=${localEnv:HOME}/.claude.json,target=/home/node/.claude.json,type=bind",
  "source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"
]
```

Claude Code rewrites `~/.claude.json` on nearly every action — project registration, session metadata, telemetry counters, trust prompts. The file is rewritten in whole; there is no atomic swap or locking.

When a user runs Claude Code on the host **and** inside a sandboxed container simultaneously (a common pattern for anyone evaluating sandboxing), both processes race to rewrite the same file through the bind mount. The observed failure mode:

```
Configuration Error
The configuration file at /home/node/.claude.json contains invalid JSON.
```

The file is left mid-write — a partial JSON blob that neither side can parse. Recovery requires manual editing or deletion, and deletion wipes project registration and trust state on **both** host and container.

### Secondary issues with the current design

Even without the race, bind-mounting `~/.claude/` creates:

1. **Sandbox escape surface.** A prompt injection that tricks Claude into writing to `~/.claude/settings.json` or adding a malicious MCP server affects the host install immediately. The sandbox boundary is porous.
2. **Cross-project state bleed.** `projects/`, `todos/`, and session history from host and all containers pile into one directory, with paths that don't resolve across environments.
3. **Credential storage confusion on macOS.** macOS stores OAuth credentials in Keychain (not `~/.claude/.credentials.json`), so mounting the directory doesn't actually share login state the way users expect. This leads to surprise `claude login` prompts inside containers despite the mount.

### Why not just document "don't run both"

That advice doesn't match real usage. Users open a sandbox *to try something risky* while keeping the host session running for everything else. "Use only one at a time" defeats the purpose.

---

## Goals

- Eliminate the `.claude.json` race condition entirely.
- Give each sandboxed project its own isolated state.
- Allow multiple sandboxes to run concurrently without interference.
- Allow credentials to be shared across sandboxes so users log in once per machine.
- Do not leak sandbox state back to the host.
- Keep the `scx` CLI surface unchanged — no template-specific subcommands.

## Non-goals

- Backward compatibility with the existing bind-mount layout. Existing users will rebuild.
- Cross-platform credential extraction from host (macOS Keychain, Windows DPAPI). Users log in once inside a sandbox instead.
- Auto-syncing refreshed tokens across sandboxes. Manual sync via helper script is acceptable.
- Solving this for non-Claude-Code templates. The `scripts/` convention is generic, but its adoption is per-template.

---

## Proposal

### 1. New mount layout

Replace both templates' `mounts` blocks with:

```jsonc
"mounts": [
  "source=claude-sandbox-creds,target=/home/node/.claude-shared,type=volume",
  "source=claude-sandbox-state-${localWorkspaceFolderBasename},target=/home/node/.claude,type=volume",
  "source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"
]
```

Two named volumes:

- **`claude-sandbox-creds`** — shared across all projects. Holds one file: `.credentials.json`. Used as a seed source only.
- **`claude-sandbox-state-<project>`** — unique per workspace folder name. Holds full Claude Code state (`.claude.json`, `projects/`, `todos/`, `settings.json`, and a project-local `.credentials.json`).

The host's `~/.claude/` and `~/.claude.json` are no longer mounted. `initializeCommand` (which currently touches those files on the host) is removed.

### 2. `postCreateCommand` seeds credentials on first run

```jsonc
"postCreateCommand": "bash -c 'mkdir -p /home/node/.claude && if [ ! -f /home/node/.claude/.credentials.json ] && [ -f /home/node/.claude-shared/.credentials.json ]; then cp /home/node/.claude-shared/.credentials.json /home/node/.claude/.credentials.json && chmod 600 /home/node/.claude/.credentials.json; fi'"
```

Logic: if this project's state volume does not yet have credentials AND the shared volume has them, seed from shared. Otherwise do nothing (first-ever run → user will `claude login` inside the container).

### 3. `scripts/` convention inside each template

Each template directory gains a `scripts/` folder alongside `devcontainer.json`:

```
templates/claude-code-slim/
  Dockerfile
  devcontainer.json
  scripts/
    sync-creds.sh
    README.md
```

Content of `sync-creds.sh`:

```bash
#!/usr/bin/env bash
# Copy this container's credentials to the shared volume so other
# sandboxed projects can seed from them on their first run.
set -euo pipefail

SRC=/home/node/.claude/.credentials.json
DST=/home/node/.claude-shared/.credentials.json

if [ ! -f "$SRC" ]; then
  echo "No credentials at $SRC. Run 'claude login' first." >&2
  exit 1
fi

cp "$SRC" "$DST"
chmod 600 "$DST"
echo "Synced credentials to shared volume."
```

Content of `scripts/README.md` explains when to run each script.

User invocation uses existing `scx exec`:

```bash
scx exec claude-code-slim bash scripts/sync-creds.sh
```

No new `scx` subcommands. No changes to the CLI. Scripts live beside the template and ship with it.

### 4. Document the `scripts/` convention as a template pattern

Add a section to the repo's template authoring guide (or `README.md` if none exists):

> Templates MAY include a `scripts/` directory containing helper shell scripts invoked via `scx exec <id> bash scripts/<name>.sh`. Scripts live alongside `devcontainer.json` and are downloaded by `scx init`. This keeps template-specific tooling out of the `scx` CLI.

Also update `scx init` to copy the `scripts/` directory (if present) alongside `devcontainer.json`. Today `scx init` only fetches `devcontainer.json`; this needs to change to fetch the template directory as a unit.

---

## Detailed design

### Flow: first sandbox ever on this machine

1. User runs `scx init claude-code-slim && scx up claude-code-slim`
2. Both named volumes are created empty by Docker
3. `postCreateCommand` runs: no credentials anywhere → no-op
4. User runs `scx exec claude-code-slim claude` → prompted to `claude login`
5. Login completes; credentials land in `claude-sandbox-state-<project>/.credentials.json`
6. User runs `scx exec claude-code-slim bash scripts/sync-creds.sh` once
7. Credentials copied to `claude-sandbox-creds/.credentials.json`

### Flow: second sandbox on the same machine

1. User runs `scx init claude-code-slim && scx up claude-code-slim` in a different project
2. `claude-sandbox-creds` already exists; `claude-sandbox-state-<new-project>` is created empty
3. `postCreateCommand` sees shared has credentials, project doesn't → seeds
4. User runs `scx exec claude-code-slim claude` → logged in immediately

### Flow: token refresh

Claude Code refreshes the OAuth token roughly every 60 days. On refresh, the new token is written to this container's `.credentials.json` — i.e., the per-project state volume. Other sandboxes keep using the old token (still valid) until their own refresh.

If a user wants the refreshed token available to new sandboxes they create later, they rerun `scripts/sync-creds.sh`. This is explicit and manual, and the RFC accepts that trade-off: token refresh is rare, and making it automatic risks races that defeat the original fix.

### Flow: running two sandboxes concurrently

Each sandbox has its own state volume. Their `.claude.json` files are independent. No race.

### Volume naming

`${localWorkspaceFolderBasename}` is the mechanism for per-project uniqueness. Limitation: two projects named `app` in different paths will collide. This is documented as a known limitation; users can rename one project or customize the volume name in their local `devcontainer.json` copy.

### `scx init` changes

`scx init` currently fetches one file: `templates/<id>/devcontainer.json` from the catalog. It must be extended to fetch the entire template directory (currently just `devcontainer.json`, optionally `scripts/*`). Two implementation options:

1. **Catalog lists template files explicitly.** Catalog JSON adds a `files: [...]` array per template. `scx init` iterates.
2. **Convention-based fetch.** `scx init` tries `devcontainer.json` (required) and `scripts/README.md` (optional sentinel). If the sentinel exists, fetch the whole `scripts/` directory — requires knowing directory contents, which GitHub's raw-file CDN doesn't support without a tree API call.

Option 1 is simpler and more explicit. Recommended.

---

## Breaking change & migration

This RFC is explicit that **backward compatibility is not preserved**. Rationale:

- The current behavior is broken (races corrupt `.claude.json`). Preserving it with a flag encourages users to stay on a broken configuration.
- Supporting both layouts via a `--legacy` flag would require CLI-level logic that sandcontainer currently doesn't have (`scx` doesn't interpret template internals today), which is a larger architectural change than the fix warrants.
- Versioned template IDs (`claude-code-v2`) double the catalog and confuse new users about which to pick.

**Migration instructions for existing users** (to include in release notes):

1. Run `scx rebuild claude-code-slim` after updating — old bind mounts are replaced with volumes.
2. State from the old setup remains on the host at `~/.claude/` and `~/.claude.json` — untouched. Host Claude Code keeps working.
3. Inside the new sandbox, run `claude login` once. Then `bash scripts/sync-creds.sh` once to share credentials with future sandboxes.
4. Host `~/.claude.json` corruption (if any) can be recovered by copying the version from the container's state volume, or by `claude login` on the host.

A changelog entry should call this out as BREAKING with a link to the migration section.

---

## Alternatives considered

### A. Keep bind mounts, document "don't run concurrently"

Rejected. The sandboxing use case specifically involves running both.

### B. Bind-mount only `.credentials.json`, not `.claude.json`

Would avoid the race (credentials file is rarely written) and preserve login sharing. But:

- On macOS, `.credentials.json` doesn't exist on the host (Keychain).
- On Linux, this works but leaves state bleed and sandbox escape problems.
- Cross-platform inconsistency is worse than a unified volume-based approach.

### C. Single shared volume for all sandboxes

Simpler config, one volume only. But concurrent sandboxes race on `.claude.json` inside the volume — just moves the bug from host-vs-container to container-vs-container.

### D. Add `scx sync-creds` as a first-class subcommand

Rejected. Makes `scx` aware of Claude-Code-specific semantics. Future templates (`copilot`, `cursor`) would each want their own subcommand, and `scx` grows into a template-specific launcher instead of a generic catalog CLI. The `scripts/` convention keeps the CLI minimal.

### E. Extract credentials from host Keychain / DPAPI via `initializeCommand`

Possible on macOS (`security find-generic-password`), awkward on Linux (varies by keyring), and different again on Windows. Adds platform-specific branching. Users logging in once inside a sandbox is simpler and works identically everywhere.

---

## Open questions

1. **Is `${localWorkspaceFolderBasename}` unique enough in practice?** Two projects with the same folder name will share a state volume. Should the RFC mandate a hash of the full workspace path instead? Trade-off: readability (`claude-sandbox-state-my-app` vs `claude-sandbox-state-a3f8c1`).

2. **Should `scx init` support a `--with-scripts` flag, or always fetch scripts when present?** Always-fetch is simpler; flag is more explicit.

3. **Do we want a `scx rm-creds` / cleanup command?** Today users run `docker volume rm claude-sandbox-creds` manually. Exposing it as a CLI command risks the "Claude-specific launcher" creep again, but it's discoverable. Suggest leaving out of this RFC and revisiting.

4. **Template `claude-code` vs `claude-code-slim` — keep both or consolidate?** They now differ only in base image. The duplication cost rises with every template change (including this one). Out of scope for this RFC, but worth flagging as a follow-up.

---

## Rollout

- **PR 1:** Update both templates (`claude-code`, `claude-code-slim`) with new mounts and `postCreateCommand`. Add `scripts/sync-creds.sh` and `scripts/README.md` to each.
- **PR 2:** Update `scx init` to fetch template files per catalog manifest (not just `devcontainer.json`).
- **PR 3:** Update catalog schema and entries to list template files.
- **PR 4:** Update `README.md` with migration notes, credential sharing flow, and the `scripts/` convention for template authors.

PRs 2 and 3 are prerequisites for the `scripts/` folder to actually reach users via `scx init`. PR 1 alone works for users who edit their local `devcontainer.json` directly or re-clone the template manually, so the template change can ship independently if CLI changes are delayed.

---

## Appendix: full example `devcontainer.json` (claude-code-slim)

```jsonc
{
  "name": "claude-code-slim",
  "image": "ghcr.io/thaitype/sandcontainer-claude-code-slim:latest",
  "remoteUser": "node",
  "mounts": [
    "source=claude-sandbox-creds,target=/home/node/.claude-shared,type=volume",
    "source=claude-sandbox-state-${localWorkspaceFolderBasename},target=/home/node/.claude,type=volume",
    "source=${localEnv:HOME}/.gitconfig,target=/home/node/.gitconfig,type=bind,readonly"
  ],
  "postCreateCommand": "bash -c 'mkdir -p /home/node/.claude && if [ ! -f /home/node/.claude/.credentials.json ] && [ -f /home/node/.claude-shared/.credentials.json ]; then cp /home/node/.claude-shared/.credentials.json /home/node/.claude/.credentials.json && chmod 600 /home/node/.claude/.credentials.json; fi'",
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}"
}
```
