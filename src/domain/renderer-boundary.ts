import type { RenderIntent } from './types.js';

const forbiddenKeys = new Set(['caseId', 'assertions', 'scores', 'PASS', 'FAIL', 'validatorResult', 'evaluatorResult', 'intentDiagnostics', 'report', 'testReport', 'processDescription', 'ast', 'guard']);

export function sanitizeRenderIntent(intent: RenderIntent): RenderIntent {
  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(clean);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !forbiddenKeys.has(key)).map(([key, val]) => [key, clean(val)]));
  };
  return clean(intent) as RenderIntent;
}
