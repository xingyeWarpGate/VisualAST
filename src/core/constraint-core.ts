import { createHash } from 'node:crypto';
import type { CanonicalSceneContract, Diagnostic, IntentDraft, RevisionPatch, SemanticProposal, TypedOperation, ValidationResult } from '../domain/types.js';

const diagnostic = (code: string, message: string, path?: string, details?: Record<string, unknown>): Diagnostic => ({ code, message, severity: 'error', path, details });
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateProposal(proposal: SemanticProposal): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  if (proposal.schemaVersion !== '2.2.1') diagnostics.push(diagnostic('SCHEMA_VERSION_MISMATCH', 'SemanticProposal schemaVersion must be 2.2.1', 'schemaVersion'));
  const ids = new Set<string>();
  for (const operation of proposal.operations) {
    if (operation.kind === 'declare_entity' && ids.has(operation.id)) diagnostics.push(diagnostic('DUPLICATE_ENTITY_ID', `Duplicate entity ${operation.id}`, 'operations'));
    if (operation.kind === 'declare_entity') ids.add(operation.id);
    if (operation.confidence < 0 || operation.confidence > 1) diagnostics.push(diagnostic('INVALID_CONFIDENCE', `Invalid confidence for ${operation.kind}`, 'operations'));
    if (operation.provenance.kind === 'explicit_user' && operation.provenance.span.end < operation.provenance.span.start) diagnostics.push(diagnostic('INVALID_SOURCE_SPAN', `Invalid source span for ${operation.kind}`, 'operations'));
  }
  return { status: diagnostics.length ? 'FAIL' : 'PASS', diagnostics };
}

export function canonicalize(draft: IntentDraft, proposal: SemanticProposal, requestId: string): CanonicalSceneContract {
  const entities = proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_entity' }> => x.kind === 'declare_entity').map((x) => ({ id: x.id, type: x.entityType, label: x.label, identityLock: x.identityLock, affordances: [], source: x.provenance.kind === 'explicit_user' ? 'user' as const : 'runtime' as const }));
  const presence = proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_entity' }> => x.kind === 'declare_entity').map((x) => ({ targetId: x.id, presence: x.presence, source: x.provenance.kind === 'explicit_user' ? 'user' as const : 'runtime' as const }));
  const relations = proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_relation' }> => x.kind === 'declare_relation').map((x) => ({ id: x.id, type: x.relation, subject: x.subject, object: x.object, hard: x.hard }));
  const events = proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_event' }> => x.kind === 'declare_event').map((x) => ({ id: x.id, type: x.event, participants: x.participants, consequences: x.consequences }));
  const openness = proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_openness' }> => x.kind === 'declare_openness').map((x) => ({ targetId: x.targetId, specificity: x.specificity, categoryLock: x.categoryLock, forbiddenNarrowing: x.forbiddenNarrowing }));
  const attributes: Record<string, Record<string, string>> = {};
  for (const operation of proposal.operations) if (operation.kind === 'declare_attribute') (attributes[operation.targetId] ??= {})[operation.attribute] = operation.value;
  const states = draft.requiredStates.map((x) => ({ id: x.id, subjectId: x.subjectId, value: x.value, visibleConsequences: x.visibleConsequences ?? [] }));
  const counts = [...(draft.countConstraints ?? []), ...[...draft.requiredEntities, ...draft.optionalEntities, ...draft.forbiddenEntities].flatMap((x) => x.count ? [x.count] : [])].map((x) => ({ targetId: x.scope, expected: x.expected, tolerance: x.tolerance, mode: x.mode }));
  const motions = (draft.motions ?? []).map((x) => ({ id: x.id, targetId: x.id, content: x.content, direction: x.direction, intensity: x.intensity }));
  const style = proposal.operations.find((x): x is Extract<TypedOperation, { kind: 'declare_style_preference' }> => x.kind === 'declare_style_preference');
  const saliency = Object.fromEntries(proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_saliency' }> => x.kind === 'declare_saliency').map((x) => [x.targetId, x.visual]));
  const narrative = Object.fromEntries(entities.map((x, index) => [x.id, index === 0 ? 1 : Math.max(0.1, 0.8 - index * 0.1)]));
  return { schemaVersion: '2.2.1', requestId, sceneIdentity: draft.sceneIdentity, entities, attributes, states, counts, motions, relations, events, presence, identityInvariants: entities.filter((x) => x.identityLock).map((x) => ({ targetId: x.id, invariants: [x.type, x.label] })), spatialInvariants: (draft.composition?.invariants ?? []).map((statement, index) => ({ id: `spatial.${index}`, statement, hard: true })), scaleRelations: (draft.scaleConstraints ?? []).map((x) => ({ a: x.a, b: x.b, ratio: x.expectedRatio, tolerance: x.tolerance })), narrativeWeights: narrative, saliencyWeights: saliency, narrativeProps: draft.narrativeProps ?? [], semanticOpenness: openness, stylePreferences: style ? [{ style: style.style, source: style.provenance.kind === 'explicit_user' ? 'user' as const : 'runtime' as const }] : [], forbiddenOutcomes: proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_forbidden' }> => x.kind === 'declare_forbidden').map((x) => ({ target: x.target })), freedomSlots: proposal.operations.filter((x): x is Extract<TypedOperation, { kind: 'declare_freedom_slot' }> => x.kind === 'declare_freedom_slot').map((x) => ({ id: x.id, area: x.area, allowed: x.allowed })), assumptions: proposal.assumptions.map((x) => ({ ...x, accepted: true as const })), unresolvedAmbiguities: proposal.ambiguities, composition: draft.composition ?? {}, palette: draft.palette ?? [], explicitPose: draft.explicitPose ?? {}, explicitGaze: draft.explicitGaze ?? {}, outputModality: draft.outputModality ?? 'image' };
}

export function validateContract(contract: CanonicalSceneContract): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const entityIds = new Set(contract.entities.map((x) => x.id));
  for (const presence of contract.presence) if (!entityIds.has(presence.targetId)) diagnostics.push(diagnostic('PRESENCE_TARGET_MISSING', `Presence target ${presence.targetId} does not exist`, `presence.${presence.targetId}`));
  for (const relation of contract.relations) if (!entityIds.has(relation.subject) || !entityIds.has(relation.object)) diagnostics.push(diagnostic('RELATION_PARTICIPANT_MISSING', `Relation ${relation.id} has unknown participant`, `relations.${relation.id}`));
  for (const event of contract.events) for (const participant of event.participants) if (!entityIds.has(participant)) diagnostics.push(diagnostic('EVENT_PARTICIPANT_MISSING', `Event ${event.id} has unknown participant ${participant}`, `events.${event.id}`));
  for (const count of contract.counts) { if (!entityIds.has(count.targetId)) diagnostics.push(diagnostic('COUNT_TARGET_MISSING', `Count target ${count.targetId} does not exist`, `counts.${count.targetId}`)); if (!Number.isInteger(count.expected) || count.expected < 0 || count.tolerance < 0) diagnostics.push(diagnostic('INVALID_COUNT_CONSTRAINT', `Invalid count constraint for ${count.targetId}`, `counts.${count.targetId}`)); }
  for (const identity of contract.identityInvariants) if (!entityIds.has(identity.targetId)) diagnostics.push(diagnostic('IDENTITY_TARGET_MISSING', `Identity target ${identity.targetId} does not exist`, `identityInvariants.${identity.targetId}`));
  for (const openness of contract.semanticOpenness) if (!entityIds.has(openness.targetId)) diagnostics.push(diagnostic('OPENNESS_TARGET_MISSING', `Openness target ${openness.targetId} does not exist`, `semanticOpenness.${openness.targetId}`));
  const required = new Set(contract.presence.filter((x) => x.presence === 'required').map((x) => x.targetId));
  const forbidden = new Set(contract.presence.filter((x) => x.presence === 'forbidden').map((x) => x.targetId));
  for (const target of required) if (forbidden.has(target)) diagnostics.push(diagnostic('REQUIRED_FORBIDDEN_CONFLICT', `${target} is both required and forbidden`, `presence.${target}`));
  return { status: diagnostics.length ? 'FAIL' : 'PASS', diagnostics };
}

export function applyOperations(base: CanonicalSceneContract, operations: TypedOperation[], requestId = base.requestId): CanonicalSceneContract {
  const draft: IntentDraft = { sceneIdentity: base.sceneIdentity, requiredEntities: base.entities.filter((x) => base.presence.find((p) => p.targetId === x.id)?.presence === 'required').map((x) => ({ id: x.id, type: x.type, label: x.label, presence: 'required', identityLock: x.identityLock })), optionalEntities: base.entities.filter((x) => base.presence.find((p) => p.targetId === x.id)?.presence === 'optional').map((x) => ({ id: x.id, type: x.type, label: x.label, presence: 'optional', identityLock: x.identityLock })), forbiddenEntities: [], requiredStates: base.states, requiredRelations: base.relations.map((x) => ({ id: x.id, type: x.type, subject: x.subject, object: x.object })), composition: base.composition, palette: base.palette, explicitPose: base.explicitPose, explicitGaze: base.explicitGaze, outputModality: base.outputModality as 'image' | 'illustration' | 'diagram' | 'unknown' };
  const preserved = base.entities.map((x) => ({ kind: 'declare_entity' as const, id: x.id, entityType: x.type, label: x.label, presence: base.presence.find((p) => p.targetId === x.id)?.presence ?? 'optional' as const, identityLock: x.identityLock, provenance: { kind: 'safe_inference' as const, rationale: 'preserved from prior contract' }, confidence: 1 }));
  const proposal: SemanticProposal = { schemaVersion: '2.2.1', operations: [...operations, ...preserved], ambiguities: base.unresolvedAmbiguities, assumptions: base.assumptions, sourceEvidence: [], confidence: 1 };
  return canonicalize(draft, proposal, requestId);
}
export function validateRevision(contract: CanonicalSceneContract, patch: RevisionPatch): ValidationResult { const proposalResult = validateProposal({ schemaVersion: '2.2.1', operations: patch.operations, ambiguities: [], assumptions: [], sourceEvidence: [], confidence: 1 }); return proposalResult.status === 'FAIL' ? proposalResult : validateContract(applyOperations(contract, patch.operations)); }
export function contractHash(contract: CanonicalSceneContract): string { return hash(contract); }