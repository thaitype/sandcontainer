# Changelog

## [0.3.0] (2026-04-22)

### ⚠ BREAKING CHANGES

* The `claude-code` template now uses `devcontainer-features` with the Microsoft
  `javascript-node:22` base image instead of the slim pre-built GHCR image.
  Users with an existing `.devcontainer/claude-code/devcontainer.json` from v0.2.x
  must re-run `scx init claude-code --force` after upgrading to get the new
  features-based config.
* The GHCR image `ghcr.io/thaitype/sandcontainer-claude-code:latest` is no longer
  rebuilt by CI. Use `scx init claude-code-slim` to use the Dockerfile-based template
  that pulls `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest` (~800MB).

### Features

* split `claude-code` into two templates: features-based `claude-code` (~2.3GB, no pre-built image) and Dockerfile-based `claude-code-slim` (~800MB, pre-built GHCR image)
* add `claude-code-slim` template with pre-built image `ghcr.io/thaitype/sandcontainer-claude-code-slim:latest`

## [0.2.0](https://github.com/thaitype/agent-devcontainers/compare/v0.1.0...v0.2.0) (2026-04-22)

### ⚠ BREAKING CHANGES

* The on-disk layout changed from `.devcontainers/<id>/`
(plural) to `.devcontainer/<id>/` (singular). Users with templates
initialized under v0.1.x must re-run `sandcontainer init <id>` and delete
the orphan `.devcontainers/` directory manually. The container's mounted
workspace also changed from the template directory to the user's
repository root — `claude` and other tools now see the user's project
code at `/workspaces/<repo-name>` inside the container.

### Bug Fixes

* move repo devcontainer config into .devcontainer/claude-code/ ([83239ad](https://github.com/thaitype/agent-devcontainers/commit/83239ad6b663d7ef67b752e0748bbd54efc86565))
* remove requireBranch setting from release-it configuration ([da3c42c](https://github.com/thaitype/agent-devcontainers/commit/da3c42c66c848b6bc7af7ba0bbcd3489c5e43d68))
* use `.devcontainer/<id>/` layout and mount repo root as workspace ([bb806ff](https://github.com/thaitype/agent-devcontainers/commit/bb806ff23bb95affc3abb79d1ee97a6a3e3f67ff)), closes [#3](https://github.com/thaitype/agent-devcontainers/issues/3)

### Documentation

* add release notes for v0.1.0 ([14ab2e6](https://github.com/thaitype/agent-devcontainers/commit/14ab2e689f989663c844f325674a3103b8a70a16))
* update AGENTS.md with agent behavior principles and clarify milestone rules ([35316aa](https://github.com/thaitype/agent-devcontainers/commit/35316aa5fd223d5b2665ee92f06c8829775177b6))

## 0.1.0 (2026-04-22)

### Features

* **milestone-1/task-1:** scaffold CLI package and shell ([6ff955a](https://github.com/thaitype/agent-devcontainers/commit/6ff955ad7be99736848d9084059dbd5de9eefad2))
* **milestone-1/task-2:** implement catalog module with Zod schemas and fetch logic ([f9e9f63](https://github.com/thaitype/agent-devcontainers/commit/f9e9f637c249aefe1757207a609b41b992728e95))
* **milestone-1/task-2:** update TODO list with detailed task descriptions ([0ad7113](https://github.com/thaitype/agent-devcontainers/commit/0ad711315ccf3ef40f68b3359a2504921d4a84c3))
* **milestone-1/task-3:** implement init and list commands ([2e214b4](https://github.com/thaitype/agent-devcontainers/commit/2e214b4dfebaf9e7c923defef37155bcb7b369eb))
* **milestone-1/task-4:** implement forwarder commands up/exec/rebuild/down ([bfe6905](https://github.com/thaitype/agent-devcontainers/commit/bfe6905663881b4c55de6c8f15af130c607e0d69))
* **milestone-1/task-5:** seed catalog and claude-code template ([25198e6](https://github.com/thaitype/agent-devcontainers/commit/25198e6cf9c0e6f0621038b13a026bb17fc903de))
* **milestone-2/task-6:** port hardened Dockerfile to templates/claude-code/ ([9c1726f](https://github.com/thaitype/agent-devcontainers/commit/9c1726f6063345226d88e2b771d5b15b0d9a0b67))
* **milestone-2/task-7:** add publish-templates.yml workflow ([8c8697a](https://github.com/thaitype/agent-devcontainers/commit/8c8697a5128af44322c2659aeb830903ab9a47ae))
* **milestone-2/task-8:** update devcontainer.json files to reference GHCR image ([6fb45d4](https://github.com/thaitype/agent-devcontainers/commit/6fb45d4723e17dd835442d35194a79f914a827a8))

### Documentation

* **milestone-2/task-9:** add Template Images section to README ([9942217](https://github.com/thaitype/agent-devcontainers/commit/99422179613b4dd5b290f579916af268b4b1980a))
