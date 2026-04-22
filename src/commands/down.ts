import { defineCommand } from 'citty';

export const downCommand = defineCommand({
  meta: {
    name: 'down',
    description: 'Stop a running devcontainer (via docker stop)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template ID',
      required: true,
    },
  },
  run() {
    process.stderr.write('down not implemented\n');
    process.exit(1);
  },
});
