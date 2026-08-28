import type { CompileResult, InspectResponse, RegressionResponse, ValidationResult } from '../domain/types.js';

export function formatInspectHuman(response: InspectResponse): string { return [`Guard: ${response.guard.decision}`, ...response.guard.issues.map((x) => `${x.severity.toUpperCase()} ${x.id}: ${x.consequence}`), `Parser: ${response.parser.adapter}`].join('\n') + '\n'; }
export function formatCompileHuman(response: CompileResult, format: string): string { if (format === 'prompt') return `${response.renderIntent?.prompt ?? ''}\n`; return `${JSON.stringify(response, null, 2)}\n`; }
export function formatValidationHuman(result: ValidationResult): string { return [`Validation: ${result.status}`, ...result.diagnostics.map((x) => `${x.severity.toUpperCase()} ${x.code}: ${x.message}`)].join('\n') + '\n'; }
export function formatRegressionHuman(result: RegressionResponse): string { return [`Regression: ${result.status}`, `Cases: ${result.passed}/${result.total}`, ...result.cases.map((x) => `${x.caseId}: ${x.status}`)].join('\n') + '\n'; }
