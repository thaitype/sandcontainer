import { defineCommand } from 'citty';

export const rebuildCommand = defineCommand({
  meta: {
    name: 'rebuild',
    description: 'Rebuild a devcontainer (forwards to @devcontainers/cli up --remove-existing-container)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template ID',
      required: true,
    },
  },
  run() {
    process.stderr.write('rebuild not implemented\n');
    process.exit(1);
  },
});
