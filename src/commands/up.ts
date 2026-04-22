import { defineCommand } from 'citty';

export const upCommand = defineCommand({
  meta: {
    name: 'up',
    description: 'Bring up a devcontainer (forwards to @devcontainers/cli)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template ID',
      required: true,
    },
  },
  run() {
    process.stderr.write('up not implemented\n');
    process.exit(1);
  },
});
