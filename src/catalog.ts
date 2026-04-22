import { z } from 'zod';

export const CATALOG_URL = 'https://raw.githubusercontent.com/thaitype/sandcontainer/main/catalog.json';

// TemplateEntry discriminated union on `kind`
const DevcontainerEntry = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    kind: z.literal('devcontainer'),
    url: z.string().url(),
  })
  .passthrough();

const TemplateEntrySchema = z.discriminatedUnion('kind', [DevcontainerEntry]);

export type TemplateEntry = z.infer<typeof TemplateEntrySchema>;

// Envelope schema — parse version separately to produce the right error message
const CatalogEnvelopeSchema = z
  .object({
    version: z.literal(1),
    templates: z.array(TemplateEntrySchema),
  })
  .passthrough();

export type Catalog = z.infer<typeof CatalogEnvelopeSchema>;

/**
 * Fetch and validate the catalog from CATALOG_URL (or an injected fetchImpl).
 * Throws Error with contract-defined messages on every failure path.
 */
export async function fetchCatalog(fetchImpl: typeof fetch = fetch): Promise<Catalog> {
  let response: Response;
  try {
    response = await fetchImpl(CATALOG_URL);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch catalog: ${msg}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch catalog: HTTP ${response.status}`);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Catalog is not valid JSON: ${msg}`);
  }

  // Check version first so we can emit the right error message before the
  // full discriminated-union parse (which would produce a generic Zod error).
  const versionCheck = z.object({ version: z.number() }).safeParse(raw);
  if (versionCheck.success && versionCheck.data.version !== 1) {
    throw new Error(`Unsupported catalog version ${versionCheck.data.version}. Please upgrade sandcontainer.`);
  }

  // Full schema parse — catches unknown kind, bad field shapes, etc.
  const result = CatalogEnvelopeSchema.safeParse(raw);
  if (!result.success) {
    // Distinguish unknown-kind errors from other Zod failures.
    // In Zod v4, a discriminated union with no matching discriminator value
    // raises `invalid_union` with a `discriminator` field equal to the key name.
    const zodMsg = result.error.message;
    const hasUnknownKind = result.error.issues.some(issue => {
      if (issue.code === 'invalid_union') {
        const u = issue as unknown as Record<string, unknown>;
        return u['discriminator'] === 'kind';
      }
      return false;
    });
    if (hasUnknownKind) {
      throw new Error('Catalog contains unsupported template kind. Please upgrade sandcontainer.');
    }
    throw new Error(`Catalog schema validation failed: ${zodMsg}`);
  }

  const catalog = result.data;

  // Post-parse duplicate id check (Zod won't catch this).
  const ids = catalog.templates.map(t => t.id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Catalog schema validation failed: Duplicate template id "${id}"`);
    }
    seen.add(id);
  }

  return catalog;
}

/**
 * Find a template entry by id. Returns undefined if not found.
 * Callers decide what to do when the entry is missing.
 */
export function findTemplate(catalog: Catalog, id: string): TemplateEntry | undefined {
  return catalog.templates.find(t => t.id === id);
}
