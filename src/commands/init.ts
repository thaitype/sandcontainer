import { defineCommand } from 'citty';

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Download a devcontainer template into .devcontainers/<id>/',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template ID from the catalog',
      required: true,
    },
    force: {
      type: 'boolean',
      description: 'Overwrite existing devcontainer.json if it already exists',
      default: false,
    },
  },
  run() {
    process.stderr.write('init not implemented\n');
    process.exit(1);
  },
});
