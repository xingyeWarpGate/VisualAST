#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { VastApplication } from '../application/vast-application.js';
import { ErrorCode, VastError } from '../domain/errors.js';
import { SceneContractSchema, VisualASTSchema } from '../domain/schemas.js';
import { VAST_VERSION, SCHEMA_VERSION } from '../domain/types.js';
import { formatCompileHuman, formatInspectHuman, formatRegressionHuman, formatValidationHuman } from './format-human.js';
import { formatJson } from './format-json.js';
import { readInput, writeAtomically } from './io.js';
import { createApplication } from './runtime.js';
import { ParserAdapterError } from '../adapters/parser/openai-compatible-parser.js';
import { validateContract, validateProposal } from '../core/constraint-core.js';
import { DeterministicParser } from '../runtime/semantic-runtime.js';
import { runOfflineSuites } from '../infrastructure/suites.js';

const options = {
  json: { type: 'boolean' }, mode: { type: 'string' }, ack: { type: 'string', multiple: true }, parser: { type: 'string' }, format: { type: 'string' }, out: { type: 'string' }, contract: { type: 'string' }, case: { type: 'string' }, layer: { type: 'string' }, debug: { type: 'boolean' }, renderer: { type: 'string' }, staged: { type: 'string' }, profile: { type: 'string' }, image: { type: 'string' }, reference: { type: 'string', multiple: true }, desktop: { type: 'boolean' }, output: { type: 'string' }, aspect: { type: 'string' }, 'aspect-ratio': { type: 'string' }, quality: { type: 'string' }, 'max-rounds': { type: 'string' }, suite: { type: 'string' }, help: { type: 'boolean' },
} as const;

function parsedArgs(argv: string[]) { return parseArgs({ args: argv, options, allowPositionals: true, strict: false }); }
function isTTY() { return Boolean(input.isTTY && output.isTTY); }
function writeStdout(value: string) { process.stdout.write(value); }
function writeStderr(value: string) { process.stderr.write(value.endsWith('\n') ? value : `${value}\n`); }
function envelope<T>(kind: string, data: T) { return { vastVersion: VAST_VERSION, schemaVersion: SCHEMA_VERSION, kind, data }; }
function compileEnvelope(response: Awaited<ReturnType<VastApplication['compile']>>, format: string) {
  if (format === 'render-intent' && response.renderIntent) return envelope('vast.render-intent', response.renderIntent);
  if (format === 'ast' && response.ast) return envelope('vast.visual-ast', response.ast);
  if (format === 'contract' && response.contract) return envelope('vast.scene-contract', response.contract);
  return envelope('vast.compile-result', response);
}
async function interactiveAcknowledgement(issues: { id: string; consequence: string }[]): Promise<string[]> {
  const rl = createInterface({ input, output });
  try { for (const item of issues) writeStderr(`WARNING ${item.id}: ${item.consequence}`); const answer = await rl.question('继续编译并接受这些风险？[y/N] '); return /^y(es)?$/i.test(answer.trim()) ? issues.map((x) => x.id) : []; } finally { rl.close(); }
}
function guardExit(decision: string): number { return decision === 'BLOCK' ? ErrorCode.GUARD_BLOCK : decision === 'PAUSE' ? ErrorCode.GUARD_PAUSE : 0; }
function imageOptions(values: Record<string, unknown>) {
  const refs = Array.isArray(values.reference) ? values.reference.filter((x): x is string => typeof x === 'string') : typeof values.reference === 'string' ? [values.reference] : [];
  return { image: typeof values.image === 'string' ? values.image : undefined, references: refs, desktop: values.desktop === true, output: typeof values.output === 'string' ? values.output : undefined, aspectRatio: (typeof values['aspect-ratio'] === 'string' ? values['aspect-ratio'] : typeof values.aspect === 'string' ? values.aspect : undefined) as 'square' | 'landscape' | 'portrait' | undefined, quality: (typeof values.quality === 'string' ? values.quality : 'medium') as 'medium' };
}
async function sceneText(file: string | undefined) {
  const source = await readInput(file);
  if (!source && !file && isTTY()) { const rl = createInterface({ input, output }); try { return await rl.question('Describe the scene: '); } finally { rl.close(); } }
  return source;
}

async function modern(command: string, text: string, values: Record<string, unknown>): Promise<number> {
  const app = command === 'test' ? await createApplication('fixture') : new VastApplication(new DeterministicParser());
  const parsedInput = (() => { try { const value = JSON.parse(text); return value && typeof value === 'object' && (value as { schemaVersion?: string }).schemaVersion === '2.2.1' ? value as any : undefined; } catch { return undefined; } })();
  if (command === 'parse') { const parsed = await app.parse221(text); const data = { proposal: parsed.proposal, parser: parsed.parser, warnings: parsed.warnings }; writeStdout(formatJson(envelope('vast.semantic-proposal', data))); return validateProposal(parsed.proposal).status === 'PASS' ? 0 : 4; }
  if (command === 'plan') { const compiled = parsedInput ? await app.compileContract221(parsedInput, { renderer: typeof values.renderer === 'string' ? values.renderer : 'mock' }) : await app.compile221(text, { renderer: typeof values.renderer === 'string' ? values.renderer : 'mock' }); writeStdout(formatJson(envelope('vast.aesthetic-plan', { contract: compiled.contract, plan: compiled.plan }))); return 0; }
  if (command === 'compile' && typeof values.renderer === 'string') { const compiled = parsedInput ? await app.compileContract221(parsedInput, { renderer: values.renderer, staged: values.staged === 'on' || values.staged === 'off' ? values.staged : 'auto', image: imageOptions(values) }) : await app.compile221(text, { renderer: values.renderer, staged: values.staged === 'on' || values.staged === 'off' ? values.staged : 'auto', image: imageOptions(values) }); writeStdout(formatJson(envelope('vast.render-intent', compiled.intent))); return compiled.intent.staging.level === 'unsupported' ? 10 : 0; }
  if (command === 'render') { const result = await app.render221(text, { renderer: typeof values.renderer === 'string' ? values.renderer : 'mock', staged: values.staged === 'on' || values.staged === 'off' ? values.staged : 'auto', image: imageOptions(values) }); writeStdout(formatJson(envelope('vast.render-result', { runId: result.runId, render: result.record.render, evaluation: result.record.evaluation }))); if (result.record.render?.success) return 0; return result.record.render?.error?.code === 'IMAGE_CLI_UNAVAILABLE' ? 5 : 6; }
  if (command === 'evaluate') { const result = await app.evaluate221(text.trim()); writeStdout(formatJson(envelope('vast.evaluation-result', result))); return result.status === 'PASS' ? 0 : 7; }
  if (command === 'revise') { const result = await app.revise221(text.trim(), typeof values['max-rounds'] === 'string' ? Number(values['max-rounds']) : 2); writeStdout(formatJson(envelope('vast.revision-result', result))); return 0; }
  if (command === 'inspect-run') { writeStdout(formatJson(await app.inspectRun(text.trim()))); return 0; }
  if (command === 'doctor') { writeStdout(formatJson(envelope('vast.doctor', await app.doctor()))); return 0; }
  if (command === 'test') { const suite = typeof values.suite === 'string' ? values.suite : 'all'; const regression = await app.regression({}); const structural = await app.render221('a simple abstract shape', { renderer: 'mock' }); const live = suite === 'live-render' || suite === 'all' ? await app.render221('a simple abstract shape', { renderer: 'image-cli', image: imageOptions(values) }) : undefined; const suites = await runOfflineSuites(); const result = { suite, status: regression.status === 'PASS' && Boolean(structural.record.render?.success) && (suite !== 'live-render' || Boolean(live?.record.render?.success)) ? 'PASS' : 'FAIL', regression, suites, adapter: { mock: structural.record.render, live: live?.record.render } }; writeStdout(formatJson(envelope('vast.test-result', result))); return result.status === 'PASS' ? 0 : suite === 'live-render' ? 10 : 8; }
  throw new VastError(ErrorCode.INPUT_ERROR, `Unknown command ${command}`);
}

async function legacy(argv: string[], command: string, values: Record<string, unknown>): Promise<number> {
  if (command === 'version') { writeStdout(`VAST Core ${VAST_VERSION}\nSchema ${SCHEMA_VERSION}\nCLI 0.1.0\nVAST Core 2.0.2 compatibility / Schema 1\n`); return 0; }
  if (!command || !['inspect', 'compile', 'validate', 'regression'].includes(command)) throw new VastError(ErrorCode.INPUT_ERROR, 'Usage: vast parse|plan|compile|render|evaluate|revise|inspect-run|test|doctor ...');
  if (command === 'regression') { const result = await (await createApplication('fixture')).regression({ caseId: typeof values.case === 'string' ? values.case : undefined, layer: typeof values.layer === 'string' ? values.layer : undefined }); writeStdout(values.json ? formatJson(result) : formatRegressionHuman(result)); return result.status === 'PASS' ? 0 : ErrorCode.VALIDATION_FAILED; }
  if (command === 'validate') { const source = await readInput(argv[1]); let value: unknown; try { value = JSON.parse(source); } catch { throw new VastError(ErrorCode.INPUT_ERROR, 'validate expects JSON AST or Envelope'); } if (value && typeof value === 'object' && 'data' in value) value = (value as { data: unknown }).data; if (value && typeof value === 'object' && (value as { schemaVersion?: string }).schemaVersion === '2.2.1') { const result = validateContract(value as any); writeStdout(values.json ? formatJson(envelope('vast.validation-result', result)) : formatValidationHuman(result)); return result.status === 'PASS' ? 0 : 3; } const ast = VisualASTSchema.parse(value); let contract; if (typeof values.contract === 'string') { const contractValue = JSON.parse(await readFile(values.contract, 'utf8')) as unknown; contract = SceneContractSchema.parse(contractValue && typeof contractValue === 'object' && 'data' in contractValue ? (contractValue as { data: unknown }).data : contractValue); } const result = await (await createApplication('fixture')).validate({ ast, contract }); writeStdout(values.json ? formatJson(envelope('vast.validation-result', result)) : formatValidationHuman(result)); return result.status === 'PASS' ? 0 : ErrorCode.VALIDATION_FAILED; }
  const source = await sceneText(argv[1]); return dispatchScene(command, source, values);
}
async function dispatchScene(command: string, text: string, values: Record<string, unknown>): Promise<number> { const parser = typeof values.parser === 'string' ? values.parser : 'default'; const app = await createApplication(parser); const mode = values.mode === 'notice-only' || values.mode === 'strict' || values.mode === 'interactive' ? values.mode : 'interactive'; const acknowledgements = Array.isArray(values.ack) ? values.ack : typeof values.ack === 'string' ? [values.ack] : []; if (command === 'inspect') { let response = await app.inspect({ text, mode, acknowledgedIssueIds: acknowledgements, parserProfile: parser }); if (response.guard.decision === 'PAUSE' && mode === 'interactive' && isTTY()) response = await app.inspect({ text, mode, acknowledgedIssueIds: await interactiveAcknowledgement(response.guard.issues.filter((x) => x.severity === 'warning')), parserProfile: parser }); writeStdout(values.json ? formatJson(envelope('vast.intent-diagnostics', response.guard)) : formatInspectHuman(response)); return guardExit(response.guard.decision); } let response = await app.compile({ text, mode, acknowledgedIssueIds: acknowledgements, format: values.format as 'prompt' | 'render-intent' | 'ast' | 'contract' | 'full' | undefined, parserProfile: parser }); if (response.guard.decision === 'PAUSE' && mode === 'interactive' && isTTY()) response = await app.compile({ text, mode, acknowledgedIssueIds: await interactiveAcknowledgement(response.guard.issues.filter((x) => x.severity === 'warning')), format: values.format as 'prompt' | 'render-intent' | 'ast' | 'contract' | 'full' | undefined, parserProfile: parser }); if (response.guard.decision !== 'CONTINUE') { writeStdout(values.json ? formatJson(envelope('vast.compile-result', response)) : formatInspectHuman({ guard: response.guard, parser: { adapter: parser, schemaVersion: '2.2.1' }, warnings: [] })); return guardExit(response.guard.decision); } if (response.validation?.status === 'FAIL') { writeStdout(values.json ? formatJson(envelope('vast.compile-result', response)) : formatValidationHuman(response.validation)); return ErrorCode.VALIDATION_FAILED; } const format = typeof values.format === 'string' ? values.format : 'full'; let content = values.json ? formatJson(compileEnvelope(response, format)) : formatCompileHuman(response, format); if (!values.json && format === 'render-intent') content = formatJson(envelope('vast.render-intent', response.renderIntent)); if (!values.json && format === 'ast') content = formatJson(envelope('vast.visual-ast', response.ast)); if (!values.json && format === 'contract') content = formatJson(envelope('vast.scene-contract', response.contract)); if (typeof values.out === 'string' && values.out !== '-') await writeAtomically(values.out, content); else writeStdout(content); return 0; }
export { main };
async function main(argv = process.argv.slice(2)): Promise<number> {
  const { positionals, values } = parsedArgs(argv);
  const command = positionals[0];
  if (values.help === true || command === 'help' || command === '--help' || !command) { writeStdout('VAST 2.2.1 CLI\nCommands: parse validate plan compile render evaluate revise inspect test doctor version\nUse --json for machine-readable output.\n'); return 0; }
  const modernCommands = ['parse', 'plan', 'render', 'evaluate', 'revise', 'inspect-run', 'test', 'doctor'];
  const runCommand = command === 'inspect' && typeof positionals[1] === 'string' && /^run_/.test(positionals[1]);
  try {
    if (modernCommands.includes(command) || runCommand || (command === 'compile' && typeof values.renderer === 'string')) {
      const payload = ['evaluate', 'revise', 'inspect-run'].includes(command) || runCommand ? String(positionals[1] ?? '') : await sceneText(positionals[1]);
      return await modern(runCommand ? 'inspect-run' : command, payload, values as Record<string, unknown>);
    }
    return await legacy(argv, command, values as Record<string, unknown>);
  } catch (error) {
    const message = error instanceof VastError || error instanceof ParserAdapterError ? error.message : error instanceof Error ? error.message : 'Unknown error';
    writeStderr(`vast: ${message}`);
    return error instanceof VastError ? error.code : error instanceof ParserAdapterError ? ErrorCode.PARSER_ERROR : error instanceof Error && error.name === 'ZodError' ? ErrorCode.INPUT_ERROR : ErrorCode.INTERNAL_ERROR;
  }
}
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/main.ts') || process.argv[1]?.replace(/\\/g, '/').endsWith('/main.js')) process.exitCode = await main();