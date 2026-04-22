import { defineCommand } from 'citty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execa as defaultExeca } from 'execa';

export type ExecaImpl = typeof defaultExeca;

export interface DownOptions {
  id: string;
  forwardedArgs?: string[];
  cwd?: string;
  execaImpl?: ExecaImpl;
}

/**
 * Pure handler for `down <id>`.
 * Finds the container via docker ps -q --filter label=devcontainer.local_folder=<repoRoot>
 *   --filter label=devcontainer.config_file=<configPath>
 * then docker stop <containerId>.
 * If no container found → silent exit (returns normally).
 */
export async function runDown(opts: DownOptions): Promise<void> {
  const { id, cwd = process.cwd(), execaImpl = defaultExeca } = opts;

  const repoRoot = path.resolve(cwd);
  const configPath = path.resolve(repoRoot, '.devcontainer', id, 'devcontainer.json');

  if (!fs.existsSync(configPath)) {
    process.stderr.write(`error: Template "${id}" is not initialized. Run: sandcontainer init ${id}\n`);
    process.exit(1);
  }

  // Find container by dual label filter
  let containerId = '';
  try {
    const result = await execaImpl(
      'docker',
      [
        'ps',
        '-q',
        '--filter',
        `label=devcontainer.local_folder=${repoRoot}`,
        '--filter',
        `label=devcontainer.config_file=${configPath}`,
      ],
      { stdio: ['inherit', 'pipe', 'inherit'] }
    );
    containerId = (result.stdout ?? '').trim();
  } catch (err: unknown) {
    const exitCode = (err as { exitCode?: number }).exitCode;
    process.exit(exitCode ?? 1);
  }

  // No container found → silent exit 0
  if (!containerId) {
    return;
  }

  // Stop the container
  try {
    await execaImpl('docker', ['stop', containerId], { stdio: 'inherit' });
  } catch (err: unknown) {
    const exitCode = (err as { exitCode?: number }).exitCode;
    process.exit(exitCode ?? 1);
  }
}

export const downCommand = defineCommand({
  meta: {
    name: 'down',
    description: 'Stop a running devcontainer (via docker stop)',
  },
  async run() {
    const argv = process.argv;
    const subCmdIndex = argv.indexOf('down');
    if (subCmdIndex === -1 || subCmdIndex + 1 >= argv.length) {
      process.stderr.write('error: <id> is required.\n');
      process.exit(1);
    }
    const id = argv[subCmdIndex + 1];
    await runDown({ id });
  },
});
