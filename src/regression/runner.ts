import { DeterministicParser } from '../runtime/semantic-runtime.js';
import { VastApplication } from '../application/vast-application.js';
import type { Diagnostic, RegressionCaseResult, RegressionRequest, RegressionResponse } from '../domain/types.js';

// Test identities are generated as data, not used by production compilation logic.
export const CORE_CASE_IDS = Array.from({ length: 9 }, (_, index) => `case-${String(index + 1).padStart(2, '0')}`);
export async function runCoreRegression(request: RegressionRequest = {}): Promise<RegressionResponse> {
  const app = new VastApplication(new DeterministicParser());
  const selected = request.caseId ? CORE_CASE_IDS.filter((id) => id === request.caseId || id === `case-${request.caseId}`) : CORE_CASE_IDS;
  const cases: RegressionCaseResult[] = [];
  for (const caseId of selected) {
    const diagnostics: Diagnostic[] = [];
    const result = await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    const checks = [result.guard.decision === 'CONTINUE', Boolean(result.contract), Boolean(result.ast), result.validation?.status === 'PASS', Boolean(result.renderIntent)];
    if (!checks[0]) diagnostics.push({ code: 'GUARD_FAILED', message: 'Regression input was blocked by Guard', severity: 'error' });
    if (!checks[3]) diagnostics.push(...(result.validation?.diagnostics ?? [{ code: 'VALIDATION_FAILED', message: 'Regression input failed validation', severity: 'error' }]));
    cases.push({ caseId, status: checks.every(Boolean) ? 'PASS' : 'FAIL', checks: checks.length, diagnostics });
  }
  const passed = cases.filter((item) => item.status === 'PASS').length;
  return { status: passed === cases.length ? 'PASS' : 'FAIL', total: cases.length, passed, cases };
}
if (process.argv[1]?.endsWith('runner.ts') || process.argv[1]?.endsWith('runner.js')) { const result = await runCoreRegression({ caseId: process.argv.includes('--case') ? process.argv[process.argv.indexOf('--case') + 1] : undefined }); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`); process.exitCode = result.status === 'PASS' ? 0 : 1; }