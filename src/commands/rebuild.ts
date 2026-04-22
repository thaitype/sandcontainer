import { defineCommand } from 'citty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execa as defaultExeca } from 'execa';

export type ExecaImpl = typeof defaultExeca;

export interface RebuildOptions {
  id: string;
  forwardedArgs: string[];
  cwd?: string;
  execaImpl?: ExecaImpl;
}

/**
 * Pure handler for `rebuild <id> [...args]`.
 * Spawns: npx @devcontainers/cli up --workspace-folder <abs> --remove-existing-container ...forwardedArgs
 */
export async function runRebuild(opts: RebuildOptions): Promise<void> {
  const { id, forwardedArgs, cwd = process.cwd(), execaImpl = defaultExeca } = opts;

  const workspaceFolder = path.resolve(cwd, '.devcontainers', id);
  const dcJson = path.join(workspaceFolder, 'devcontainer.json');

  if (!fs.existsSync(dcJson)) {
    process.stderr.write(`error: Template "${id}" is not initialized. Run: sandcontainer init ${id}\n`);
    process.exit(1);
  }

  const argv = [
    '@devcontainers/cli',
    'up',
    '--workspace-folder',
    workspaceFolder,
    '--remove-existing-container',
    ...forwardedArgs,
  ];

  try {
    await execaImpl('npx', argv, { stdio: 'inherit' });
  } catch (err: unknown) {
    const exitCode = (err as { exitCode?: number }).exitCode;
    process.exit(exitCode ?? 1);
  }
}

export const rebuildCommand = defineCommand({
  meta: {
    name: 'rebuild',
    description: 'Rebuild a devcontainer (forwards to @devcontainers/cli up --remove-existing-container)',
  },
  async run() {
    const argv = process.argv;
    const subCmdIndex = argv.indexOf('rebuild');
    if (subCmdIndex === -1 || subCmdIndex + 1 >= argv.length) {
      process.stderr.write('error: <id> is required.\n');
      process.exit(1);
    }
    const id = argv[subCmdIndex + 1];
    const forwardedArgs = argv.slice(subCmdIndex + 2);
    await runRebuild({ id, forwardedArgs });
  },
});
