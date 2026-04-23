# Deferred: Host-Env Injection for Copilot Templates

**Milestone:** 5
**Decision:** defer
**Related:** `_report/rfc-0001-sandboxed-credential-storage.md`

---

## The problem

GitHub Copilot CLI authenticates via `$GH_TOKEN`. In practice users get that token from `gh auth token` on the host. The copilot templates declare `"containerEnv": { "GH_TOKEN": "${localEnv:GH_TOKEN}" }`, which requires `$GH_TOKEN` to be set in the caller's shell before `scx up`/`exec`/`rebuild` is invoked.

The ergonomic answer would be for `scx` to run `gh auth token` itself on behalf of copilot templates, so users don't have to prefix `GH_TOKEN=$(gh auth token)` onto every invocation.

## Why we considered it in milestone 5

Auto-injection came up during grill-me:

- User: "we need `GH_TOKEN=$(gh auth token)` in spec"
- Proposal explored: add `secrets: [{ name, from }]` to catalog entries; `scx init` snapshots them to a sidecar; `scx up/exec/rebuild` runs the `from` command and injects stdout as env.

## Why we're deferring

RFC 0001 (sandboxed credential storage) proposes:

1. Templates ship multi-file bundles (`devcontainer.json` + `Dockerfile` + `scripts/`).
2. Catalog entries gain a `files: [...]` manifest.
3. `scx init` fetches the whole template directory per that manifest.
4. Per-template helpers live in `scripts/`, invoked via `scx exec <id> bash scripts/<name>.sh`.
5. The `scx` CLI stays generic — no template-specific subcommands, no template-specific data fields.

A milestone-5 `secrets` field (declarative, CLI-interpreted) would be a parallel mechanism to RFC 0001's file manifest and would need to be reconciled when RFC 0001 lands. Specifically:

- It puts template-specific semantics ("run `gh auth token`") into the CLI — the exact creep Option D of RFC 0001 rejects.
- It adds a catalog field that could become redundant once `scripts/` can ship host-side helpers.
- It creates a second code path for "do something on the host before forwarding to `@devcontainers/cli`," when RFC 0001 will bring a more general one.

Building it now means writing code we'd either delete or dual-maintain.

## Milestone-5 behavior

- Templates use `"GH_TOKEN": "${localEnv:GH_TOKEN}"` — standard devcontainer substitution, no sandcontainer-specific fields.
- No catalog schema change.
- No CLI source change.
- README documents the invocation pattern: `GH_TOKEN=$(gh auth token) scx up copilot` (and for `exec`, `rebuild`).
- The copilot template rows in README call out the `GH_TOKEN` requirement so users aren't left guessing.

## Future direction (sketch; not committed)

When RFC 0001 lands, one candidate design for copilot auto-injection:

- Templates can ship a **host-side helper** (either in `scripts/` if RFC 0001's convention extends to host scripts, or via a clearly-documented `scx`-invoked hook).
- The helper is a shell snippet users invoke explicitly (e.g. via a shell alias or a wrapper command) — not implicit magic triggered by template name.
- Trust boundary stays the same as today: sandcontainer runs code from catalog-author templates, and users can inspect what runs before adopting a template.

We'll revisit concretely in whichever milestone follows RFC 0001. The shape depends on how the RFC's `scripts/` convention evolves (container-only vs. host-side too).

## Trade-off accepted

Short-term cost: users type `GH_TOKEN=$(gh auth token)` on every `scx up`/`exec`/`rebuild` for copilot templates. Documented, not invisible. Can be worked around with shell aliases locally.

Long-term gain: one coherent mechanism for "templates that need host context before container start," designed after RFC 0001 ships, not before.
