import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FixtureParser } from '../src/adapters/parser/fixture-parser.js';
import { VastApplication } from '../src/application/vast-application.js';
import { createAgentTools, toolNames } from '../src/plugin/tools.js';
import { apply as applyDsh } from '../src/plugin/dsh/index.js';
import * as packageRoot from '../src/index.js';

test('Agent tool registry exposes exactly four stable tools', () => {
  const tools = createAgentTools(new VastApplication(new FixtureParser()));
  assert.deepEqual(toolNames(tools).sort(), ['vast.compile_intent', 'vast.explain_diagnostic', 'vast.inspect_intent', 'vast.validate_ast']);
});

test('Plugin and CLI Application API are semantically equivalent for a fixture', async () => {
  const app = new VastApplication(new FixtureParser());
  const tools = createAgentTools(app);
  const pluginResult = await tools['vast.compile_intent']({ text: 'fixture:case-09' });
  const cliResult = await app.compile({ text: 'fixture:case-09', mode: 'notice-only' });
  assert.equal(pluginResult.kind, 'vast.render-intent');
  assert.equal((pluginResult.data as { kind: string }).kind, cliResult.renderIntent?.kind);
});

test('Plugin does not auto-acknowledge warnings', async () => {
  const tools = createAgentTools(new VastApplication(new FixtureParser()));
  const result = await tools['vast.inspect_intent']({ text: JSON.stringify({ requiredEntities: [], optionalEntities: [], forbiddenEntities: [], requiredStates: [], requiredRelations: [], attentionCompetition: ['a', 'b'] }) });
  assert.equal((result.data as { decision: string }).decision, 'PAUSE');
});

test('Plugin RenderIntent excludes guard and test metadata', async () => {
  const tools = createAgentTools(new VastApplication(new FixtureParser()));
  const result = await tools['vast.compile_intent']({ text: 'fixture:demo' });
  const json = JSON.stringify(result.data);
  for (const key of ['guard', 'caseId', 'assertions', 'PASS', 'FAIL', 'intentDiagnostics']) {
    assert.equal(json.includes(key), false, `${key} leaked into plugin output`);
  }
  assert.equal((result.data as { kind: string }).kind, 'vast.render-intent');
});

test('DSH adapter registers definitions through the real ToolRuntime surface', () => {
  const definitions: Array<{ name: string; parameters: Record<string, unknown>; output: { schema: Record<string, unknown>; render: (args: unknown, value: unknown) => unknown }; execute: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown> }> = [];
  applyDsh({ tools: { register(definition) { definitions.push(definition); return () => undefined; } } });
  assert.deepEqual(definitions.map((x) => x.name).sort(), ['vast.compile_intent', 'vast.explain_diagnostic', 'vast.inspect_intent', 'vast.validate_ast']);
  assert.equal(definitions.every((x) => x.parameters.type === 'object' && x.output.schema.type === 'object'), true);
});

test('Package root exposes the DSH plugin entrypoint', () => {
  assert.equal(packageRoot.name, 'vast-cli-plugin');
  assert.equal(typeof packageRoot.apply, 'function');
  assert.ok(Array.isArray(packageRoot.inject));
});

test('DSH adapter does not shell out to CLI', async () => {
  const source = await readFile('src/plugin/dsh/index.ts', 'utf8');
  assert.equal(source.includes('child_process'), false);
  assert.equal(source.includes('exec('), false);
  assert.equal(source.includes('spawn('), false);
});
