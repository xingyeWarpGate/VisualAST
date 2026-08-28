import { grammarFor } from './grammar-budget.js';
import type { AttentionSpec, SceneContract, VisualAST } from './types.js';

const stableId = (prefix: string, value: string, index: number) => value.startsWith(`${prefix}.`) ? value : `${prefix}.${value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-') || index}`;

function attentionFor(contract: SceneContract): AttentionSpec[] {
  const entities = [...contract.requiredEntities, ...contract.optionalEntities];
  return entities.map((entity, index) => ({
    id: `attention.${entity.id.replace(/^[^.]+\./, '')}`,
    targetId: entity.id,
    role: entity.attentionRole ?? (index === 0 ? 'target' : 'support'),
    semanticPriority: entity.attentionRole === 'target' ? 1 : Math.max(0.1, 0.8 - index * 0.1),
    visualPriority: entity.attentionRole === 'suppressor' ? 0.1 : entity.attentionRole === 'target' ? 1 : 0.5,
    detailBudget: entity.detailBudget ?? (entity.attentionRole === 'target' ? 0.9 : 0.35),
    contrastBudget: entity.attentionRole === 'target' ? 0.9 : 0.3,
    occupancyBudget: entity.occupancyBudget ?? 0.3,
    saturationBudget: 0.5,
    sharpnessBudget: entity.attentionRole === 'target' ? 0.9 : 0.35,
    edgeDefinition: entity.attentionRole === 'target' ? 0.9 : 0.4,
  }));
}

export function buildVisualAst(contract: SceneContract): VisualAST {
  const required = contract.requiredEntities.map((entity, index) => ({ ...entity, id: stableId('entity', entity.id, index) }));
  const optional = contract.optionalEntities.map((entity, index) => ({ ...entity, id: stableId('entity', entity.id, required.length + index) }));
  const forbidden = contract.forbiddenEntities.map((entity, index) => ({ ...entity, id: stableId('entity', entity.id, required.length + optional.length + index) }));
  const all = [...required, ...optional];
  const idMap = new Map(contract.requiredEntities.concat(contract.optionalEntities).map((item, index) => [item.id, all[index]?.id ?? item.id]));
  const relations = contract.requiredRelations.map((relation, index) => ({ ...relation, id: stableId('relation', relation.id, index), subject: idMap.get(relation.subject) ?? relation.subject, object: idMap.get(relation.object) ?? relation.object }));
  const states = contract.requiredStates.map((state, index) => ({ ...state, id: stableId('state', state.id, index), subjectId: state.subjectId ? idMap.get(state.subjectId) ?? state.subjectId : undefined }));
  const style = grammarFor(contract.styleDomain, contract.renderingGrammar);
  return {
    kind: 'vast.visual-ast',
    scene: { identity: contract.sceneIdentity, location: contract.location, time: contract.time, environment: contract.environment, outputModality: contract.outputModality ?? 'image' },
    entities: all, forbiddenEntities: forbidden, states, relations, layers: contract.layers ?? [], motions: contract.motions ?? [], attention: attentionFor({ ...contract, requiredEntities: all.filter((x) => x.presence === 'required'), optionalEntities: all.filter((x) => x.presence === 'optional') }), composition: contract.composition ?? {}, lighting: [], frequency: [], narrativeProps: contract.narrativeProps ?? [], style, semanticOpenness: contract.semanticOpenness ?? [], scaleConstraints: contract.scaleConstraints ?? [], countConstraints: contract.countConstraints ?? [], explicitPose: contract.explicitPose ?? {}, explicitGaze: contract.explicitGaze ?? {}, palette: contract.palette ?? [], provenance: contract.provenance,
  };
}
