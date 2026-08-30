import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RunRecord } from '../domain/types.js';

export class RunStore {
  constructor(private readonly root = resolve('artifacts/vast-2.2.1/runs')) {}
  async save(record: RunRecord): Promise<string> { await mkdir(this.root, { recursive: true }); const path = join(this.root, `${record.runId}.json`); await writeFile(path, JSON.stringify(record, null, 2), 'utf8'); return path; }
  async load(runId: string): Promise<RunRecord> { return JSON.parse(await readFile(join(this.root, `${runId}.json`), 'utf8')) as RunRecord; }
  path(runId: string): string { return join(this.root, `${runId}.json`); }
}
