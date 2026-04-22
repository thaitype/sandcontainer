import { describe, it, expect, afterEach, vi, type MockInstance } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runList } from './list.js';

describe('runList', () => {
  let tmpDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdoutSpy: MockInstance<any>;

  afterEach(() => {
    vi.restoreAllMocks();
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
  }

  it('missing .devcontainer/: prints No templates found.', () => {
    const cwd = makeTmpDir();
    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith('No templates found.\n');
  });

  it('empty .devcontainer/: prints No templates found.', () => {
    const cwd = makeTmpDir();
    fs.mkdirSync(path.join(cwd, '.devcontainer'));
    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith('No templates found.\n');
  });

  it('directory without devcontainer.json is excluded', () => {
    const cwd = makeTmpDir();
    const dcDir = path.join(cwd, '.devcontainer');
    fs.mkdirSync(path.join(dcDir, 'no-json'), { recursive: true });
    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith('No templates found.\n');
  });

  it('single template with devcontainer.json is listed', () => {
    const cwd = makeTmpDir();
    const dcDir = path.join(cwd, '.devcontainer');
    fs.mkdirSync(path.join(dcDir, 'claude-code'), { recursive: true });
    fs.writeFileSync(path.join(dcDir, 'claude-code', 'devcontainer.json'), '{}', 'utf8');
    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    expect(stdoutSpy).toHaveBeenCalledWith('claude-code\n');
  });

  it('mixed dirs: only those with devcontainer.json appear', () => {
    const cwd = makeTmpDir();
    const dcDir = path.join(cwd, '.devcontainer');

    // claude-code: has devcontainer.json
    fs.mkdirSync(path.join(dcDir, 'claude-code'), { recursive: true });
    fs.writeFileSync(path.join(dcDir, 'claude-code', 'devcontainer.json'), '{}', 'utf8');

    // copilot: has devcontainer.json
    fs.mkdirSync(path.join(dcDir, 'copilot'), { recursive: true });
    fs.writeFileSync(path.join(dcDir, 'copilot', 'devcontainer.json'), '{}', 'utf8');

    // no-json: no devcontainer.json
    fs.mkdirSync(path.join(dcDir, 'no-json'), { recursive: true });

    // a-file: not a directory
    fs.writeFileSync(path.join(dcDir, 'a-file'), 'something', 'utf8');

    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    const calls = (stdoutSpy.mock.calls as [string][]).map(c => c[0]);
    expect(calls).toEqual(['claude-code\n', 'copilot\n']);
  });

  it('sort order is lexicographic', () => {
    const cwd = makeTmpDir();
    const dcDir = path.join(cwd, '.devcontainer');

    // Create in reverse alphabetical order
    for (const id of ['zebra', 'apple', 'mango']) {
      fs.mkdirSync(path.join(dcDir, id), { recursive: true });
      fs.writeFileSync(path.join(dcDir, id, 'devcontainer.json'), '{}', 'utf8');
    }

    spyIO();

    const code = runList({ cwd });

    expect(code).toBe(0);
    const calls = (stdoutSpy.mock.calls as [string][]).map(c => c[0]);
    expect(calls).toEqual(['apple\n', 'mango\n', 'zebra\n']);
  });
});
