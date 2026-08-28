import type { Diagnostic, EntitySpec, SceneContract, ValidationResult, VisualAST } from './types.js';

export type ValidationRule = { id: string; phase: 'pre-render'; appliesTo: string; validate: (contract: SceneContract, ast: VisualAST) => Diagnostic[] };
const fail = (code: string, message: string, path?: string, details?: Record<string, unknown>): Diagnostic => ({ code, message, severity: 'error', path, details });
const ids = (items: EntitySpec[]) => new Set(items.map((x) => x.id));

export const ruleRegistry: ValidationRule[] = [
  { id: 'entity-presence', phase: 'pre-render', appliesTo: 'entities', validate: (c, a) => { const actual = ids(a.entities); const ds: Diagnostic[] = []; for (const e of c.requiredEntities) if (!actual.has(e.id)) ds.push(fail('REQUIRED_ENTITY_MISSING', `缺少必需实体 ${e.id}`, `entities.${e.id}`)); for (const e of c.forbiddenEntities) if (actual.has(e.id)) ds.push(fail('FORBIDDEN_ENTITY_PRESENT', `出现禁用实体 ${e.id}`, `entities.${e.id}`)); return ds; } },
  { id: 'relations', phase: 'pre-render', appliesTo: 'relations', validate: (c, a) => c.requiredRelations.filter((r) => !a.relations.some((x) => x.id === r.id)).map((r) => fail('REQUIRED_RELATION_MISSING', `缺少必需关系 ${r.id}`, `relations.${r.id}`)) },
  { id: 'exact-count', phase: 'pre-render', appliesTo: 'counts', validate: (c, a) => { const ds: Diagnostic[] = []; for (const constraint of c.countConstraints ?? []) { const entity = a.entities.find((x) => x.id === constraint.scope); const found = entity?.count?.expected ?? a.entities.filter((x) => x.type === constraint.scope || x.id === constraint.scope).reduce((n, x) => n + (x.count?.expected ?? 1), 0); if (constraint.mode === 'exact' && found !== constraint.expected) ds.push(fail('EXACT_COUNT_MISMATCH', `实体 ${constraint.scope} 的声明计数与契约不一致`, `count.${constraint.scope}`, { expected: constraint.expected, found })); } return ds; } },
  { id: 'semantic-openness', phase: 'pre-render', appliesTo: 'semanticOpenness', validate: (c, a) => (c.semanticOpenness ?? []).flatMap((o) => { const target = a.entities.find((e) => e.id === o.targetId); return target && target.semanticOpenness?.semanticSpecificity !== o.semanticSpecificity ? [fail('SEMANTIC_OPENNESS_MISMATCH', `开放语义约束未保留 ${o.id}`, `semanticOpenness.${o.id}`)] : []; }) },
  { id: 'style-grammar', phase: 'pre-render', appliesTo: 'style', validate: (_c, a) => a.style.actions.length ? [] : [fail('STYLE_GRAMMAR_MISSING', 'Rendering Grammar 必须包含可执行 drawing actions', 'style')] },
  { id: 'output-isolation', phase: 'pre-render', appliesTo: 'render-intent', validate: (_c, a) => { const value = JSON.stringify(a); const forbidden = ['caseId', 'assertions', 'PASS', 'FAIL', 'intentDiagnostics', 'validatorResult', 'evaluatorResult']; return forbidden.some((x) => value.includes(x)) ? [fail('CONTROL_LAYER_LEAKAGE', '控制层或测试元数据泄漏到 AST/Render 输入')] : []; } },
];

export function validateVisualAst(contract: SceneContract, ast: VisualAST): ValidationResult {
  const diagnostics = ruleRegistry.flatMap((rule) => rule.validate(contract, ast));
  return { status: diagnostics.length ? 'FAIL' : 'PASS', diagnostics };
}
