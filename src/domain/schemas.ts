import { z } from 'zod';
import type {
  AestheticPlan,
  CanonicalSceneContract,
  SemanticProposal,
  TypedOperation,
  RenderIntent221,
  RendererCapabilities,
  CompileResult,
  ContextualSemanticPrior,
  EntitySpec,
  IntentDraft,
  IntentGuardResult,
  IntentIssue,
  RenderIntent,
  SceneContract,
  ValidationResult,
  VisualAST,
} from './types.js';

const provenanceSchema = z.object({
  source: z.string().optional(),
  sourceSpan: z.string().optional(),
  revision: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const countSchema = z.object({
  expected: z.number().int().nonnegative(),
  tolerance: z.number().nonnegative(),
  mode: z.enum(['exact', 'range']),
  scope: z.string(),
});

const opennessSchema = z.object({
  id: z.string(),
  targetId: z.string(),
  semanticSpecificity: z.enum(['low', 'medium', 'high']),
  categoryLock: z.string(),
  requiredProperty: z.array(z.string()),
  forbiddenNarrowing: z.array(z.string()),
});

const grammarSchema = z.object({
  name: z.string(),
  actions: z.array(z.string()),
  shapeAbstraction: z.string().optional(),
  linePresence: z.string().optional(),
  shadingQuantization: z.string().optional(),
  materialSimplification: z.string().optional(),
  textureAbstraction: z.string().optional(),
  edgeHierarchy: z.string().optional(),
});

const entitySchema: z.ZodType<EntitySpec> = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().optional(),
  presence: z.enum(['required', 'optional', 'forbidden']),
  identityLock: z.boolean().optional(),
  affordances: z.array(z.string()).optional(),
  count: countSchema.optional(),
  renderingGrammarOverride: grammarSchema.optional(),
  attentionRole: z.enum(['target', 'support', 'suppressor', 'spatial-target', 'attention-island', 'attention-path']).optional(),
  detailBudget: z.number().min(0).max(1).optional(),
  occupancyBudget: z.number().min(0).max(1).optional(),
  semanticOpenness: opennessSchema.optional(),
  provenance: provenanceSchema.optional(),
});

const stateSchema = z.object({ id: z.string(), subjectId: z.string().optional(), value: z.string(), visibleConsequences: z.array(z.string()).optional() });
const relationSchema = z.object({ id: z.string(), type: z.string(), subject: z.string(), object: z.string(), constraints: z.record(z.unknown()).optional(), provenance: provenanceSchema.optional() });
const layerSchema = z.object({ id: z.string(), type: z.enum(['reflection', 'fog', 'rain', 'foreground', 'midground', 'background', 'custom']), content: z.string(), opacity: z.number().min(0).max(1).optional(), structuralFidelity: z.number().min(0).max(1).optional(), edgeFidelity: z.number().min(0).max(1).optional(), contrastBudget: z.number().min(0).max(1).optional(), mixingMode: z.string().optional() });
const motionSchema = z.object({ id: z.string(), content: z.string(), direction: z.string().optional(), intensity: z.number().min(0).max(1).optional() });
const compositionSchema = z.object({ framing: z.string().optional(), subjectOccupancy: z.number().min(0).max(1).optional(), negativeSpace: z.number().min(0).max(1).optional(), spatialHierarchy: z.array(z.string()).optional(), invariants: z.array(z.string()).optional(), dependencyGraph: z.array(z.string()).optional(), visualMassBalance: z.string().optional(), boundaryLegibility: z.number().min(0).max(1).optional(), splitFrame: z.boolean().optional(), exitReturnPath: z.array(z.string()).optional() });
const lightingSchema = z.object({ id: z.string(), source: z.string().optional(), causalSource: z.string().optional(), effect: z.string().optional(), formLighting: z.string().optional(), shadowLossRegions: z.array(z.string()).optional(), naturalness: z.string().optional(), localContrastHierarchy: z.array(z.string()).optional() });
const frequencySchema = z.object({ id: z.string(), semanticDepthMap: z.record(z.string()).optional(), detailBudget: z.number().min(0).max(1).optional(), textureSuppression: z.array(z.string()).optional(), edgeDensity: z.number().min(0).max(1).optional() });
const narrativePropSchema = z.object({ id: z.string(), entityId: z.string(), causalRole: z.string().optional() });
const scaleSchema = z.object({ id: z.string(), a: z.string(), b: z.string(), expectedRatio: z.string(), tolerance: z.number().nonnegative() });
const priorSchema: z.ZodType<ContextualSemanticPrior> = z.object({ id: z.string(), cues: z.array(z.string()), impliedCategory: z.string(), confidence: z.number().min(0).max(1), forbiddenCategories: z.array(z.string()), affectedNodes: z.array(z.string()) });

const intentDraftObject = z.object({
  text: z.string().optional(),
  sceneIdentity: z.string().optional(),
  location: z.string().optional(),
  time: z.string().optional(),
  environment: z.string().optional(),
  requiredEntities: z.array(entitySchema),
  optionalEntities: z.array(entitySchema),
  forbiddenEntities: z.array(entitySchema),
  requiredStates: z.array(stateSchema),
  requiredRelations: z.array(relationSchema),
  layers: z.array(layerSchema).optional(),
  motions: z.array(motionSchema).optional(),
  narrativeProps: z.array(narrativePropSchema).optional(),
  scaleConstraints: z.array(scaleSchema).optional(),
  countConstraints: z.array(countSchema).optional(),
  composition: compositionSchema.optional(),
  styleDomain: z.string().optional(),
  renderingGrammar: grammarSchema.optional(),
  semanticOpenness: z.array(opennessSchema).optional(),
  explicitPose: z.record(z.string()).optional(),
  explicitGaze: z.record(z.string()).optional(),
  outputModality: z.enum(['image', 'illustration', 'diagram', 'unknown']).optional(),
  palette: z.array(z.string()).optional(),
  ordinariness: z.boolean().optional(),
  contextualSemanticPriors: z.array(priorSchema).optional(),
  contradictions: z.array(z.string()).optional(),
  attentionCompetition: z.array(z.string()).optional(),
  stylePropagationGaps: z.array(z.string()).optional(),
  notices: z.array(z.string()).optional(),
  provenance: provenanceSchema.optional(),
});
export const IntentDraftSchema: z.ZodType<IntentDraft> = intentDraftObject;

export const IntentIssueSchema: z.ZodType<IntentIssue> = z.object({
  id: z.string(), severity: z.enum(['error', 'warning', 'notice']), type: z.string() as z.ZodType<IntentIssue['type']>, evidence: z.array(z.string()), consequence: z.string(), choices: z.array(z.string()).optional(), affectedNodes: z.array(z.string()),
});
export const IntentGuardResultSchema: z.ZodType<IntentGuardResult> = z.object({ decision: z.enum(['BLOCK', 'PAUSE', 'CONTINUE']), issues: z.array(IntentIssueSchema), draft: IntentDraftSchema });

export const SceneContractSchema: z.ZodType<SceneContract> = intentDraftObject.extend({ frozen: z.literal(true), decisions: z.record(z.string()) });
export const VisualASTSchema: z.ZodType<VisualAST> = z.object({
  kind: z.literal('vast.visual-ast'),
  scene: z.object({ identity: z.string().optional(), location: z.string().optional(), time: z.string().optional(), environment: z.string().optional(), outputModality: z.string().optional() }),
  entities: z.array(entitySchema), forbiddenEntities: z.array(entitySchema), states: z.array(stateSchema), relations: z.array(relationSchema), layers: z.array(layerSchema), motions: z.array(motionSchema), attention: z.array(z.object({ id: z.string(), targetId: z.string(), role: z.enum(['target', 'support', 'suppressor', 'spatial-target', 'attention-island', 'attention-path']), semanticPriority: z.number().optional(), visualPriority: z.number().optional(), detailBudget: z.number().optional(), contrastBudget: z.number().optional(), occupancyBudget: z.number().optional(), saturationBudget: z.number().optional(), sharpnessBudget: z.number().optional(), edgeDefinition: z.number().optional() })), composition: compositionSchema, lighting: z.array(lightingSchema), frequency: z.array(frequencySchema), narrativeProps: z.array(narrativePropSchema), style: grammarSchema, semanticOpenness: z.array(opennessSchema), scaleConstraints: z.array(scaleSchema), countConstraints: z.array(countSchema), explicitPose: z.record(z.string()), explicitGaze: z.record(z.string()), palette: z.array(z.string()), provenance: provenanceSchema.optional(),
});
export const RenderIntentSchema: z.ZodType<RenderIntent> = z.object({ kind: z.literal('vast.render-intent'), prompt: z.string(), layers: z.array(z.object({ id: z.string(), role: z.string(), content: z.string(), instructions: z.array(z.string()), opacity: z.number().optional(), detailBudget: z.number().optional() })), drawingInstructions: z.array(z.string()), composition: compositionSchema, palette: z.array(z.string()).optional(), negativePrompt: z.string().optional(), outputModality: z.string() });
export const ValidationResultSchema: z.ZodType<ValidationResult> = z.object({ status: z.enum(['PASS', 'FAIL']), diagnostics: z.array(z.object({ code: z.string(), message: z.string(), severity: z.enum(['error', 'warning', 'notice']), path: z.string().optional(), details: z.record(z.unknown()).optional() })) });
export const CompileResultSchema: z.ZodType<CompileResult> = z.object({ guard: IntentGuardResultSchema, contract: SceneContractSchema.optional(), ast: VisualASTSchema.optional(), validation: ValidationResultSchema.optional(), renderIntent: RenderIntentSchema.optional() });

export function parseIntentDraft(value: unknown): IntentDraft {
  return IntentDraftSchema.parse(value);
}

const operationProvenanceSchema = z.union([
  z.object({ kind: z.literal('explicit_user'), span: z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative(), text: z.string() }) }),
  z.object({ kind: z.literal('safe_inference'), rationale: z.string() }),
  z.object({ kind: z.literal('policy_default'), policyId: z.string() }),
  z.object({ kind: z.literal('aesthetic_choice'), plannerId: z.string() }),
]);
const operationSchema = z.object({ kind: z.string(), provenance: operationProvenanceSchema, confidence: z.number().min(0).max(1) }).passthrough();
export const SemanticProposalSchema: z.ZodType<SemanticProposal> = z.object({ schemaVersion: z.literal('2.2.1'), operations: z.array(operationSchema) as unknown as z.ZodType<TypedOperation[]>, ambiguities: z.array(z.object({ id: z.string(), question: z.string(), candidates: z.array(z.string()), confidence: z.number().min(0).max(1), affectedNodes: z.array(z.string()) })), assumptions: z.array(z.object({ id: z.string(), statement: z.string(), rationale: z.string(), confidence: z.number().min(0).max(1) })), sourceEvidence: z.array(z.object({ operationId: z.string(), provenance: operationProvenanceSchema })), confidence: z.number().min(0).max(1), sourceText: z.string().optional() });
export const CanonicalSceneContract221Schema: z.ZodType<CanonicalSceneContract> = z.object({ schemaVersion: z.literal('2.2.1'), requestId: z.string(), sceneIdentity: z.string().optional(), entities: z.array(z.object({ id: z.string(), type: z.string(), label: z.string(), identityLock: z.boolean(), affordances: z.array(z.string()), source: z.enum(['user', 'runtime']) })), attributes: z.record(z.record(z.string())), states: z.array(z.object({ id: z.string(), subjectId: z.string().optional(), value: z.string(), visibleConsequences: z.array(z.string()) })), counts: z.array(z.object({ targetId: z.string(), expected: z.number(), tolerance: z.number(), mode: z.enum(['exact', 'range']) })), motions: z.array(z.object({ id: z.string(), targetId: z.string(), content: z.string(), direction: z.string().optional(), intensity: z.number().optional() })), relations: z.array(z.object({ id: z.string(), type: z.string(), subject: z.string(), object: z.string(), hard: z.boolean() })), events: z.array(z.object({ id: z.string(), type: z.string(), participants: z.array(z.string()), consequences: z.array(z.string()) })), presence: z.array(z.object({ targetId: z.string(), presence: z.enum(['required', 'optional', 'forbidden']), source: z.enum(['user', 'runtime']) })), identityInvariants: z.array(z.object({ targetId: z.string(), invariants: z.array(z.string()) })), spatialInvariants: z.array(z.object({ id: z.string(), statement: z.string(), hard: z.boolean() })), scaleRelations: z.array(z.object({ a: z.string(), b: z.string(), ratio: z.string(), tolerance: z.number() })), narrativeWeights: z.record(z.number()), saliencyWeights: z.record(z.number()), narrativeProps: z.array(z.object({ id: z.string(), entityId: z.string(), causalRole: z.string().optional() })), semanticOpenness: z.array(z.object({ targetId: z.string(), specificity: z.enum(['low', 'medium', 'high']), categoryLock: z.string(), forbiddenNarrowing: z.array(z.string()) })), stylePreferences: z.array(z.object({ style: z.string(), source: z.enum(['user', 'runtime']) })), forbiddenOutcomes: z.array(z.object({ target: z.string(), reason: z.string().optional() })), freedomSlots: z.array(z.object({ id: z.string(), area: z.string(), allowed: z.array(z.string()) })), assumptions: z.array(z.object({ id: z.string(), statement: z.string(), rationale: z.string(), confidence: z.number(), accepted: z.literal(true) })), unresolvedAmbiguities: z.array(z.object({ id: z.string(), question: z.string(), candidates: z.array(z.string()), confidence: z.number(), affectedNodes: z.array(z.string()) })), composition: compositionSchema, palette: z.array(z.string()), explicitPose: z.record(z.string()), explicitGaze: z.record(z.string()), outputModality: z.string() });
const compositionPlanSchema = compositionSchema.extend({ focalPath: z.array(z.string()), protectedRegions: z.array(z.string()) });
const faceIdentitySchema = z.object({ targetId: z.string(), contour: z.string(), eyeShape: z.string(), browEyeAxis: z.string(), noseMouth: z.string(), asymmetry: z.string(), recognitionPoint: z.string(), expressionDeformation: z.string(), lightStableFeature: z.string() });
export const AestheticPlanSchema: z.ZodType<AestheticPlan> = z.object({ schemaVersion: z.literal('2.2.1'), visualThesis: z.string().min(1), focalHierarchy: z.array(z.object({ targetId: z.string(), rank: z.number().int().positive(), semanticWeight: z.number().min(0).max(1), visualWeight: z.number().min(0).max(1), detailBudget: z.number().min(0).max(1) })).max(3), composition: compositionPlanSchema, poseDynamics: z.object({ directives: z.array(z.string()), gravity: z.array(z.string()), inertia: z.array(z.string()) }), formLighting: z.object({ source: z.string(), direction: z.string(), facePlanes: z.array(z.string()), edgeLight: z.string().optional() }), shapeLanguage: z.object({ entityRules: z.record(z.array(z.string())) }), faceIdentity: faceIdentitySchema.optional(), expression: z.array(z.object({ targetId: z.string(), emotion: z.string(), visibleDeformation: z.string() })), informationBudget: z.object({ foreground: z.number().min(0).max(1), midground: z.number().min(0).max(1), background: z.number().min(0).max(1), texture: z.number().min(0).max(1), estimatedConcepts: z.number().nonnegative() }), renderingGrammar: grammarSchema, sceneCredibility: z.object({ functionalDetails: z.array(z.string()), culturalAnchors: z.array(z.string()), usageTraces: z.array(z.string()) }), controlledFreedom: z.array(z.object({ area: z.string(), allowed: z.array(z.string()), budget: z.number().min(0).max(1) })), decisions: z.array(z.object({ target: z.string(), reason: z.string(), affectedNodes: z.array(z.string()), priority: z.number(), degradable: z.boolean(), source: z.string() })) }) as unknown as z.ZodType<AestheticPlan>;
export const RenderIntent221Schema: z.ZodType<RenderIntent221> = z.object({ kind: z.literal('vast.render-intent'), schemaVersion: z.literal('2.2.1'), prompt: z.string(), positiveInstructions: z.array(z.string()), negativeConstraints: z.array(z.string()), entityMappings: z.array(z.object({ entityId: z.string(), instruction: z.string() })), composition: compositionPlanSchema, physics: z.array(z.string()), lighting: z.array(z.string()), informationBudget: z.object({ foreground: z.number(), midground: z.number(), background: z.number(), texture: z.number(), estimatedConcepts: z.number() }), staging: z.object({ level: z.enum(['single_pass', 'staged_recommended', 'staged_required', 'unsupported']), stages: z.array(z.object({ stage: z.number(), focus: z.array(z.string()), locked: z.array(z.string()) })) }), softItems: z.array(z.string()), hardItems: z.array(z.string()), compressionAudit: z.object({ removed: z.array(z.string()), merged: z.array(z.string()), downgraded: z.array(z.string()) }), outputModality: z.string(), provenance: z.object({ contractHash: z.string(), aestheticPlanHash: z.string(), intentHash: z.string().optional() }) });
export const RendererCapabilitiesSchema: z.ZodType<RendererCapabilities> = z.object({ id: z.string(), version: z.string(), textToImage: z.boolean(), imageToImage: z.boolean(), references: z.boolean(), masks: z.boolean(), staging: z.boolean(), aspectRatios: z.array(z.string()), qualityModes: z.array(z.string()) });