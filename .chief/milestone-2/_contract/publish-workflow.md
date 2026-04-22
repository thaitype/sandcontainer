# Contract — `publish-templates.yml` Workflow

## Location

`.github/workflows/publish-templates.yml`

## Triggers

```yaml
on:
  push:
    branches: [main]
    paths:
      - "templates/**"
      - ".github/workflows/publish-templates.yml"
  workflow_dispatch:
```

## Permissions

```yaml
permissions:
  contents: read
  packages: write
```

No other permissions. No `id-token: write` (no OIDC / signing in milestone 2).

## Concurrency

```yaml
concurrency:
  group: publish-templates-${{ matrix.template }}
  cancel-in-progress: true
```

Scoped per-template via the matrix key, so different templates don't block each other, but a new push of template X cancels an in-flight build of template X.

## Job Structure

Two jobs:

### `discover`
- Runs once.
- Enumerates `templates/*/Dockerfile` and emits the matrix.
- Uses a short shell script; output schema:
  ```json
  { "template": ["claude-code", "..."] }
  ```
- If the list is empty, the `publish` job's matrix is empty and the workflow succeeds with no-op (no error).

Implementation sketch:
```yaml
discover:
  runs-on: ubuntu-latest
  outputs:
    matrix: ${{ steps.set.outputs.matrix }}
  steps:
    - uses: actions/checkout@v4
    - id: set
      run: |
        templates=$(ls -1 templates 2>/dev/null | while read d; do
          [ -f "templates/$d/Dockerfile" ] && echo "$d"
        done | jq -R . | jq -s -c '{template: .}')
        echo "matrix=$templates" >> "$GITHUB_OUTPUT"
```

### `publish`
- `needs: discover`
- `strategy.matrix: ${{ fromJson(needs.discover.outputs.matrix) }}`
- `strategy.fail-fast: false` — one template failing does not cancel others.
- Steps:
  1. `actions/checkout@v4`
  2. `docker/setup-qemu-action@v3` — for arm64 emulation
  3. `docker/setup-buildx-action@v3`
  4. `docker/login-action@v3` — `registry: ghcr.io`, `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}`
  5. `docker/build-push-action@v6` with:
     - `context: templates/${{ matrix.template }}`
     - `file: templates/${{ matrix.template }}/Dockerfile`
     - `platforms: linux/amd64,linux/arm64`
     - `push: true`
     - `tags: ghcr.io/thaitype/sandcontainer-${{ matrix.template }}:latest`
     - `cache-from: type=gha,scope=${{ matrix.template }}`
     - `cache-to: type=gha,mode=max,scope=${{ matrix.template }}`

## Runs-on

`ubuntu-latest` for both jobs.

## Secrets

Only `GITHUB_TOKEN` (automatic). No PATs. No org-level secrets.

## Failure Modes

- `discover` produces empty matrix → workflow succeeds, no images published.
- A template's Dockerfile build fails → that matrix job fails; other templates still publish due to `fail-fast: false`.
- Push to GHCR fails (auth, rate limit) → job fails with the underlying error. No retry logic in milestone 2.

## Non-Behaviors (Explicit)

- No lint/test step.
- No version/SHA tags beyond `:latest`.
- No package visibility changes via API.
- No Slack/Discord notifications.
- No release-note generation.
- No `.dockerignore`-level optimization beyond what the Dockerfile already does.
- No signing (`cosign`, Sigstore) or SBOM generation.
