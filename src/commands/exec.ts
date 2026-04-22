import { defineCommand } from 'citty';

export const execCommand = defineCommand({
  meta: {
    name: 'exec',
    description: 'Execute a command in a devcontainer (forwards to @devcontainers/cli)',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Template ID',
      required: true,
    },
  },
  run() {
    process.stderr.write('exec not implemented\n');
    process.exit(1);
  },
});
