import { defineCommand, runMain } from 'citty';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { upCommand } from './commands/up.js';
import { execCommand } from './commands/exec.js';
import { rebuildCommand } from './commands/rebuild.js';
import { downCommand } from './commands/down.js';

declare const __CLI_VERSION__: string;

const main = defineCommand({
  meta: {
    name: 'sandcontainer',
    version: __CLI_VERSION__,
    description: 'Catalog-driven CLI for distributing devcontainer configurations',
  },
  subCommands: {
    init: initCommand,
    list: listCommand,
    up: upCommand,
    exec: execCommand,
    rebuild: rebuildCommand,
    down: downCommand,
  },
});

runMain(main);
