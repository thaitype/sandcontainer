import { defineCommand } from 'citty';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ListOptions {
  cwd?: string;
}

/**
 * Pure handler for `list`.
 * Scans .devcontainers/ immediate subdirectories for devcontainer.json.
 * Returns exit code (always 0 per contract).
 */
export function runList(opts: ListOptions = {}): number {
  const { cwd = process.cwd() } = opts;

  const devcontainersDir = path.resolve(cwd, '.devcontainers');

  // Step 2: If directory does not exist → no templates
  if (!fs.existsSync(devcontainersDir)) {
    process.stdout.write('No templates found.\n');
    return 0;
  }

  // Step 3: Scan immediate subdirectories for devcontainer.json
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(devcontainersDir, { withFileTypes: true });
  } catch {
    process.stdout.write('No templates found.\n');
    return 0;
  }

  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dcJson = path.join(devcontainersDir, entry.name, 'devcontainer.json');
    if (fs.existsSync(dcJson)) {
      ids.push(entry.name);
    }
  }

  // Step 4 & 5: Sort and print, or no templates
  if (ids.length === 0) {
    process.stdout.write('No templates found.\n');
    return 0;
  }

  ids.sort();
  for (const id of ids) {
    process.stdout.write(`${id}\n`);
  }

  return 0;
}

export const listCommand = defineCommand({
  meta: {
    name: 'list',
    description: 'List locally initialized devcontainer templates',
  },
  args: {},
  run() {
    runList();
  },
});
