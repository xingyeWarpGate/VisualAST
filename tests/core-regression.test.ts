import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FixtureParser } from '../src/adapters/parser/fixture-parser.js';
import { VastApplication } from '../src/application/vast-application.js';
import { CORE_CASE_IDS } from '../src/regression/runner.js';

const app = new VastApplication(new FixtureParser());

test('Core migration gate contains the frozen nine-case lineage', () => {
  assert.deepEqual(CORE_CASE_IDS, ['case-01', 'case-02', 'case-03', 'case-04', 'case-05', 'case-06', 'case-07', 'case-08', 'case-09']);
});
test('Core migration gate remains headless', () => {
  assert.equal(typeof app.compile, 'function');
  assert.equal(typeof app.validate, 'function');
});
test('Core migration gate exposes renderer-neutral output', async () => {
  const result = await app.compile({ text: 'fixture:demo', mode: 'notice-only' });
  assert.equal(result.renderIntent?.kind, 'vast.render-intent');
});
test('Core migration gate uses the canonical version constants', async () => {
  const result = await app.compile({ text: 'fixture:demo', mode: 'notice-only' });
  assert.equal(result.ast?.kind, 'vast.visual-ast');
});

for (const caseId of CORE_CASE_IDS) {
  test(`Core migration ${caseId}: parses and compiles`, async () => {
    const result = await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    assert.equal(result.guard.decision, 'CONTINUE');
    assert.equal(result.validation?.status, 'PASS');
    assert.ok(result.renderIntent);
  });
  test(`Core migration ${caseId}: preserves renderer boundary`, async () => {
    const result = await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    const output = JSON.stringify(result.renderIntent);
    for (const key of ['caseId', 'assertions', 'PASS', 'FAIL', 'intentDiagnostics', 'validatorResult']) assert.equal(output.includes(key), false, `${key} leaked for ${caseId}`);
  });
  test(`Core migration ${caseId}: keeps stable envelope-compatible kind`, async () => {
    const result = await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    assert.equal(result.ast?.kind, 'vast.visual-ast');
    assert.equal(result.renderIntent?.kind, 'vast.render-intent');
  });
  test(`Core migration ${caseId}: does not mutate fixture draft`, async () => {
    const parser = new FixtureParser();
    const before = await parser.parse({ text: `fixture:${caseId}` });
    const snapshot = JSON.stringify(before.draft);
    await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    const after = await parser.parse({ text: `fixture:${caseId}` });
    assert.equal(JSON.stringify(after.draft), snapshot);
  });
}
