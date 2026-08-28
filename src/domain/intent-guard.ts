import type { GuardMode, IntentDraft, IntentGuardResult, IntentIssue } from './types.js';

const issue = (id: string, severity: IntentIssue['severity'], type: IntentIssue['type'], evidence: string[], consequence: string, affectedNodes: string[], choices?: string[]): IntentIssue => ({ id, severity, type, evidence, consequence, affectedNodes, choices });

export function analyzeIntent(draft: IntentDraft, _policy?: unknown): IntentGuardResult {
  const issues: IntentIssue[] = [];
  if (draft.contradictions?.length) issues.push(issue('intent.contradiction', 'error', 'CONTRADICTORY_INTENT', draft.contradictions, '显式要求彼此不兼容，无法冻结 Scene Contract。', [], ['保留要求 A', '保留要求 B']));
  if (draft.attentionCompetition?.length) issues.push(issue('intent.attention-competition', 'warning', 'ATTENTION_COMPETITION', draft.attentionCompetition, '多个高显著性目标可能争夺视觉中心，需要作者决定。', draft.attentionCompetition));
  if (draft.stylePropagationGaps?.length) issues.push(issue('intent.style-propagation', 'warning', 'STYLE_PROPAGATION_GAP', draft.stylePropagationGaps, 'Style Domain 尚未明确传播到全部 Typed Nodes，渲染器可能回退到默认语法。', draft.stylePropagationGaps));
  const priors = draft.contextualSemanticPriors ?? [];
  for (const prior of priors) {
    if (prior.confidence >= 0.75 && prior.forbiddenCategories.includes(prior.impliedCategory)) {
      issues.push(issue(`intent.${prior.id}`, 'warning', 'CONTEXTUAL_SEMANTIC_PRIOR_COLLISION', prior.cues, `上下文强烈暗示禁用类别“${prior.impliedCategory}”。`, prior.affectedNodes, ['保持开放语义', `允许${prior.impliedCategory}`]));
    }
  }
  if (draft.composition?.negativeSpace !== undefined && draft.composition.negativeSpace < 0) issues.push(issue('intent.composition-invalid', 'error', 'COMPOSITION_OVERLOAD', ['negativeSpace < 0'], '负空间预算无效。', []));
  if (draft.notices?.length) issues.push(issue('intent.notice', 'notice', 'SEMANTIC_AMBIGUITY', draft.notices, '输入保留了未决语义，后续编译将保持开放。', []));
  if (!draft.sceneIdentity && !draft.location && !draft.environment) issues.push(issue('intent.under-specified', 'notice', 'SEMANTIC_AMBIGUITY', ['缺少场景身份或环境'], '场景身份未充分说明，编译器不会擅自美化或补全。', []));
  const decision: IntentGuardResult['decision'] = issues.some((x) => x.severity === 'error') ? 'BLOCK' : issues.some((x) => x.severity === 'warning') ? 'PAUSE' : 'CONTINUE';
  return { decision, issues, draft };
}

export function applyGuardPolicy(result: IntentGuardResult, mode: GuardMode, acknowledgedIssueIds: string[] = []): IntentGuardResult {
  if (result.decision === 'BLOCK') return result;
  const outstandingWarnings = result.issues.filter((x) => x.severity === 'warning' && !acknowledgedIssueIds.includes(x.id));
  const decision = outstandingWarnings.length && mode !== 'notice-only' ? 'PAUSE' : 'CONTINUE';
  return { ...result, decision };
}
