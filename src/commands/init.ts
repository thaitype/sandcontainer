import { defineCommand } from 'citty';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fetchCatalog, findTemplate } from '../catalog.js';

export interface InitOptions {
  id: string;
  force: boolean;
  cwd?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Pure handler for `init <id> [--force]`.
 * Returns exit code (0 = success, 1 = error).
 * Writes errors to stderr, success to stdout.
 */
export async function runInit(opts: InitOptions): Promise<number> {
  const { id, force, cwd = process.cwd(), fetchImpl = fetch } = opts;

  // Step 1 & 2: Fetch + validate catalog, look up id
  let catalog;
  try {
    catalog = await fetchCatalog(fetchImpl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: ${msg}\n`);
    return 1;
  }

  const entry = findTemplate(catalog, id);
  if (!entry) {
    process.stderr.write(`error: Template "${id}" not found in catalog.\n`);
    return 1;
  }

  // Step 3: Pre-check target file
  const targetDir = path.resolve(cwd, '.devcontainer', id);
  const targetFile = path.join(targetDir, 'devcontainer.json');

  if (fs.existsSync(targetFile) && !force) {
    process.stderr.write(`error: .devcontainer/${id}/devcontainer.json already exists. Use --force to overwrite.\n`);
    return 1;
  }

  // Step 4: Fetch entry URL and JSON.parse
  let fetchedResponse: Response;
  try {
    fetchedResponse = await fetchImpl(entry.url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: Failed to fetch template: ${msg}\n`);
    return 1;
  }

  if (!fetchedResponse.ok) {
    process.stderr.write(`error: Failed to fetch template: HTTP ${fetchedResponse.status}\n`);
    return 1;
  }

  let parsed: unknown;
  try {
    parsed = await fetchedResponse.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: Template payload is not valid JSON: ${msg}\n`);
    return 1;
  }

  // Step 5: mkdir -p .devcontainer/<id>
  fs.mkdirSync(targetDir, { recursive: true });

  // Step 6: Write devcontainer.json
  const content = JSON.stringify(parsed, null, 2) + '\n';
  fs.writeFileSync(targetFile, content, 'utf8');

  // Step 7: Print confirmation
  process.stdout.write(`Initialized template "${id}" at .devcontainer/${id}/devcontainer.json\n`);
  return 0;
}

export const initCommand = defineCommand({
  meta: {
    name: 'init',
    description: 'Download a devcontainer template into .devcontainer/<id>/',
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
  async run({ args }) {
    const code = await runInit({ id: args.id, force: args.force });
    if (code !== 0) {
      process.exit(code);
    }
  },
});
