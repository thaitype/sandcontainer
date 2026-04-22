# Contract — CLI Surface

## Binary

Two bin entries in `package.json`, both resolving to the same compiled JS entrypoint:

- `sandcontainer`
- `scx`

## Global Flags

- `--help` / `-h` — print help for the command and exit `0`
- `--version` / `-v` — print CLI version from `package.json` and exit `0`

Every command supports `--help`.

## Exit Codes

- `0` — success
- `1` — any user-visible error (template not found, file exists without `--force`, catalog fetch failure, validation failure, etc.)
- Exit code of a forwarded `@devcontainers/cli` process is propagated verbatim for `up`/`exec`/`rebuild`/`down`.

## Output Conventions

- Normal output → `stdout`
- Error messages → `stderr`, prefixed with `error: `
- No color/TTY detection requirements in milestone 1 (keep it simple — can be added later)

---

## `init <id> [--force]`

Arguments:
- `<id>` — required positional. Must match a template `id` in the catalog.

Flags:
- `--force` — overwrite `.devcontainers/<id>/devcontainer.json` if it already exists

Steps:
1. Fetch + validate catalog.
2. Look up `id`. Missing → `error: Template "<id>" not found in catalog.` exit `1`.
3. Check `.devcontainers/<id>/devcontainer.json`. Exists AND no `--force` → `error: .devcontainers/<id>/devcontainer.json already exists. Use --force to overwrite.` exit `1`.
4. Fetch `entry.url`, JSON.parse.
5. `mkdir -p .devcontainers/<id>` (relative to cwd).
6. Write `.devcontainers/<id>/devcontainer.json`.
7. Print `Initialized template "<id>" at .devcontainers/<id>/devcontainer.json` to stdout.

---

## `list`

Arguments: none.
Flags: none (besides `--help`).

Steps:
1. Resolve `.devcontainers/` relative to cwd.
2. If the directory does not exist → print `No templates found.` exit `0`.
3. For each immediate subdirectory, check if `<subdir>/devcontainer.json` exists. Collect matching subdirectory names.
4. Print each id on its own line, sorted lexicographically.
5. If no matches → print `No templates found.` exit `0`.

`list` does **not** touch the network.

---

## `up <id> [...args]`
## `exec <id> [...args]`
## `rebuild <id> [...args]`
## `down <id> [...args]`

Arguments:
- `<id>` — required positional
- `[...args]` — any arguments after `<id>` are forwarded verbatim

Behavior:
1. Resolve `workspaceFolder = .devcontainers/<id>` (relative to cwd).
2. If `workspaceFolder/devcontainer.json` does not exist → `error: Template "<id>" is not initialized. Run: sandcontainer init <id>` exit `1`.
3. Build the argv to spawn:
   - `up`: `["up", "--workspace-folder", <workspaceFolder>, ...forwardedArgs]`
   - `exec`: `["exec", "--workspace-folder", <workspaceFolder>, ...forwardedArgs]`
   - `rebuild`: `["up", "--workspace-folder", <workspaceFolder>, "--remove-existing-container", ...forwardedArgs]`
   - `down`: resolved via `docker` — find the container labelled `devcontainer.local_folder=<absolutePath>` and `docker stop` it. (`@devcontainers/cli` has no `down` subcommand.) If no container is found → exit `0` silently.
4. Spawn via `execa` in inherit-stdio mode. Propagate the exit code.

Forwarded arguments:
- Everything after `<id>` in the user's argv is forwarded verbatim. No `--` separator required.
- Flags belonging to `@devcontainers/cli` (or the exec'd command) must **not** be intercepted by citty. Implementation: the forwarder command handlers read `process.argv` directly, locate the subcommand name and the `<id>` position, and forward the tail as raw args. They do **not** rely on citty to parse the tail.
- Consequence: `scx exec <id> --help` and `scx up <id> --help` go to `@devcontainers/cli`, not sandcontainer. Users get sandcontainer help via `scx exec --help` (no id). This matches how `docker run`, `npm run`, and similar tools behave.
- Sandcontainer-owned flags (e.g. future ones) would require a `--` separator; milestone 1 has none, so this is not yet relevant.

---

## How Forwarding Works

For `up` / `exec` / `rebuild` / `down`, sandcontainer does **not** try to distinguish `@devcontainers/cli` flags from the exec'd command's flags. It forwards the tail verbatim; `@devcontainers/cli` owns the parse — same model as `docker run`.

**`@devcontainers/cli exec` argv shape:**
```
devcontainer exec [devcontainer-flags...] <command> [command-args...]
```
Devcontainer CLI consumes its own flags first, then the first positional is the command to exec, then the rest are the command's args.

**Example — mixed flags:**
```
scx exec claude-code --remote-env FOO=bar claude --dangerously-skip-permissions
  → devcontainer exec --workspace-folder .devcontainers/claude-code --remote-env FOO=bar claude --dangerously-skip-permissions

  parsed by @devcontainers/cli as:
    devcontainer flags : --workspace-folder …, --remote-env FOO=bar
    exec'd command     : claude
    command args       : --dangerously-skip-permissions
```

**For `up` / `rebuild` / `down`:** there is no exec'd command; every forwarded arg goes to `@devcontainers/cli` itself.

**`=` and space flag syntax both work** because sandcontainer forwards byte-for-byte:
```
scx exec claude-code --remote-env=FOO=bar claude
scx exec claude-code --remote-env FOO=bar claude
```

**Sandcontainer-owned flags** (milestone 1 has none for these commands) would need to go **before** `<id>` or use a `--` separator — not added in milestone 1.

## Invocation Examples

### Discovering sandcontainer
```
$ scx --version
0.1.0

$ scx --help
# prints top-level help listing init / list / up / exec / rebuild / down

$ scx exec --help
# prints sandcontainer's help for `exec` (not @devcontainers/cli help)
```

### Initializing a template
```
$ scx init claude-code
Initialized template "claude-code" at .devcontainers/claude-code/devcontainer.json

$ scx init claude-code
error: .devcontainers/claude-code/devcontainer.json already exists. Use --force to overwrite.

$ scx init claude-code --force
Initialized template "claude-code" at .devcontainers/claude-code/devcontainer.json

$ scx init nonexistent
error: Template "nonexistent" not found in catalog.
```

### Listing local templates
```
$ scx list
claude-code
copilot

$ scx list         # in a project without .devcontainers/
No templates found.
```

### Bringing a container up / running things in it
```
$ scx up claude-code
# → devcontainer up --workspace-folder .devcontainers/claude-code
# (streams @devcontainers/cli output)

$ scx up claude-code --build-no-cache
# → devcontainer up --workspace-folder .devcontainers/claude-code --build-no-cache

$ scx exec claude-code bash
# → devcontainer exec --workspace-folder .devcontainers/claude-code bash
# (interactive shell inside the container)

$ scx exec claude-code claude --dangerously-skip-permissions
# → devcontainer exec --workspace-folder .devcontainers/claude-code claude --dangerously-skip-permissions
# (flags after <id> are NOT intercepted by sandcontainer)

$ scx exec claude-code bash -lc "pnpm install && pnpm test"
```

### Rebuilding / tearing down
```
$ scx rebuild claude-code
# → devcontainer up --workspace-folder .devcontainers/claude-code --remove-existing-container

$ scx down claude-code
# → docker stop <container with label devcontainer.local_folder=<absolute path>>
```

### Using the long name
```
$ sandcontainer init claude-code
$ sandcontainer up claude-code
# `sandcontainer` and `scx` are interchangeable; same binary, two names.
```

### Using npx (no global install)
```
$ npx sandcontainer init claude-code
$ npx sandcontainer up claude-code
```
