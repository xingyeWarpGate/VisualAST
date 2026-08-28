import type { IntentDraft, SceneContract } from './types.js';

export function normalizeContract(draft: IntentDraft, decisions: Record<string, string> = {}): SceneContract {
  return { ...draft, requiredEntities: [...draft.requiredEntities], optionalEntities: [...draft.optionalEntities], forbiddenEntities: [...draft.forbiddenEntities], requiredStates: [...draft.requiredStates], requiredRelations: [...draft.requiredRelations], frozen: true, decisions: { ...decisions } };
}

export { buildVisualAst } from './ast.js';
