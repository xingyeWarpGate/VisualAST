import type { RenderingGrammar, VisualAST } from './types.js';

export const GRAMMAR_ACTIONS: Record<string, string[]> = {
  anime: ['clean selective linework', 'quantized shading', 'reduced PBR', 'controlled edge hierarchy'],
  cel: ['clean selective linework', 'quantized shading', 'reduced PBR', 'controlled edge hierarchy'],
  woodblock: ['coarse black contour', 'flat fills', 'limited registration offset', 'sparse paper/ink irregularity'],
  screenprint: ['coarse black contour', 'flat fills', 'limited registration offset', 'sparse paper/ink irregularity'],
  crayon: ['uneven pressure', 'coarse irregular lines', 'incomplete fill gaps', 'no polished lineart'],
  'ink-wash': ['blank paper as semantic space', 'sparse concentrated strokes', 'graded ink', 'unpainted regions may represent water/sky'],
};

export function grammarFor(name = 'neutral', explicit?: RenderingGrammar): RenderingGrammar {
  return explicit ?? { name, actions: GRAMMAR_ACTIONS[name.toLowerCase()] ?? ['faithful visible forms', 'selective detail', 'no unrequested embellishment'] };
}

export function grammarForNode(ast: VisualAST, entityId: string): RenderingGrammar {
  const entity = ast.entities.find((x) => x.id === entityId);
  return entity?.renderingGrammarOverride ?? ast.style;
}
