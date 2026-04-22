import { describe, it, expect, afterEach, vi, type MockInstance } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runDown } from './down.js';

describe('runDown', () => {
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
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-down-'));
    return tmpDir;
  }

  function makeInitializedTemplate(cwd: string, id: string) {
    const dir = path.join(cwd, '.devcontainer', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), '{}', 'utf8');
    return dir;
  }

  function spyStderr() {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  }

  it('docker ps uses correct label filter with absolute workspace folder path', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'abc123', exitCode: 0 })
      .mockResolvedValueOnce({ exitCode: 0 });

    await runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never });

    const [cmd, args] = execaImpl.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('docker');
    expect(args[0]).toBe('ps');
    expect(args).toContain('-q');
    const repoRoot = path.resolve(cwd);
    const configPath = path.resolve(cwd, '.devcontainer', 'claude-code', 'devcontainer.json');
    const firstFilterIdx = args.indexOf('--filter');
    expect(firstFilterIdx).toBeGreaterThan(-1);
    expect(args[firstFilterIdx + 1]).toBe(`label=devcontainer.local_folder=${repoRoot}`);
    const secondFilterIdx = args.indexOf('--filter', firstFilterIdx + 1);
    expect(secondFilterIdx).toBeGreaterThan(-1);
    expect(args[secondFilterIdx + 1]).toBe(`label=devcontainer.config_file=${configPath}`);
  });

  it('calls docker stop with container id when found', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'abc123', exitCode: 0 })
      .mockResolvedValueOnce({ exitCode: 0 });

    await runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never });

    expect(execaImpl).toHaveBeenCalledTimes(2);
    const [stopCmd, stopArgs] = execaImpl.mock.calls[1] as [string, string[]];
    expect(stopCmd).toBe('docker');
    expect(stopArgs[0]).toBe('stop');
    expect(stopArgs[1]).toBe('abc123');
  });

  it('silently exits 0 when docker ps returns no container id', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockResolvedValueOnce({ stdout: '', exitCode: 0 });

    // Should complete without calling docker stop and without throwing
    await runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never });

    // Only the docker ps call, no docker stop
    expect(execaImpl).toHaveBeenCalledTimes(1);
  });

  it('silently exits 0 when docker ps returns only whitespace', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockResolvedValueOnce({ stdout: '   \n  ', exitCode: 0 });

    await runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never });

    expect(execaImpl).toHaveBeenCalledTimes(1);
  });

  it('pre-flight: errors if devcontainer.json does not exist', async () => {
    const cwd = makeTmpDir();
    spyStderr();

    const execaImpl = vi.fn().mockResolvedValue({ stdout: '', exitCode: 0 });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(runDown({ id: 'not-init', cwd, execaImpl: execaImpl as never })).rejects.toThrow(
      'process.exit called'
    );

    expect(stderrSpy).toHaveBeenCalledWith(
      'error: Template "not-init" is not initialized. Run: sandcontainer init not-init\n'
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(execaImpl).not.toHaveBeenCalled();
  });

  it('propagates non-zero exit code from docker ps failure', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi.fn().mockRejectedValueOnce({ exitCode: 1 });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never })).rejects.toThrow(
      'process.exit called'
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('propagates non-zero exit code from docker stop failure', async () => {
    const cwd = makeTmpDir();
    makeInitializedTemplate(cwd, 'claude-code');

    const execaImpl = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'abc123', exitCode: 0 })
      .mockRejectedValueOnce({ exitCode: 137 });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(runDown({ id: 'claude-code', cwd, execaImpl: execaImpl as never })).rejects.toThrow(
      'process.exit called'
    );

    expect(exitSpy).toHaveBeenCalledWith(137);
  });
});
