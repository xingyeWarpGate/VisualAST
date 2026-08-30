import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import holdout from './holdout-cases.json' with { type: 'json' };
import { VastApplication } from '../dist/application/vast-application.js';
import { DeterministicParser } from '../dist/runtime/semantic-runtime.js';
import { validateContract } from '../dist/core/constraint-core.js';
import { complexityGate } from '../dist/compiler/compiler-221.js';
import { AestheticPlanSchema, CanonicalSceneContract221Schema, RenderIntent221Schema, SemanticProposalSchema } from '../dist/domain/schemas.js';
import { ImageCliRendererAdapter } from '../dist/adapters/renderer/image-cli-adapter.js';
import { evaluateRender } from '../dist/evaluator/evaluator.js';
import { RunStore } from '../dist/infrastructure/run-store.js';

const app = new VastApplication(new DeterministicParser());

test('versioned proposal, contract, plan and intent pass runtime schemas', async () => {
  const result = await app.compile221('两位旅人在巨大海螺里喝茶，正方形水彩风格，禁止文字。', { renderer: 'mock' });
  assert.equal(SemanticProposalSchema.parse(result.proposal).schemaVersion, '2.2.1');
  assert.equal(CanonicalSceneContract221Schema.parse(result.contract).schemaVersion, '2.2.1');
  assert.equal(AestheticPlanSchema.parse(result.plan).schemaVersion, '2.2.1');
  assert.equal(RenderIntent221Schema.parse(result.intent).schemaVersion, '2.2.1');
});

test('forbidden entities never enter positive mappings or focal hierarchy', async () => {
  const result = await app.compile221('一位女性推着自行车，禁止汽车和文字。', { renderer: 'mock' });
  const positive = JSON.stringify(result.intent.entityMappings);
  assert.equal(positive.includes('汽车'), false);
  assert.equal(positive.includes('文字'), false);
  assert.equal(result.intent.negativeConstraints.some((x) => x.includes('汽车')), true);
  const forbiddenIds = new Set(result.contract.presence.filter((x) => x.presence === 'forbidden').map((x) => x.targetId));
  assert.equal(result.plan.focalHierarchy.some((x) => forbiddenIds.has(x.targetId)), false);
});

test('complexity gate is deterministic at all thresholds', () => {
  const base = { entityCount: 1, hardConstraintCount: 1, relationCount: 0, highPrecisionRegions: 0, physicsEvents: 0, lightSources: 1, textBrandRequirements: 0, styleRequirements: 1, negativeConstraints: 0, estimatedConceptDensity: 8 };
  assert.equal(complexityGate(base, { threshold: 24 }), 'single_pass');
  assert.equal(complexityGate({ ...base, entityCount: 5, relationCount: 2 }, { threshold: 24 }), 'staged_required');
  assert.equal(complexityGate({ ...base, estimatedConceptDensity: 40 }, { threshold: 24 }), 'unsupported');
});

test('contract validator catches unknown event and count targets', async () => {
  const result = await app.compile221('一只猫在桌子旁。', { renderer: 'mock' });
  const invalid = { ...result.contract, events: [{ id: 'event.bad', type: 'jump', participants: ['entity.missing'], consequences: [] }], counts: [{ targetId: 'entity.missing', expected: 2, tolerance: 0, mode: 'exact' }] };
  const validation = validateContract(invalid);
  assert.equal(validation.status, 'FAIL');
  assert.deepEqual(new Set(validation.diagnostics.map((x) => x.code)), new Set(['EVENT_PARTICIPANT_MISSING', 'COUNT_TARGET_MISSING']));
});

test('image-cli adapter rejects unsupported quality before invocation', async () => {
  const compiled = await app.compile221('一只猫。', { renderer: 'mock' });
  const adapter = new ImageCliRendererAdapter();
  const request = { ...adapter.lower(compiled.intent), quality: 'high' };
  const validation = adapter.validateRequest(request);
  assert.equal(validation.status, 'FAIL');
  assert.equal(validation.diagnostics[0].code, 'UNSUPPORTED_QUALITY');
});

test('render failure evaluator produces observable typed defect', async () => {
  const compiled = await app.compile221('一只猫。', { renderer: 'mock' });
  const evaluation = evaluateRender({ runId: 'run_test', contract: compiled.contract, intent: compiled.intent, render: { success: false, adapterId: 'image-cli', modality: 'text', inputImageCount: 0, metadata: {}, error: { code: 'AUTH', message: 'authentication unavailable' } } });
  assert.equal(evaluation.status, 'FAIL');
  assert.equal(evaluation.defects[0].severity, 'high');
  assert.equal(evaluation.defects[0].patch.targetDefects[0], evaluation.defects[0].id);
});

test('run store round-trips a complete record', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'vast-221-'));
  try {
    const compiled = await app.compile221('一只猫。', { renderer: 'mock' });
    const store = new RunStore(directory);
    const record = { runId: 'run_store', createdAt: new Date(0).toISOString(), input: '一只猫。', contract: compiled.contract, aestheticPlan: compiled.plan, renderIntent: compiled.intent, adapter: compiled.adapter.capabilities(), revisions: [] };
    await store.save(record);
    assert.deepEqual(await store.load(record.runId), record);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

for (const item of holdout) test(`holdout ${item.id}`, async () => {
  const result = await app.compile221(item.text, { renderer: 'mock' });
  const present = new Set(result.contract.entities.filter((entity) => result.contract.presence.find((presence) => presence.targetId === entity.id)?.presence !== 'forbidden').map((entity) => entity.type));
  for (const type of item.requiredTypes) assert.equal(present.has(type), true, `${item.id} missing ${type}`);
  for (const forbidden of item.forbidden) assert.equal(result.contract.forbiddenOutcomes.some((x) => x.target === forbidden), true, `${item.id} missing forbidden ${forbidden}`);
  if (item.count) assert.equal(result.contract.counts.some((x) => result.contract.entities.find((entity) => entity.id === x.targetId)?.type === item.count.type && x.expected === item.count.expected), true, `${item.id} count mismatch`);
  assert.equal(result.validation.status, 'PASS');
});
