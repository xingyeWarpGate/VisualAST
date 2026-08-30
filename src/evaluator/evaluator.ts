import type { CanonicalSceneContract, EvaluationResult, RenderResult, RevisionPatch, RenderIntent221 } from '../domain/types.js';

export type EvaluationInput = { runId: string; contract: CanonicalSceneContract; intent: RenderIntent221; render: RenderResult };

export function evaluateRender(input: EvaluationInput): EvaluationResult {
  const defects: EvaluationResult['defects'] = [];
  if (!input.render.success || !input.render.imagePath) defects.push({ id: 'defect.render-failed', dimension: 'Constraint Fidelity', observation: input.render.error?.message ?? 'Renderer did not produce an image.', severity: 'high', confidence: 1, violatedNode: 'render.result', patch: { id: 'patch.retry-render', operations: [], targetDefects: ['defect.render-failed'], rationale: 'Renderer failure is not a semantic revision.', round: 1 } });
  const scores = Object.fromEntries(['Constraint Fidelity', 'Narrative Readability', 'Pose Dynamics', 'Physical Coherence', 'Composition', 'Rendering Grammar', 'Information Budget Compliance'].map((x) => [x, input.render.success ? 1 : 0]));
  return { schemaVersion: '2.2.1', runId: input.runId, status: defects.length ? 'FAIL' : 'PASS', scores, defects, evidence: input.render.success ? [`image:${input.render.imagePath}`] : [], humanReviewRequired: Boolean(input.render.success) };
}

export function revisionFor(result: EvaluationResult, round: number): RevisionPatch | undefined { const defect = result.defects.find((x) => x.severity !== 'low'); return defect ? { ...defect.patch, round, targetDefects: [defect.id] } : undefined; }
