import { defineCommand } from 'citty';

export const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List locally initialized devcontainer templates',
  },
  args: {},
  run() {
    process.stderr.write('list not implemented\n');
    process.exit(1);
  },
});
