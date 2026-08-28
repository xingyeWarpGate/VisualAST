import { parseIntentDraft } from '../../domain/schemas.js';
import type { EntitySpec, IntentDraft, ParseRequest, ParseResult, ParserPort } from '../../domain/types.js';

const entity = (id: string, type: string, presence: EntitySpec['presence'] = 'required', extra: Partial<EntitySpec> = {}): EntitySpec => ({ id, type, label: type, presence, identityLock: true, ...extra });
const grammar = (name: string) => ({ name, actions: [`${name} drawing grammar`, 'selective detail', 'no unrequested embellishment'] });

export function fixtureDraft(caseId = 'demo'): IntentDraft {
  const common = { requiredEntities: [] as EntitySpec[], optionalEntities: [] as EntitySpec[], forbiddenEntities: [] as EntitySpec[], requiredStates: [], requiredRelations: [], layers: [], motions: [], narrativeProps: [], scaleConstraints: [], countConstraints: [], semanticOpenness: [], explicitPose: {}, explicitGaze: {}, outputModality: 'image' as const, palette: [], renderingGrammar: grammar('neutral') };
  switch (caseId.toLowerCase().replace(/^case[-_]?/, 'case-')) {
    case 'case-01': return { ...common, sceneIdentity: '洪水中的黑色稻田与朱红木床', time: '夜晚', environment: '稀疏黑色水田', requiredEntities: [entity('entity.woman', '年轻女性'), entity('entity.bed', '木床', 'required', { renderingGrammarOverride: grammar('woodblock'), attentionRole: 'target' }), entity('entity.koi', '黑色锦鲤', 'optional', { count: { expected: 3, tolerance: 0, mode: 'exact', scope: 'entity' }, attentionRole: 'support' }), entity('entity.shrine', '远处白色小神龛', 'optional', { attentionRole: 'suppressor', detailBudget: 0.1 })], forbiddenEntities: [entity('entity.moon', '月亮', 'forbidden')], composition: { negativeSpace: 0.5 }, styleDomain: 'woodblock', renderingGrammar: grammar('woodblock'), palette: ['深靛蓝', '墨黑', '旧纸白', '朱红'], explicitPose: { 'entity.woman': 'upright; hands flat on knees' } };
    case 'case-02': return { ...common, sceneIdentity: '空的黄色教室', requiredEntities: [entity('entity.woman', '年轻女性', 'required', { attentionRole: 'target' }), entity('entity.desks', '绿色课桌', 'required', { count: { expected: 12, tolerance: 0, mode: 'exact', scope: 'entity' }, attentionRole: 'support' }), entity('entity.rabbit-headpiece', '白色兔子头套', 'required'), entity('entity.cake', '红色生日蛋糕', 'required', { attentionRole: 'support', detailBudget: 0.25 })], countConstraints: [{ expected: 12, tolerance: 0, mode: 'exact', scope: 'entity.desks' }], forbiddenEntities: [entity('entity.extra-person', '额外人物', 'forbidden')], styleDomain: 'crayon', renderingGrammar: grammar('crayon'), composition: { negativeSpace: 0.45 } };
    case 'case-03': return { ...common, sceneIdentity: '构成主义抽象科幻', requiredEntities: [entity('entity.circle', '纯抽象朱红圆形', 'required', { attentionRole: 'target' }), entity('entity.woman', '黑色简化宇航服中的女性'), entity('entity.lines', '黑色对角线', 'required', { count: { expected: 3, tolerance: 0, mode: 'exact', scope: 'entity' } }), entity('entity.square', '钴蓝色方形', 'required', { attentionRole: 'support' })], countConstraints: [{ expected: 3, tolerance: 0, mode: 'exact', scope: 'entity.lines' }], styleDomain: 'constructivist', renderingGrammar: grammar('constructivist'), composition: { negativeSpace: 0.35 } };
    case 'case-04': return { ...common, sceneIdentity: '宣纸上的极简水墨空白', requiredEntities: [entity('entity.woman', '年轻女性'), entity('entity.rock', '小黑石'), entity('entity.birds', '小鸟', 'required', { count: { expected: 7, tolerance: 0, mode: 'exact', scope: 'entity' } })], countConstraints: [{ expected: 7, tolerance: 0, mode: 'exact', scope: 'entity.birds' }], styleDomain: 'ink-wash', renderingGrammar: grammar('ink-wash'), composition: { negativeSpace: 0.75 } };
    case 'case-05': return { ...common, sceneIdentity: '立体主义多视角人物', requiredEntities: [entity('entity.woman', '坐着的年轻女性'), entity('entity.glass', '蓝色玻璃杯')], requiredRelations: [{ id: 'relation.woman-holds-glass', type: 'holds', subject: 'entity.woman', object: 'entity.glass' }], styleDomain: 'cubist', renderingGrammar: grammar('cubist') };
    case 'case-06': return { ...common, sceneIdentity: '异质材料拼贴女性', requiredEntities: [entity('entity.woman', '拼贴女性'), entity('entity.flower', '黄色纸花')], styleDomain: 'collage', renderingGrammar: grammar('collage') };
    case 'case-07': return { ...common, sceneIdentity: '流行漫画九宫格肖像', requiredEntities: [entity('entity.woman-portrait', '正面女性肖像', 'required', { count: { expected: 9, tolerance: 0, mode: 'exact', scope: 'entity' }, attentionRole: 'target' })], countConstraints: [{ expected: 9, tolerance: 0, mode: 'exact', scope: 'entity.woman-portrait' }], styleDomain: 'pop-comic', renderingGrammar: grammar('pop-comic'), composition: { framing: 'exact 3x3 grid', negativeSpace: 0.1 }, explicitPose: { 'entity.woman-portrait': 'frontal repeated identity' } };
    case 'case-08': return { ...common, sceneIdentity: '工程蓝图中的人体机械类比', requiredEntities: [entity('entity.woman', '生物学女性'), entity('entity.diagrams', '机械剖面图', 'required', { count: { expected: 6, tolerance: 0, mode: 'exact', scope: 'entity' } })], countConstraints: [{ expected: 6, tolerance: 0, mode: 'exact', scope: 'entity.diagrams' }], requiredRelations: [{ id: 'relation.diagram-explains-motion', type: 'explanatory_analogy', subject: 'entity.diagrams', object: 'entity.woman', constraints: { forbiddenRelation: 'part_of' } }], styleDomain: 'technical-drawing', renderingGrammar: grammar('technical-drawing') };
    case 'case-09': return { ...common, sceneIdentity: '荒地中的废弃下水管', environment: '荒地与保持开放语义的扭曲事物', requiredEntities: [entity('entity.girl', '长裙军装女孩', 'required', { attentionRole: 'target' }), entity('entity.pipe', '水平废弃下水管'), entity('entity.rifle', '能量步枪', 'required', { attentionRole: 'support' }), entity('entity.battery', '核电池', 'required', { attentionRole: 'support' })], requiredStates: [{ id: 'state.girl-curled', subjectId: 'entity.girl', value: '蜷缩', visibleConsequences: ['膝盖收拢', '身体位于管内'] }], requiredRelations: [{ id: 'relation.girl-inside-pipe', type: 'inside', subject: 'entity.girl', object: 'entity.pipe' }, { id: 'relation.battery-powers-rifle', type: 'powers', subject: 'entity.battery', object: 'entity.rifle' }], semanticOpenness: [{ id: 'openness.outside-anomalies', targetId: 'entity.outside-anomalies', semanticSpecificity: 'low', categoryLock: 'none', requiredProperty: ['distorted', 'ambiguous'], forbiddenNarrowing: ['monsters', 'creatures', 'identifiable_species'] }], optionalEntities: [entity('entity.outside-anomalies', '管外扭曲事物', 'optional', { semanticOpenness: { id: 'openness.outside-anomalies', targetId: 'entity.outside-anomalies', semanticSpecificity: 'low', categoryLock: 'none', requiredProperty: ['distorted', 'ambiguous'], forbiddenNarrowing: ['monsters', 'creatures', 'identifiable_species'] }, attentionRole: 'suppressor' })], layers: [{ id: 'layer.darkness', type: 'background', content: '管外深暗与模糊扭曲形体', contrastBudget: 0.1 }], lighting: undefined, styleDomain: 'cel', renderingGrammar: grammar('cel') } as IntentDraft;
    default: return { ...common, text: 'demo', sceneIdentity: '安静的日常室内场景', location: '普通房间', requiredEntities: [entity('entity.subject', '人物', 'required', { attentionRole: 'target' })], optionalEntities: [entity('entity.object', '生活物件', 'optional', { attentionRole: 'support' })], styleDomain: 'neutral', renderingGrammar: grammar('neutral'), composition: { negativeSpace: 0.2 } };
  }
}

function fixtureId(text: string): string {
  const explicit = /^fixture\s*:\s*([\w-]+)/i.exec(text.trim());
  if (explicit) return explicit[1]!;
  const match = /(?:^|[\\/])((?:case[-_]?\d+)|demo)(?:\.txt|\.json)?$/i.exec(text.trim());
  return match?.[1] ?? 'demo';
}

export class FixtureParser implements ParserPort {
  async parse(input: ParseRequest): Promise<ParseResult> {
    let draft: IntentDraft;
    try {
      const value = JSON.parse(input.text) as unknown;
      draft = parseIntentDraft(value);
    } catch {
      draft = parseIntentDraft(fixtureDraft(fixtureId(input.text)));
      draft = { ...draft, text: input.text };
    }
    return { draft, parser: { adapter: 'fixture', model: 'frozen-fixture', schemaVersion: '1' }, warnings: [] };
  }
}
