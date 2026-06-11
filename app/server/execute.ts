import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

const TIMEOUT_MS = 5000;

export function executePython(code: string): ExecuteResult {
  // Create a temporary file for the Python code
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `learn-anything-${Date.now()}.py`);

  try {
    // Write code to temp file
    fs.writeFileSync(tmpFile, code, 'utf-8');

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    let timedOut = false;

    try {
      // Execute Python with timeout
      const result = execSync(`python "${tmpFile}"`, {
        encoding: 'utf-8',
        timeout: TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
        windowsHide: true,
      });
      stdout = result;
    } catch (err: unknown) {
      const execErr = err as {
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        code?: number;
        killed?: boolean;
        signal?: string;
        message?: string;
      };

      stdout = execErr.stdout
        ? typeof execErr.stdout === 'string'
          ? execErr.stdout
          : execErr.stdout.toString()
        : '';
      stderr =
        execErr.stderr
          ? typeof execErr.stderr === 'string'
            ? execErr.stderr
            : execErr.stderr.toString()
          : execErr.message ?? '';

      // Check if the process was killed due to timeout
      if (execErr.killed || execErr.signal === 'SIGTERM') {
        timedOut = true;
        stderr = stderr + '\n[进程超时：代码执行超过 5 秒限制]';
      }

      exitCode = execErr.code ?? 1;
    }

    return { stdout, stderr, exitCode, timedOut };
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Best effort cleanup — ignore errors
    }
  }
}
