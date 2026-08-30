import { IntentGuardResultSchema, RenderIntentSchema, ValidationResultSchema, VisualASTSchema, SceneContractSchema } from '../domain/schemas.js';
import type { CompileRequest, Envelope, IntentDiagnostic, IntentGuardResult, VisualAST } from '../domain/types.js';
import { VastApplication } from '../application/vast-application.js';

export type AgentTool = (input: unknown) => Promise<Envelope<unknown>> | Envelope<unknown>;
export type AgentTools = {
  'vast.inspect_intent': AgentTool;
  'vast.compile_intent': AgentTool;
  'vast.validate_ast': AgentTool;
  'vast.explain_diagnostic': AgentTool;
};

const envelope = <T>(kind: string, data: T): Envelope<T> => ({ vastVersion: '2.2.1', schemaVersion: '2.2.1', kind, data });
const objectInput = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Tool input must be an object'); return value as Record<string, unknown>; };

export function createAgentTools(application: VastApplication): AgentTools {
  return {
    'vast.inspect_intent': async (raw) => {
      const input = objectInput(raw);
      const text = typeof input.text === 'string' ? input.text : (() => { throw new TypeError('text is required'); })();
      const response = await application.inspect({ text, mode: input.mode === 'strict' ? 'strict' : 'interactive', acknowledgedIssueIds: Array.isArray(input.acknowledgedIssueIds) ? input.acknowledgedIssueIds.filter((x): x is string => typeof x === 'string') : [], parserProfile: typeof input.parserProfile === 'string' ? input.parserProfile : undefined });
      return envelope('vast.intent-diagnostics', IntentGuardResultSchema.parse(response.guard));
    },
    'vast.compile_intent': async (raw) => {
      const input = objectInput(raw);
      const request: CompileRequest = { text: typeof input.text === 'string' ? input.text : (() => { throw new TypeError('text is required'); })(), mode: input.mode === 'strict' ? 'strict' : 'interactive', acknowledgedIssueIds: Array.isArray(input.acknowledgedIssueIds) ? input.acknowledgedIssueIds.filter((x): x is string => typeof x === 'string') : [], parserProfile: typeof input.parserProfile === 'string' ? input.parserProfile : undefined, format: input.format === 'ast' || input.format === 'contract' || input.format === 'render-intent' || input.format === 'prompt' || input.format === 'full' ? input.format : 'render-intent' };
      const response = await application.compile(request);
      return response.guard.decision === 'CONTINUE' && response.validation?.status === 'PASS' && response.renderIntent
        ? envelope('vast.render-intent', RenderIntentSchema.parse(response.renderIntent))
        : envelope('vast.compile-result', response);
    },
    'vast.validate_ast': async (raw) => {
      const input = objectInput(raw);
      const astValue = input.ast && typeof input.ast === 'object' && 'data' in input.ast ? (input.ast as { data: unknown }).data : input.ast;
      const ast = VisualASTSchema.parse(astValue);
      const contractValue = input.contract && typeof input.contract === 'object' && 'data' in input.contract ? (input.contract as { data: unknown }).data : input.contract;
      const contract = contractValue === undefined ? undefined : SceneContractSchema.parse(contractValue);
      const result = await application.validate({ ast, contract });
      return envelope('vast.validation-result', ValidationResultSchema.parse(result));
    },
    'vast.explain_diagnostic': (raw) => {
      const input = objectInput(raw);
      const code = input.code;
      if (typeof code !== 'string') throw new TypeError('code is required');
      const help = application.explainDiagnostic(code as IntentDiagnostic);
      return envelope('vast.diagnostic-help', help);
    },
  };
}

export function toolNames(tools: AgentTools): string[] { return Object.keys(tools); }
