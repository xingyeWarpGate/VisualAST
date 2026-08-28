import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { test } from 'node:test';

type Run = { code: number | null; stdout: string; stderr: string };
const cwd = process.cwd();

function runCli(args: string[], input?: string): Promise<Run> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'src/cli/main.ts', ...args], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
  });
}

test('CLI version uses canonical protocol version', async () => {
  const result = await runCli(['version']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /VAST Core 2\.0\.2/);
  assert.match(result.stdout, /Schema 1/);
});

test('CLI file and stdin fixture inputs are semantically equivalent', async () => {
  const file = await runCli(['inspect', 'fixtures/demo.txt', '--parser', 'fixture', '--json']);
  const stdin = await runCli(['inspect', '-', '--parser', 'fixture', '--json'], 'fixture:demo');
  assert.equal(file.code, 0); assert.equal(stdin.code, 0);
  assert.deepEqual(JSON.parse(file.stdout).data.draft.sceneIdentity, JSON.parse(stdin.stdout).data.draft.sceneIdentity);
});

test('CLI JSON stdout contains no log pollution', async () => {
  const result = await runCli(['inspect', 'fixtures/demo.txt', '--parser', 'fixture', '--json']);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).kind, 'vast.intent-diagnostics');
});

test('CLI prompt output is pure visual text', async () => {
  const result = await runCli(['compile', 'fixtures/demo.txt', '--parser', 'fixture', '--format', 'prompt']);
  assert.equal(result.code, 0);
  for (const token of ['caseId', 'assertions', 'PASS', 'FAIL', 'intentDiagnostics']) assert.equal(result.stdout.includes(token), false);
});

test('CLI non-TTY PAUSE returns exit code 3 without auto-acknowledgement', async () => {
  const result = await runCli(['inspect', '-', '--parser', 'fixture', '--json'], JSON.stringify({ requiredEntities: [], optionalEntities: [], forbiddenEntities: [], requiredStates: [], requiredRelations: [], attentionCompetition: ['entity.a', 'entity.b'] }));
  assert.equal(result.code, 3);
  assert.equal(JSON.parse(result.stdout).data.decision, 'PAUSE');
});

test('CLI BLOCK returns exit code 4', async () => {
  const result = await runCli(['inspect', '-', '--parser', 'fixture', '--json'], JSON.stringify({ requiredEntities: [], optionalEntities: [], forbiddenEntities: [], requiredStates: [], requiredRelations: [], contradictions: ['upright', 'slumped'] }));
  assert.equal(result.code, 4);
  assert.equal(JSON.parse(result.stdout).data.decision, 'BLOCK');
});

test('CLI writes compile output atomically and validate reads it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vast-cli-'));
  try {
    const astPath = join(dir, 'ast.json');
    const compiled = await runCli(['compile', 'fixtures/demo.txt', '--parser', 'fixture', '--format', 'ast', '--out', astPath]);
    assert.equal(compiled.code, 0); assert.equal(compiled.stdout, '');
    const validated = await runCli(['validate', astPath, '--json']);
    assert.equal(validated.code, 0); assert.equal(JSON.parse(validated.stdout).data.status, 'PASS');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI validation failure uses exit code 2', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vast-cli-'));
  try {
    const astPath = join(dir, 'ast.json'); const contractPath = join(dir, 'contract.json'); const fullPath = join(dir, 'full.json');
    const compiled = await runCli(['compile', 'fixtures/demo.txt', '--parser', 'fixture', '--format', 'ast', '--out', astPath]);
    assert.equal(compiled.code, 0);
    const full = await runCli(['compile', 'fixtures/demo.txt', '--parser', 'fixture', '--format', 'full', '--json', '--out', fullPath]);
    assert.equal(full.code, 0);
    const contract = { ...JSON.parse(await readFile(fullPath, 'utf8')).data.contract, requiredEntities: [{ id: 'entity.missing', type: 'missing', presence: 'required' }] };
    await writeFile(contractPath, JSON.stringify(contract));
    const validated = await runCli(['validate', astPath, '--contract', contractPath, '--json']);
    assert.equal(validated.code, 2); assert.equal(JSON.parse(validated.stdout).data.status, 'FAIL');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
