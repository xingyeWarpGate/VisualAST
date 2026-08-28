import { FixtureParser } from '../adapters/parser/fixture-parser.js';
import { VastApplication } from '../application/vast-application.js';
import type { Diagnostic, RegressionCaseResult, RegressionRequest, RegressionResponse } from '../domain/types.js';

export const CORE_CASE_IDS = ['case-01', 'case-02', 'case-03', 'case-04', 'case-05', 'case-06', 'case-07', 'case-08', 'case-09'] as const;

export async function runCoreRegression(request: RegressionRequest = {}): Promise<RegressionResponse> {
  const parser = new FixtureParser();
  const app = new VastApplication(parser);
  const selected = request.caseId ? CORE_CASE_IDS.filter((id) => id === request.caseId || id === `case-${request.caseId}`) : [...CORE_CASE_IDS];
  const cases: RegressionCaseResult[] = [];
  for (const caseId of selected) {
    const diagnostics: Diagnostic[] = [];
    const result = await app.compile({ text: `fixture:${caseId}`, mode: 'notice-only', format: 'full' });
    const checks = [
      result.guard.decision === 'CONTINUE',
      Boolean(result.contract),
      Boolean(result.ast),
      result.validation?.status === 'PASS',
      Boolean(result.renderIntent),
    ];
    if (!checks[0]) diagnostics.push({ code: 'GUARD_FAILED', message: `Fixture ${caseId} was blocked by Guard`, severity: 'error' });
    if (!checks[3]) diagnostics.push(...(result.validation?.diagnostics ?? [{ code: 'VALIDATION_FAILED', message: `Fixture ${caseId} failed validation`, severity: 'error' }]));
    cases.push({ caseId, status: checks.every(Boolean) ? 'PASS' : 'FAIL', checks: checks.length, diagnostics });
  }
  const passed = cases.filter((item) => item.status === 'PASS').length;
  return { status: passed === cases.length ? 'PASS' : 'FAIL', total: cases.length, passed, cases };
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/runner.ts')) {
  const result = await runCoreRegression({ caseId: process.argv.includes('--case') ? process.argv[process.argv.indexOf('--case') + 1] : undefined });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}
