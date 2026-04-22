import { describe, it, expect, afterEach, vi, type MockInstance } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runRebuild } from './rebuild.js';

describe('runRebuild', () => {
  let tmpDir: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: MockInstance<any>;

  afterEach(() => {
    vi.restoreAllMocks();
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  function makeTmpDir() {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-rebuild-'));
    return tmpDir;
  }

  function makeInitializedTemplate(cwd: string, id: string) {
    const dir = path.join(cwd, '.devcontainers', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), '{}', 'utf8');
    return dir;
  }

  function spyStderr() {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  }

  it('spawns npx @devcontainers/cli up --remove-existing-container', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockResolvedValue({ exitCode: 0 });

    await runRebuild({ id: 'claude-code', forwardedArgs: [], cwd, execaImpl: execaImpl as never });

    expect(execaImpl).toHaveBeenCalledOnce();
    const [cmd, args, opts] = execaImpl.mock.calls[0] as [string, string[], unknown];
    expect(cmd).toBe('npx');
    expect(args[0]).toBe('@devcontainers/cli');
    expect(args[1]).toBe('up');
    expect(args[2]).toBe('--workspace-folder');
    expect(args[3]).toBe(path.resolve(cwd, '.devcontainers', 'claude-code'));
    expect(args[4]).toBe('--remove-existing-container');
    expect(opts).toMatchObject({ stdio: 'inherit' });
  });

  it('rebuild maps to up (not rebuild) subcommand of devcontainer CLI', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockResolvedValue({ exitCode: 0 });

    await runRebuild({ id: 'claude-code', forwardedArgs: [], cwd, execaImpl: execaImpl as never });

    const [, args] = execaImpl.mock.calls[0] as [string, string[]];
    // Must use 'up' not 'rebuild'
    expect(args[1]).toBe('up');
    expect(args).toContain('--remove-existing-container');
  });

  it('forwards additional args after --remove-existing-container', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockResolvedValue({ exitCode: 0 });

    await runRebuild({
      id: 'claude-code',
      forwardedArgs: ['--build-no-cache'],
      cwd,
      execaImpl: execaImpl as never,
    });

    const [, args] = execaImpl.mock.calls[0] as [string, string[]];
    const recIdx = args.indexOf('--remove-existing-container');
    expect(recIdx).toBeGreaterThan(-1);
    const tail = args.slice(recIdx + 1);
    expect(tail).toEqual(['--build-no-cache']);
  });

  it('pre-flight: errors if devcontainer.json does not exist', async () => {
    const cwd = makeTmpDir();
    spyStderr();

    const execaImpl = vi.fn().mockResolvedValue({ exitCode: 0 });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(runRebuild({ id: 'not-init', forwardedArgs: [], cwd, execaImpl: execaImpl as never })).rejects.toThrow(
      'process.exit called'
    );

    expect(stderrSpy).toHaveBeenCalledWith(
      'error: Template "not-init" is not initialized. Run: sandcontainer init not-init\n'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(execaImpl).not.toHaveBeenCalled();
  });

  it('propagates non-zero exit code from subprocess', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockRejectedValue({ exitCode: 2 });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(
      runRebuild({ id: 'claude-code', forwardedArgs: [], cwd, execaImpl: execaImpl as never })
    ).rejects.toThrow('process.exit called');

    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
