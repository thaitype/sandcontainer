# Contract — Catalog Schema

## Source URL

```
https://raw.githubusercontent.com/thaitype/sandcontainer/main/catalog.json
```

Hard-coded constant in source. Not user-configurable in milestone 1.

## Envelope

```ts
{
  version: 1,
  templates: TemplateEntry[]
}
```

- `version` is a literal number. The CLI only accepts `version === 1`. Any other value → error: `Unsupported catalog version <N>. Please upgrade sandcontainer.`
- `templates` must be a non-empty array at runtime? **No** — empty arrays are legal (catalog could be drained during maintenance).

## TemplateEntry (Zod discriminated union on `kind`)

```ts
z.discriminatedUnion("kind", [
  z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),  // lowercase slug
    name: z.string().min(1),
    description: z.string(),                        // may be empty string
    tags: z.array(z.string()).optional(),
    kind: z.literal("devcontainer"),
    url: z.string().url(),
  }),
])
```

Rules:
- `id` must be unique across `templates[]`. Duplicate ids → error.
- Unknown `kind` values → Zod validation fails the whole parse. The CLI must surface this with: `Catalog contains unsupported template kind. Please upgrade sandcontainer.`
- Unknown top-level fields on an entry are **ignored** (not errored). Use `.passthrough()` on each object.

## Fetch Behavior

- Single `fetch()` with no caching, no retries.
- HTTP status handling:
  - `200` → proceed to JSON parse
  - non-200 → error: `Failed to fetch catalog: HTTP <status>`
- Body parse failure → error: `Catalog is not valid JSON: <parse error message>`
- Zod validation failure → error: `Catalog schema validation failed: <zod message>`
- Network failure (DNS, connection refused, TLS) → error: `Failed to fetch catalog: <error.message>`

All errors exit the process with code `1`.

## Template Lookup

- `findTemplate(catalog, id)` returns the entry whose `id === id`, or `undefined`.
- Caller decides behavior when missing. `init` errors: `Template "<id>" not found in catalog.`

## Downloaded `devcontainer.json`

- Fetched from `entry.url` with the same HTTP error rules as above.
- Validated only via `JSON.parse` — no schema check.
- Written verbatim as the parsed-and-restringified JSON (`JSON.stringify(parsed, null, 2) + "\n"`).
