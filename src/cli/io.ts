import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export async function readInput(file: string | undefined, stdin: NodeJS.ReadableStream = process.stdin): Promise<string> {
  if (file && file !== '-') return readFile(file, 'utf8');
  if (file === '-' || !('isTTY' in stdin && stdin.isTTY)) {
    let text = '';
    for await (const chunk of stdin) text += String(chunk);
    return text;
  }
  return '';
}

export async function writeAtomically(path: string, content: string): Promise<void> {
  const absoluteDir = dirname(path);
  const tempDir = await mkdtemp(join(absoluteDir, '.vast-tmp-'));
  const tempPath = join(tempDir, 'output');
  try { await writeFile(tempPath, content, 'utf8'); await rename(tempPath, path); } finally { await rm(tempDir, { recursive: true, force: true }); }
}
