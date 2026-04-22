import { describe, it, expect, afterEach, vi, type MockInstance } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runInit } from './init.js';

// Helper to create a fake fetch that returns catalog + template responses
function makeFetch(catalogPayload: unknown, templatePayload?: unknown, templateStatus = 200) {
  return vi.fn(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    if (urlStr.includes('catalog.json')) {
      return {
        ok: true,
        status: 200,
        json: async () => catalogPayload,
      } as Response;
    }
    // template URL
    return {
      ok: templateStatus === 200,
      status: templateStatus,
      json: async () => {
        if (templatePayload instanceof Error) throw templatePayload;
        return templatePayload;
      },
    } as Response;
  }) as typeof fetch;
}

const validCatalog = {
  version: 1,
  templates: [
    {
      kind: 'devcontainer',
      id: 'claude-code',
      name: 'Claude Code',
      description: 'A devcontainer for Claude Code',
      url: 'https://example.com/claude-code/devcontainer.json',
    },
  ],
};

const validTemplate = {
  name: 'Claude Code',
  image: 'mcr.microsoft.com/devcontainers/base:ubuntu',
};

describe('runInit', () => {
  let tmpDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: MockInstance<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: MockInstance<any>;

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up tmp dir if created
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function makeTmpDir() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
    return tmpDir;
  }

  function spyIO() {
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  }

  it('happy path: creates devcontainer.json', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = makeFetch(validCatalog, validTemplate);

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'Initialized template "claude-code" at .devcontainer/claude-code/devcontainer.json\n'
    );

    const written = fs.readFileSync(path.join(cwd, '.devcontainer', 'claude-code', 'devcontainer.json'), 'utf8');
    expect(written).toBe(JSON.stringify(validTemplate, null, 2) + '\n');
  });

  it('template-not-found: exits 1 with correct error message', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = makeFetch(validCatalog, validTemplate);

    const code = await runInit({ id: 'nonexistent', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith('error: Template "nonexistent" not found in catalog.\n');
  });

  it('file-exists-without-force: exits 1 with correct error message', async () => {
    const cwd = makeTmpDir();
    // Pre-create the file
    const dir = path.join(cwd, '.devcontainer', 'claude-code');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), '{}', 'utf8');

    spyIO();
    const fetchImpl = makeFetch(validCatalog, validTemplate);

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      'error: .devcontainer/claude-code/devcontainer.json already exists. Use --force to overwrite.\n'
    );
  });

  it('file-exists-with-force: overwrites and exits 0', async () => {
    const cwd = makeTmpDir();
    // Pre-create the file with old content
    const dir = path.join(cwd, '.devcontainer', 'claude-code');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), '{"old": true}', 'utf8');

    spyIO();
    const fetchImpl = makeFetch(validCatalog, validTemplate);

    const code = await runInit({ id: 'claude-code', force: true, cwd, fetchImpl });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith(
      'Initialized template "claude-code" at .devcontainer/claude-code/devcontainer.json\n'
    );
    const written = fs.readFileSync(path.join(dir, 'devcontainer.json'), 'utf8');
    expect(written).toBe(JSON.stringify(validTemplate, null, 2) + '\n');
  });

  it('catalog fetch failure propagates', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = vi.fn(async () => {
      throw new Error('DNS failure');
    }) as unknown as typeof fetch;

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith('error: Failed to fetch catalog: DNS failure\n');
  });

  it('catalog HTTP non-200 propagates', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith('error: Failed to fetch catalog: HTTP 503\n');
  });

  it('template URL fetch failure propagates (network error)', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes('catalog.json')) {
        return { ok: true, status: 200, json: async () => validCatalog } as Response;
      }
      throw new Error('connection refused');
    }) as typeof fetch;

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith('error: Failed to fetch template: connection refused\n');
  });

  it('template URL fetch failure propagates (HTTP error)', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = makeFetch(validCatalog, validTemplate, 404);

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    expect(stderrSpy).toHaveBeenCalledWith('error: Failed to fetch template: HTTP 404\n');
  });

  it('invalid JSON payload: exits 1 with correct error message', async () => {
    const cwd = makeTmpDir();
    spyIO();
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (urlStr.includes('catalog.json')) {
        return { ok: true, status: 200, json: async () => validCatalog } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      } as unknown as Response;
    }) as typeof fetch;

    const code = await runInit({ id: 'claude-code', force: false, cwd, fetchImpl });

    expect(code).toBe(1);
    // Message should start with the template JSON error prefix
    const call = (stderrSpy.mock.calls[0] as [string])[0];
    expect(call).toMatch(/^error: Template payload is not valid JSON:/);
  });
});
