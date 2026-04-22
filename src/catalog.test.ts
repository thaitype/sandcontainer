import { describe, it, expect, vi } from 'vitest';
import { fetchCatalog, findTemplate, CATALOG_URL, type Catalog } from './catalog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function makeJsonErrorResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON at position 0');
    },
  } as unknown as Response;
}

const VALID_CATALOG = {
  version: 1,
  templates: [
    {
      id: 'claude-code',
      name: 'Claude Code',
      description: 'A devcontainer for Claude Code',
      kind: 'devcontainer',
      url: 'https://example.com/devcontainer.json',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchCatalog', () => {
  it('happy path — returns a valid catalog', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200, VALID_CATALOG));

    const catalog = await fetchCatalog(mockFetch);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(CATALOG_URL);
    expect(catalog.version).toBe(1);
    expect(catalog.templates).toHaveLength(1);
    expect(catalog.templates[0].id).toBe('claude-code');
  });

  it('HTTP non-200 — throws with "Failed to fetch catalog: HTTP <status>"', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(404, null));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow('Failed to fetch catalog: HTTP 404');
  });

  it('invalid JSON — throws with "Catalog is not valid JSON: <parse error message>"', async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeJsonErrorResponse(200));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow(/^Catalog is not valid JSON: /);
  });

  it('Zod validation failure — throws with "Catalog schema validation failed: <zod message>"', async () => {
    const badCatalog = {
      version: 1,
      templates: [
        {
          id: 'INVALID ID with spaces', // fails id regex
          name: 'Bad',
          description: '',
          kind: 'devcontainer',
          url: 'https://example.com/devcontainer.json',
        },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200, badCatalog));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow(/^Catalog schema validation failed: /);
  });

  it('network error — throws with "Failed to fetch catalog: <error.message>"', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow('Failed to fetch catalog: ECONNREFUSED');
  });

  it('unknown kind — throws "Catalog contains unsupported template kind. Please upgrade sandcontainer."', async () => {
    const catalogWithUnknownKind = {
      version: 1,
      templates: [
        {
          id: 'my-template',
          name: 'My Template',
          description: '',
          kind: 'nspkg', // unknown kind
          url: 'https://example.com/devcontainer.json',
        },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200, catalogWithUnknownKind));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow(
      'Catalog contains unsupported template kind. Please upgrade sandcontainer.'
    );
  });

  it('unknown version — throws "Unsupported catalog version <N>. Please upgrade sandcontainer."', async () => {
    const futureCatalog = {
      version: 99,
      templates: [],
    };
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200, futureCatalog));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow(
      'Unsupported catalog version 99. Please upgrade sandcontainer.'
    );
  });

  it('duplicate ids — throws "Catalog schema validation failed: Duplicate template id ..."', async () => {
    const catalogWithDupes = {
      version: 1,
      templates: [
        {
          id: 'claude-code',
          name: 'Claude Code',
          description: '',
          kind: 'devcontainer',
          url: 'https://example.com/devcontainer.json',
        },
        {
          id: 'claude-code', // duplicate
          name: 'Claude Code 2',
          description: '',
          kind: 'devcontainer',
          url: 'https://example.com/devcontainer2.json',
        },
      ],
    };
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(200, catalogWithDupes));

    await expect(fetchCatalog(mockFetch)).rejects.toThrow(/^Catalog schema validation failed: Duplicate template id/);
  });
});

describe('findTemplate', () => {
  const catalog: Catalog = {
    version: 1,
    templates: [
      {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'A devcontainer for Claude Code',
        kind: 'devcontainer',
        url: 'https://example.com/devcontainer.json',
      },
    ],
  };

  it('returns the matching entry when found', () => {
    const entry = findTemplate(catalog, 'claude-code');
    expect(entry).toBeDefined();
    expect(entry?.id).toBe('claude-code');
  });

  it('returns undefined when the id is not found', () => {
    const entry = findTemplate(catalog, 'nonexistent');
    expect(entry).toBeUndefined();
  });
});
