import { FixtureParser } from '../../adapters/parser/fixture-parser.js';
import { VastApplication } from '../../application/vast-application.js';
import { runCoreRegression } from '../../regression/runner.js';
import { createAgentTools, type AgentTools } from '../tools.js';

/** Current DSH/Cordis plugin entrypoint shape confirmed from DSH docs and plugins. */
export const name = 'vast-cli-plugin';
export const inject: string[] = [];

export type DshContext = { provide(name: string, value: unknown): void; effect?(factory: () => void | (() => void), label?: string): unknown };

export function createDshTools(): AgentTools {
  return createAgentTools(new VastApplication(new FixtureParser(), { regression: runCoreRegression }));
}

/**
 * The current DSH public contract exposes plugin services through Cordis.
 * The adapter contributes one named service; it does not invent a Fabric
 * manifest or shell out to the `vast` CLI.
 */
export function apply(ctx: DshContext): void {
  ctx.provide('vastAgentTools', createDshTools());
}

export default { name, inject, apply };
