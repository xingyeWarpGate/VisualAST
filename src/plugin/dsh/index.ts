import { DeterministicParser } from '../../runtime/semantic-runtime.js';
import { VastApplication } from '../../application/vast-application.js';
import { createAgentTools, type AgentTools } from '../tools.js';

/** Current DSH/Cordis plugin entrypoint shape confirmed from DSH docs and plugins. */
export const name = 'vast-cli-plugin';
export const inject = ['tools'] as const;

type RenderedContent = Array<{ type: 'text'; text: string }>;
type DshToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  output: { schema: Record<string, unknown>; render: (args: unknown, value: unknown) => RenderedContent };
  timeoutMs: number;
  execute: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown>;
};
export type DshContext = { tools: { register(definition: DshToolDefinition): () => void }; effect?(factory: () => void | (() => void), label?: string): unknown };

const objectParameters = (properties: Record<string, unknown>, required: string[] = []): Record<string, unknown> => ({ type: 'object', additionalProperties: false, properties, ...(required.length ? { required } : {}) });
const objectOutput = { type: 'object', additionalProperties: true };
const text = { type: 'string' };
const stringArray = { type: 'array', items: { type: 'string' } };

function definition(name: keyof AgentTools, description: string, parameters: Record<string, unknown>, execute: (args: unknown, exec: { signal: AbortSignal }) => Promise<unknown>): DshToolDefinition {
  return { name, description, parameters, output: { schema: objectOutput, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] }, timeoutMs: 120000, execute };
}

function dshDefinitions(tools: AgentTools): DshToolDefinition[] {
  return [
    definition('vast.inspect_intent', 'Inspect visual intent and return deterministic VAST Guard diagnostics.', objectParameters({ text, mode: { type: 'string', enum: ['strict', 'notice-only'] }, acknowledgedIssueIds: stringArray, parserProfile: text }, ['text']), (args, exec) => tools['vast.inspect_intent'](args) as Promise<unknown>),
    definition('vast.compile_intent', 'Compile visual intent into a validated renderer-neutral VAST RenderIntent.', objectParameters({ text, mode: { type: 'string', enum: ['strict', 'notice-only'] }, acknowledgedIssueIds: stringArray, parserProfile: text, format: { type: 'string', enum: ['prompt', 'render-intent', 'ast', 'contract', 'full'] } }, ['text']), (args, exec) => tools['vast.compile_intent'](args) as Promise<unknown>),
    definition('vast.validate_ast', 'Validate a VAST VisualAST without invoking a parser or renderer.', objectParameters({ ast: { type: 'object', additionalProperties: true }, contract: { type: 'object', additionalProperties: true } }, ['ast']), (args, exec) => tools['vast.validate_ast'](args) as Promise<unknown>),
    definition('vast.explain_diagnostic', 'Explain one VAST Guard diagnostic code and its safe next action.', objectParameters({ code: text }, ['code']), (args, exec) => tools['vast.explain_diagnostic'](args) as Promise<unknown>),
  ];
}

export function createDshTools(): AgentTools {
  return createAgentTools(new VastApplication(new DeterministicParser()));
}

/**
 * The current DSH public contract exposes plugin services through Cordis.
 * The adapter contributes one named service; it does not invent a Fabric
 * manifest or shell out to the `vast` CLI.
 */
export function apply(ctx: DshContext): void {
  const tools = createDshTools();
  const disposers = dshDefinitions(tools).map((definition) => ctx.tools.register(definition));
  ctx.effect?.(() => () => { for (const dispose of disposers) dispose(); }, 'vast: agent tools');
}

export default { name, inject, apply };
