import { createHash } from 'node:crypto';
import type { EntitySpec, IntentDraft, ParserPort, ParseRequest, ParseResult, SemanticProposal, SourceEvidence, TypedOperation, Ambiguity, Assumption, OperationProvenance } from '../domain/types.js';

const explicit = (text: string, needle: string): OperationProvenance => { const start = text.indexOf(needle); return start >= 0 ? { kind: 'explicit_user', span: { start, end: start + needle.length, text: needle } } : { kind: 'safe_inference', rationale: `normalized from explicit source text as ${needle}` }; };
const id = (prefix: string, value: string) => `${prefix}.${value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/^-|-$/g, '') || 'unnamed'}`;

export function proposalFromDraft(draft: IntentDraft, sourceText = draft.text ?? ''): SemanticProposal {
  const operations: TypedOperation[] = [];
  const sourceEvidence: SourceEvidence[] = [];
  const entities = [...draft.requiredEntities, ...draft.optionalEntities, ...draft.forbiddenEntities];
  for (const entity of entities) {
    const provenance = explicit(sourceText, entity.label ?? entity.type);
    operations.push({ kind: 'declare_entity', id: entity.id, entityType: entity.type, label: entity.label ?? entity.type, presence: entity.presence, identityLock: entity.identityLock !== false, provenance, confidence: provenance.kind === 'explicit_user' ? 1 : 0.8 });
    sourceEvidence.push({ operationId: entity.id, provenance });
    if (entity.count) operations.push({ kind: 'declare_attribute', targetId: entity.id, attribute: 'count', value: String(entity.count.expected), hard: entity.count.mode === 'exact', provenance, confidence: 1 });
    if (entity.semanticOpenness) operations.push({ kind: 'declare_openness', targetId: entity.id, specificity: entity.semanticOpenness.semanticSpecificity, categoryLock: entity.semanticOpenness.categoryLock, forbiddenNarrowing: entity.semanticOpenness.forbiddenNarrowing, provenance, confidence: 1 });
    if (entity.attentionRole === 'target') operations.push({ kind: 'declare_saliency', targetId: entity.id, semantic: 1, visual: 1, provenance, confidence: 1 });
  }
  for (const relation of draft.requiredRelations) operations.push({ kind: 'declare_relation', id: relation.id, relation: relation.type, subject: relation.subject, object: relation.object, hard: true, provenance: explicit(sourceText, relation.type), confidence: 1 });
  for (const state of draft.requiredStates) {
    const provenance = explicit(sourceText, state.value);
    operations.push({ kind: 'declare_attribute', targetId: state.subjectId ?? state.id, attribute: 'state', value: state.value, hard: true, provenance, confidence: 1 });
    operations.push({ kind: 'declare_event', id: `event.${state.id}`, event: state.value, participants: state.subjectId ? [state.subjectId] : [state.id], consequences: state.visibleConsequences ?? [], provenance, confidence: 1 });
  }
  for (const motion of draft.motions ?? []) operations.push({ kind: 'declare_motion', id: motion.id, targetId: motion.id, motion: motion.content, direction: motion.direction, provenance: explicit(sourceText, motion.content), confidence: 1 });
  if (draft.styleDomain || draft.renderingGrammar) operations.push({ kind: 'declare_style_preference', style: draft.styleDomain ?? draft.renderingGrammar?.name ?? 'neutral', provenance: explicit(sourceText, draft.styleDomain ?? draft.renderingGrammar?.name ?? 'neutral'), confidence: 1 });
  for (const entity of draft.forbiddenEntities) operations.push({ kind: 'declare_forbidden', target: entity.type, provenance: explicit(sourceText, entity.label ?? entity.type), confidence: 1 });
  if (draft.sceneIdentity) operations.push({ kind: 'declare_attribute', targetId: 'scene', attribute: 'identity', value: draft.sceneIdentity, hard: true, provenance: explicit(sourceText, draft.sceneIdentity), confidence: 1 });
  for (const [targetId, pose] of Object.entries(draft.explicitPose ?? {})) operations.push({ kind: 'declare_attribute', targetId, attribute: 'pose', value: pose, hard: true, provenance: explicit(sourceText, pose), confidence: 1 });
  for (const [targetId, gaze] of Object.entries(draft.explicitGaze ?? {})) operations.push({ kind: 'declare_attribute', targetId, attribute: 'gaze', value: gaze, hard: true, provenance: explicit(sourceText, gaze), confidence: 1 });
  for (const color of draft.palette ?? []) operations.push({ kind: 'declare_attribute', targetId: 'scene', attribute: 'palette', value: color, hard: true, provenance: explicit(sourceText, color), confidence: 1 });
  for (const constraint of draft.countConstraints ?? []) operations.push({ kind: 'declare_attribute', targetId: constraint.scope, attribute: 'count', value: String(constraint.expected), hard: constraint.mode === 'exact', provenance: explicit(sourceText, String(constraint.expected)), confidence: 1 });
  const ambiguities: Ambiguity[] = (draft.semanticOpenness ?? []).filter((x) => x.semanticSpecificity === 'low').map((x) => ({ id: `ambiguity.${x.id}`, question: `What is ${x.targetId}?`, candidates: x.forbiddenNarrowing, confidence: 0.5, affectedNodes: [x.targetId] }));
  const assumptions: Assumption[] = [{ id: 'assumption.output-modality', statement: `Output modality defaults to ${draft.outputModality ?? 'image'}`, rationale: 'Renderer-neutral visual requests default to image output.', confidence: 0.95 }];
  return { schemaVersion: '2.2.1', operations, ambiguities, assumptions, sourceEvidence, confidence: operations.length ? operations.reduce((n, x) => n + x.confidence, 0) / operations.length : 0.3, sourceText };
}

function draftFromText(text: string): IntentDraft {
  const requiredEntities: EntitySpec[] = [];
  const forbiddenEntities: EntitySpec[] = [];
  const requiredRelations: IntentDraft['requiredRelations'] = [];
  const explicitPose: Record<string, string> = {};
  const lower = text.toLowerCase();
  const add = (type: string, label = type, presence: EntitySpec['presence'] = 'required') => { const entity: EntitySpec = { id: id('entity', type), type, label, presence, identityLock: true, attentionRole: requiredEntities.length ? 'support' : 'target' }; (presence === 'forbidden' ? forbiddenEntities : requiredEntities).push(entity); return entity; };
  const lexicon: Array<[RegExp, string, string]> = [
    [/橘猫|猫|cat/i, 'cat', /橘猫/.test(text) ? '橘猫' : 'cat'], [/狗|dog/i, 'dog', 'dog'], [/机械鸟|鸟|bird/i, 'bird', /机械鸟/.test(text) ? '机械鸟' : 'bird'],
    [/自行车|bicycle/i, 'bicycle', '自行车'], [/列车|火车|train/i, 'train', '列车'], [/单轨车站|车站|station/i, 'station', '车站'], [/站台|platform/i, 'platform', '站台'],
    [/修理师|mechanic/i, 'mechanic', '修理师'], [/天文学家|astronomer/i, 'astronomer', '天文学家'], [/园丁|gardener/i, 'gardener', '园丁'], [/旅人|旅行者|traveler/i, 'traveler', /旅行者/.test(text) ? '旅行者' : '旅人'],
    [/海螺|贝壳|shell/i, 'shell', '海螺'], [/茶壶|teapot/i, 'teapot', '茶壶'], [/温室|greenhouse/i, 'greenhouse', '温室'], [/植物|plant/i, 'plant', '植物'], [/天文台|observatory/i, 'observatory', '天文台'], [/星图|star map/i, 'star-map', '星图'],
    [/椅子|chair/i, 'chair', 'chair'], [/桌子|木桌|table/i, 'table', /木桌/.test(text) ? '木桌' : 'table'], [/房子|房间|house|room/i, 'room', 'room'], [/树|tree/i, 'tree', 'tree'], [/花|flower/i, 'flower', 'flower'], [/船|boat/i, 'boat', 'boat'], [/河|river/i, 'river', 'river'], [/山峰|山脉|mountain/i, 'mountain', 'mountain'], [/床|bed/i, 'bed', /木床/.test(text) ? '木床' : 'bed'], [/蛋糕|cake/i, 'cake', '蛋糕'], [/(?:一位|一个)人物|女性|woman|人物|person/i, 'person', /女性|woman/.test(text) ? '女性' : '人物'],
  ];
  for (const [pattern, type, label] of lexicon) if (pattern.test(text) && !requiredEntities.some((x) => x.type === type)) add(type, label);
  const relationToken = /旁边|相邻|beside|next to|near|靠近|里面|inside|上面|above|下方|below|拿着|holding|holds/.exec(lower);
  if (requiredEntities.length >= 2 && relationToken) requiredRelations.push({ id: `relation.${requiredEntities[0].id}-${requiredEntities[1].id}`, type: /旁边|相邻|beside|next to/i.test(relationToken[0]) ? 'beside' : /里面|inside/i.test(relationToken[0]) ? 'inside' : /拿着|holding|holds/i.test(relationToken[0]) ? 'holds' : 'near', subject: requiredEntities[0].id, object: requiredEntities[1].id });
  const person = requiredEntities.find((x) => x.type === 'person');
  if (person && /坐|seated|sitting/.test(lower)) explicitPose[person.id] = 'seated'; else if (person && /直立|站立|upright|standing/.test(lower)) explicitPose[person.id] = 'upright';
  for (const match of text.matchAll(/(?:禁止|不要|不出现|no|without)\s*([^，。,.]+)/gi)) for (const forbidden of match[1].split(/[、和与]|\band\b/i).map((x) => x.trim()).filter(Boolean)) forbiddenEntities.push({ id: id('entity', forbidden), type: forbidden, label: forbidden, presence: 'forbidden', identityLock: true });
  const chineseNumbers: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  for (const entity of requiredEntities) {
    const escaped = (entity.label ?? entity.type).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const countMatch = text.match(new RegExp(`([1-9]|[一二两三四五六七八九])\\s*(?:个|只|位|条|株|名)?[^，。]{0,5}${escaped}`, 'i'));
    if (countMatch) entity.count = { expected: Number(countMatch[1]) || chineseNumbers[countMatch[1]], tolerance: 0, mode: 'exact', scope: entity.id };
  }
  const palette = (text.match(/(?:红|蓝|绿|黄|黑|白|朱红|靛蓝|red|blue|green|yellow|black|white)/gi) ?? []).filter((x, i, all) => all.indexOf(x) === i);
  const styleDomain = /水彩|watercolor/.test(text) ? 'watercolor' : /木版|木刻|woodblock/.test(text) ? 'woodblock' : /构成主义|constructivist/.test(text) ? 'constructivist' : /编辑插画|editorial illustration/.test(text) ? 'editorial' : /电影感|cinematic/.test(text) ? 'cinematic' : undefined;
  const framing = /正方形|square/.test(text) ? 'square' : /竖向|portrait/.test(text) ? 'portrait' : /横向|宽幅|landscape/.test(text) ? 'landscape' : undefined;
  return { text, sceneIdentity: text.trim().slice(0, 120), requiredEntities, optionalEntities: [], forbiddenEntities, requiredStates: [], requiredRelations, styleDomain, composition: framing ? { framing, negativeSpace: /留白|negative space/.test(text) ? 0.5 : undefined } : undefined, explicitPose, explicitGaze: {}, outputModality: 'image', palette };
}

export type SemanticRuntime = { propose(input: { text: string; draft?: IntentDraft }): Promise<SemanticProposal> };
export class DeterministicSemanticRuntime implements SemanticRuntime { async propose(input: { text: string; draft?: IntentDraft }): Promise<SemanticProposal> { return proposalFromDraft(input.draft ?? draftFromText(input.text), input.text); } }
export class DeterministicParser implements ParserPort { async parse(input: ParseRequest): Promise<ParseResult> { return { draft: draftFromText(input.text), parser: { adapter: 'deterministic-runtime', model: 'local', schemaVersion: '2.2.1' }, warnings: [] }; } }
export class ParserBackedSemanticRuntime implements SemanticRuntime { constructor(private readonly parser: ParserPort) {} async propose(input: ParseRequest): Promise<SemanticProposal> { const parsed = await this.parser.parse(input); return proposalFromDraft(parsed.draft, input.text); } }
export function requestIdFor(text: string): string { return `req_${createHash('sha256').update(text).digest('hex').slice(0, 16)}`; }
