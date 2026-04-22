import { defineCommand } from 'citty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execa as defaultExeca } from 'execa';

export type ExecaImpl = typeof defaultExeca;

export interface UpOptions {
  id: string;
  forwardedArgs: string[];
  cwd?: string;
  execaImpl?: ExecaImpl;
}

/**
 * Pure handler for `up <id> [...args]`.
 * Spawns: npx @devcontainers/cli up --workspace-folder <abs> ...forwardedArgs
 */
export async function runUp(opts: UpOptions): Promise<void> {
  const { id, forwardedArgs, cwd = process.cwd(), execaImpl = defaultExeca } = opts;

  const workspaceFolder = path.resolve(cwd, '.devcontainers', id);
  const dcJson = path.join(workspaceFolder, 'devcontainer.json');

  if (!fs.existsSync(dcJson)) {
    process.stderr.write(`error: Template "${id}" is not initialized. Run: sandcontainer init ${id}\n`);
    process.exit(1);
  }

  const argv = ['@devcontainers/cli', 'up', '--workspace-folder', workspaceFolder, ...forwardedArgs];

  try {
    await execaImpl('npx', argv, { stdio: 'inherit' });
  } catch (err: unknown) {
    const exitCode = (err as { exitCode?: number }).exitCode;
    process.exit(exitCode ?? 1);
  }
}

export const upCommand = defineCommand({
  meta: {
    name: 'up',
    description: 'Bring up a devcontainer (forwards to @devcontainers/cli)',
  },
  async run() {
    const argv = process.argv;
    const subCmdIndex = argv.indexOf('up');
    if (subCmdIndex === -1 || subCmdIndex + 1 >= argv.length) {
      process.stderr.write('error: <id> is required.\n');
      process.exit(1);
    }
    const id = argv[subCmdIndex + 1];
    const forwardedArgs = argv.slice(subCmdIndex + 2);
    await runUp({ id, forwardedArgs });
  },
});
