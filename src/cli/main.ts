#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { FixtureParser } from '../adapters/parser/fixture-parser.js';
import { VastApplication } from '../application/vast-application.js';
import { ErrorCode, VastError } from '../domain/errors.js';
import { IntentDraftSchema, SceneContractSchema, VisualASTSchema } from '../domain/schemas.js';
import { VAST_VERSION, SCHEMA_VERSION } from '../domain/types.js';
import { formatCompileHuman, formatInspectHuman, formatRegressionHuman, formatValidationHuman } from './format-human.js';
import { formatJson } from './format-json.js';
import { readInput, writeAtomically } from './io.js';
import { createApplication } from './runtime.js';

const options = { json: { type: 'boolean' }, mode: { type: 'string' }, ack: { type: 'string', multiple: true }, parser: { type: 'string' }, format: { type: 'string' }, out: { type: 'string' }, contract: { type: 'string' }, case: { type: 'string' }, layer: { type: 'string' }, debug: { type: 'boolean' } } as const;

function parsedArgs(argv: string[]) { return parseArgs({ args: argv, options, allowPositionals: true, strict: false }); }
function isTTY() { return Boolean(input.isTTY && output.isTTY); }
function writeStdout(value: string) { process.stdout.write(value); }
function writeStderr(value: string) { process.stderr.write(value.endsWith('\n') ? value : `${value}\n`); }
function envelope<T>(kind: string, data: T) { return { vastVersion: VAST_VERSION, schemaVersion: SCHEMA_VERSION, kind, data }; }

async function interactiveAcknowledgement(issues: { id: string; consequence: string }[]): Promise<string[]> {
  const rl = createInterface({ input, output });
  try { for (const item of issues) writeStderr(`WARNING ${item.id}: ${item.consequence}`); const answer = await rl.question('继续编译并接受这些风险？[y/N] '); return /^y(es)?$/i.test(answer.trim()) ? issues.map((x) => x.id) : []; } finally { rl.close(); }
}

function guardExit(decision: string): number { return decision === 'BLOCK' ? ErrorCode.GUARD_BLOCK : decision === 'PAUSE' ? ErrorCode.GUARD_PAUSE : 0; }

async function main(argv = process.argv.slice(2)): Promise<number> {
  const { positionals, values } = parsedArgs(argv);
  const command = positionals[0];
  if (command === 'version') { writeStdout(`VAST Core ${VAST_VERSION}\nSchema ${SCHEMA_VERSION}\nCLI 0.1.0\n`); return 0; }
  if (!command || !['inspect', 'compile', 'validate', 'regression'].includes(command)) throw new VastError(ErrorCode.INPUT_ERROR, 'Usage: vast <inspect|compile|validate|regression|version> [file|-]');
  if (command === 'regression') {
    const result = await (await createApplication('fixture')).regression({ caseId: typeof values.case === 'string' ? values.case : undefined, layer: typeof values.layer === 'string' ? values.layer : undefined });
    writeStdout(values.json ? formatJson(result) : formatRegressionHuman(result)); return result.status === 'PASS' ? 0 : ErrorCode.VALIDATION_FAILED;
  }
  if (command === 'validate') {
    const source = await readInput(positionals[1]);
    let value: unknown; try { value = JSON.parse(source); } catch { throw new VastError(ErrorCode.INPUT_ERROR, 'validate expects JSON AST or Envelope'); }
    if (value && typeof value === 'object' && 'data' in value) value = (value as { data: unknown }).data;
    const ast = VisualASTSchema.parse(value);
    let contract;
    if (typeof values.contract === 'string') { const contractValue = JSON.parse(await readFile(values.contract, 'utf8')) as unknown; contract = SceneContractSchema.parse(contractValue && typeof contractValue === 'object' && 'data' in contractValue ? (contractValue as { data: unknown }).data : contractValue); }
    const result = await (await createApplication('fixture')).validate({ ast, contract });
    writeStdout(values.json ? formatJson(envelope('vast.validation-result', result)) : formatValidationHuman(result)); return result.status === 'PASS' ? 0 : ErrorCode.VALIDATION_FAILED;
  }
  const source = await readInput(positionals[1]);
  if (!source && !positionals[1] && isTTY()) { const rl = createInterface({ input, output }); try { const text = await rl.question('Describe the scene: '); return await dispatchScene(command, text, values); } finally { rl.close(); } }
  return dispatchScene(command, source, values);
}

async function dispatchScene(command: string, text: string, values: Record<string, unknown>): Promise<number> {
  const parser = typeof values.parser === 'string' ? values.parser : 'default';
  const app = await createApplication(parser);
  const mode = values.mode === 'notice-only' || values.mode === 'strict' || values.mode === 'interactive' ? values.mode : 'interactive';
  const acknowledgements = Array.isArray(values.ack) ? values.ack : typeof values.ack === 'string' ? [values.ack] : [];
  if (command === 'inspect') {
    let response = await app.inspect({ text, mode, acknowledgedIssueIds: acknowledgements, parserProfile: parser });
    if (response.guard.decision === 'PAUSE' && mode === 'interactive' && isTTY()) response = await app.inspect({ text, mode, acknowledgedIssueIds: await interactiveAcknowledgement(response.guard.issues.filter((x) => x.severity === 'warning')), parserProfile: parser });
    writeStdout(values.json ? formatJson(envelope('vast.intent-diagnostics', response.guard)) : formatInspectHuman(response)); return guardExit(response.guard.decision);
  }
  let response = await app.compile({ text, mode, acknowledgedIssueIds: acknowledgements, format: values.format as 'prompt' | 'render-intent' | 'ast' | 'contract' | 'full' | undefined, parserProfile: parser });
  if (response.guard.decision === 'PAUSE' && mode === 'interactive' && isTTY()) response = await app.compile({ text, mode, acknowledgedIssueIds: await interactiveAcknowledgement(response.guard.issues.filter((x) => x.severity === 'warning')), format: values.format as 'prompt' | 'render-intent' | 'ast' | 'contract' | 'full' | undefined, parserProfile: parser });
  if (response.guard.decision !== 'CONTINUE') { writeStdout(values.json ? formatJson(envelope('vast.compile-result', response)) : formatInspectHuman({ guard: response.guard, parser: { adapter: parser, schemaVersion: '1' }, warnings: [] })); return guardExit(response.guard.decision); }
  if (response.validation?.status === 'FAIL') { writeStdout(values.json ? formatJson(envelope('vast.compile-result', response)) : formatValidationHuman(response.validation)); return ErrorCode.VALIDATION_FAILED; }
  const format = typeof values.format === 'string' ? values.format : 'full';
  let content = values.json ? formatJson(envelope('vast.compile-result', response)) : formatCompileHuman(response, format);
  if (!values.json && format === 'render-intent') content = formatJson(envelope('vast.render-intent', response.renderIntent));
  if (!values.json && format === 'ast') content = formatJson(envelope('vast.visual-ast', response.ast));
  if (!values.json && format === 'contract') content = formatJson(envelope('vast.scene-contract', response.contract));
  if (typeof values.out === 'string' && values.out !== '-') await writeAtomically(values.out, content); else writeStdout(content);
  return 0;
}

export { main };

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/main.ts') || process.argv[1]?.replace(/\\/g, '/').endsWith('/main.js')) {
  try { process.exitCode = await main(); } catch (error) { const message = error instanceof VastError ? error.message : error instanceof Error ? error.message : 'Unknown error'; writeStderr(`vast: ${message}`); process.exitCode = error instanceof VastError ? error.code : ErrorCode.INTERNAL_ERROR; }
}
