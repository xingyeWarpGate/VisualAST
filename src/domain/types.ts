export const VAST_VERSION = '2.2.1' as const;
export const SCHEMA_VERSION = '2.2.1' as const;

export type Envelope<T> = {
  vastVersion: typeof VAST_VERSION;
  schemaVersion: typeof SCHEMA_VERSION;
  kind: string;
  data: T;
};

export type Presence = 'required' | 'optional' | 'forbidden';
export type GuardDecision = 'BLOCK' | 'PAUSE' | 'CONTINUE';
export type IssueSeverity = 'error' | 'warning' | 'notice';
export type IntentDiagnostic =
  | 'CONTRADICTORY_INTENT'
  | 'ATTENTION_COMPETITION'
  | 'UNDECLARED_VISUAL_HIERARCHY'
  | 'STYLE_PROPAGATION_GAP'
  | 'COMPOSITION_OVERLOAD'
  | 'SCALE_READABILITY_RISK'
  | 'SEMANTIC_AMBIGUITY'
  | 'RENDERER_DEFAULT_RISK'
  | 'CONTEXTUAL_SEMANTIC_PRIOR_COLLISION';

export type ParserProfile = {
  adapter: 'fixture' | 'openai-compatible';
  baseUrl?: string;
  apiKeyEnv?: string;
  model?: string;
  timeoutMs?: number;
};

export type EntitySpec = {
  id: string;
  type: string;
  label?: string;
  presence: Presence;
  identityLock?: boolean;
  affordances?: string[];
  count?: CountConstraint;
  renderingGrammarOverride?: RenderingGrammar;
  attentionRole?: AttentionRole;
  detailBudget?: number;
  occupancyBudget?: number;
  semanticOpenness?: SemanticOpenness;
  provenance?: Provenance;
};

export type StateSpec = { id: string; subjectId?: string; value: string; visibleConsequences?: string[] };
export type RelationSpec = {
  id: string;
  type: string;
  subject: string;
  object: string;
  constraints?: Record<string, unknown>;
  provenance?: Provenance;
};
export type LayerSpec = {
  id: string;
  type: 'reflection' | 'fog' | 'rain' | 'foreground' | 'midground' | 'background' | 'custom';
  content: string;
  opacity?: number;
  structuralFidelity?: number;
  edgeFidelity?: number;
  contrastBudget?: number;
  mixingMode?: string;
};
export type MotionSpec = { id: string; content: string; direction?: string; intensity?: number };
export type AttentionRole = 'target' | 'support' | 'suppressor' | 'spatial-target' | 'attention-island' | 'attention-path';
export type AttentionSpec = {
  id: string;
  targetId: string;
  role: AttentionRole;
  semanticPriority?: number;
  visualPriority?: number;
  detailBudget?: number;
  contrastBudget?: number;
  occupancyBudget?: number;
  saturationBudget?: number;
  sharpnessBudget?: number;
  edgeDefinition?: number;
};
export type CompositionSpec = {
  framing?: string;
  subjectOccupancy?: number;
  negativeSpace?: number;
  spatialHierarchy?: string[];
  invariants?: string[];
  dependencyGraph?: string[];
  visualMassBalance?: string;
  boundaryLegibility?: number;
  splitFrame?: boolean;
  exitReturnPath?: string[];
};
export type LightingSpec = {
  id: string;
  source?: string;
  causalSource?: string;
  effect?: string;
  formLighting?: string;
  shadowLossRegions?: string[];
  naturalness?: string;
  localContrastHierarchy?: string[];
};
export type FrequencySpec = {
  id: string;
  semanticDepthMap?: Record<string, string>;
  detailBudget?: number;
  textureSuppression?: string[];
  edgeDensity?: number;
};
export type NarrativeProp = { id: string; entityId: string; causalRole?: string };
export type RenderingGrammar = {
  name: string;
  actions: string[];
  shapeAbstraction?: string;
  linePresence?: string;
  shadingQuantization?: string;
  materialSimplification?: string;
  textureAbstraction?: string;
  edgeHierarchy?: string;
};
export type SemanticOpenness = {
  id: string;
  targetId: string;
  semanticSpecificity: 'low' | 'medium' | 'high';
  categoryLock: 'none' | string;
  requiredProperty: string[];
  forbiddenNarrowing: string[];
};
export type CountConstraint = { expected: number; tolerance: number; mode: 'exact' | 'range'; scope: string };
export type ScaleConstraint = { id: string; a: string; b: string; expectedRatio: string; tolerance: number };
export type Provenance = { source?: string; sourceSpan?: string; revision?: string; confidence?: number };
export type ContextualSemanticPrior = {
  id: string;
  cues: string[];
  impliedCategory: string;
  confidence: number;
  forbiddenCategories: string[];
  affectedNodes: string[];
};

export type IntentDraft = {
  text?: string;
  sceneIdentity?: string;
  location?: string;
  time?: string;
  environment?: string;
  requiredEntities: EntitySpec[];
  optionalEntities: EntitySpec[];
  forbiddenEntities: EntitySpec[];
  requiredStates: StateSpec[];
  requiredRelations: RelationSpec[];
  layers?: LayerSpec[];
  motions?: MotionSpec[];
  narrativeProps?: NarrativeProp[];
  scaleConstraints?: ScaleConstraint[];
  countConstraints?: CountConstraint[];
  composition?: CompositionSpec;
  styleDomain?: string;
  renderingGrammar?: RenderingGrammar;
  semanticOpenness?: SemanticOpenness[];
  explicitPose?: Record<string, string>;
  explicitGaze?: Record<string, string>;
  outputModality?: 'image' | 'illustration' | 'diagram' | 'unknown';
  palette?: string[];
  ordinariness?: boolean;
  contextualSemanticPriors?: ContextualSemanticPrior[];
  contradictions?: string[];
  attentionCompetition?: string[];
  stylePropagationGaps?: string[];
  notices?: string[];
  provenance?: Provenance;
};

export type IntentIssue = {
  id: string;
  severity: IssueSeverity;
  type: IntentDiagnostic;
  evidence: string[];
  consequence: string;
  choices?: string[];
  affectedNodes: string[];
};
export type IntentGuardResult = { decision: GuardDecision; issues: IntentIssue[]; draft: IntentDraft };

export type SceneContract = IntentDraft & { frozen: true; decisions: Record<string, string> };
export type VisualAST = {
  kind: 'vast.visual-ast';
  scene: { identity?: string; location?: string; time?: string; environment?: string; outputModality?: string };
  entities: EntitySpec[];
  states: StateSpec[];
  relations: RelationSpec[];
  layers: LayerSpec[];
  motions: MotionSpec[];
  attention: AttentionSpec[];
  composition: CompositionSpec;
  lighting: LightingSpec[];
  frequency: FrequencySpec[];
  narrativeProps: NarrativeProp[];
  style: RenderingGrammar;
  semanticOpenness: SemanticOpenness[];
  scaleConstraints: ScaleConstraint[];
  countConstraints: CountConstraint[];
  forbiddenEntities: EntitySpec[];
  explicitPose: Record<string, string>;
  explicitGaze: Record<string, string>;
  palette: string[];
  provenance?: Provenance;
};

export type Diagnostic = { code: string; message: string; severity: 'error' | 'warning' | 'notice'; path?: string; details?: Record<string, unknown> };
export type ValidationResult = { status: 'PASS' | 'FAIL'; diagnostics: Diagnostic[] };

export type RenderLayer = { id: string; role: string; content: string; instructions: string[]; opacity?: number; detailBudget?: number };
export type RenderIntent = {
  kind: 'vast.render-intent';
  prompt: string;
  layers: RenderLayer[];
  drawingInstructions: string[];
  composition: CompositionSpec;
  palette?: string[];
  negativePrompt?: string;
  outputModality: string;
};
export type CompileResult = {
  guard: IntentGuardResult;
  contract?: SceneContract;
  ast?: VisualAST;
  validation?: ValidationResult;
  renderIntent?: RenderIntent;
};

export type ParseRequest = { text: string; locale?: 'zh-CN' | 'en'; parserProfile?: string };
export type ParseResult = { draft: IntentDraft; parser: { adapter: string; model?: string; schemaVersion: string }; warnings: string[] };
export interface ParserPort { parse(input: ParseRequest): Promise<ParseResult> }

export type GuardMode = 'interactive' | 'notice-only' | 'strict';
export type InspectRequest = { text: string; mode?: GuardMode; acknowledgedIssueIds?: string[]; parserProfile?: string };
export type InspectResponse = { guard: IntentGuardResult; parser: ParseResult['parser']; warnings: string[] };
export type CompileRequest = InspectRequest & { format?: 'prompt' | 'render-intent' | 'ast' | 'contract' | 'full' };
export type CompileResponse = CompileResult;
export type ValidateRequest = { ast: VisualAST; contract?: SceneContract };
export type ValidateResponse = ValidationResult;
export type RegressionRequest = { caseId?: string; layer?: string };
export type RegressionCaseResult = { caseId: string; status: 'PASS' | 'FAIL'; checks: number; diagnostics: Diagnostic[] };
export type RegressionResponse = { status: 'PASS' | 'FAIL'; total: number; passed: number; cases: RegressionCaseResult[] };
export type DiagnosticHelp = { code: IntentDiagnostic; summary: string; action: string; severity: IssueSeverity };

// VAST 2.2.1 versioned cross-module model. The legacy DTOs above remain
// source-compatible for migration inputs, but new orchestration uses these
// types exclusively between Runtime, Core, Aesthetic, Compiler and Adapters.
export type TextSpan = { start: number; end: number; text: string };
export type OperationProvenance =
  | { kind: 'explicit_user'; span: TextSpan }
  | { kind: 'safe_inference'; rationale: string }
  | { kind: 'policy_default'; policyId: string }
  | { kind: 'aesthetic_choice'; plannerId: string };
export type Ambiguity = { id: string; question: string; candidates: string[]; confidence: number; affectedNodes: string[] };
export type Assumption = { id: string; statement: string; rationale: string; confidence: number };
export type SourceEvidence = { operationId: string; provenance: OperationProvenance };
export type WeightMap = Record<string, number>;

export type TypedOperation =
  | { kind: 'declare_entity'; id: string; entityType: string; label: string; presence: Presence; identityLock: boolean; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_attribute'; targetId: string; attribute: string; value: string; hard: boolean; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_relation'; id: string; relation: string; subject: string; object: string; hard: boolean; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_event'; id: string; event: string; participants: string[]; consequences: string[]; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_motion'; id: string; targetId: string; motion: string; direction?: string; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_emotion'; targetId: string; emotion: string; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_presence'; targetId: string; presence: Presence; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_saliency'; targetId: string; semantic: number; visual: number; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_openness'; targetId: string; specificity: 'low' | 'medium' | 'high'; categoryLock: string; forbiddenNarrowing: string[]; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_style_preference'; style: string; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_forbidden'; target: string; provenance: OperationProvenance; confidence: number }
  | { kind: 'declare_freedom_slot'; id: string; area: string; allowed: string[]; provenance: OperationProvenance; confidence: number };
export type SemanticProposal = { schemaVersion: '2.2.1'; operations: TypedOperation[]; ambiguities: Ambiguity[]; assumptions: Assumption[]; sourceEvidence: SourceEvidence[]; confidence: number; sourceText?: string };

export type EntityNode = { id: string; type: string; label: string; identityLock: boolean; affordances: string[]; source: 'user' | 'runtime' };
export type RelationNode = { id: string; type: string; subject: string; object: string; hard: boolean };
export type EventNode = { id: string; type: string; participants: string[]; consequences: string[] };
export type PresenceConstraint = { targetId: string; presence: Presence; source: 'user' | 'runtime' };
export type IdentityInvariant = { targetId: string; invariants: string[] };
export type SpatialInvariant = { id: string; statement: string; hard: boolean };
export type ScaleRelation = { a: string; b: string; ratio: string; tolerance: number };
export type OpennessConstraint = { targetId: string; specificity: 'low' | 'medium' | 'high'; categoryLock: string; forbiddenNarrowing: string[] };
export type StylePreference = { style: string; source: 'user' | 'runtime' };
export type ForbiddenOutcome = { target: string; reason?: string };
export type FreedomSlot = { id: string; area: string; allowed: string[] };
export type AcceptedAssumption = Assumption & { accepted: true };
export type CanonicalSceneContract = {
  schemaVersion: '2.2.1'; requestId: string; sceneIdentity?: string; entities: EntityNode[]; attributes: Record<string, Record<string, string>>; states: Array<{ id: string; subjectId?: string; value: string; visibleConsequences: string[] }>; counts: Array<{ targetId: string; expected: number; tolerance: number; mode: 'exact' | 'range' }>; motions: Array<{ id: string; targetId: string; content: string; direction?: string; intensity?: number }>; relations: RelationNode[]; events: EventNode[];
  presence: PresenceConstraint[]; identityInvariants: IdentityInvariant[]; spatialInvariants: SpatialInvariant[]; scaleRelations: ScaleRelation[];
  narrativeWeights: WeightMap; saliencyWeights: WeightMap; narrativeProps: Array<{ id: string; entityId: string; causalRole?: string }>;  semanticOpenness: OpennessConstraint[]; stylePreferences: StylePreference[];
  forbiddenOutcomes: ForbiddenOutcome[]; freedomSlots: FreedomSlot[]; assumptions: AcceptedAssumption[]; unresolvedAmbiguities: Ambiguity[];
  composition: CompositionSpec; palette: string[]; explicitPose: Record<string, string>; explicitGaze: Record<string, string>; outputModality: string;
};
export type FocalTarget = { targetId: string; rank: number; semanticWeight: number; visualWeight: number; detailBudget: number };
export type CompositionPlan = CompositionSpec & { focalPath: string[]; protectedRegions: string[] };
export type PoseDynamicsPlan = { directives: string[]; gravity: string[]; inertia: string[] };
export type FormLightingPlan = { source: string; direction: string; facePlanes: string[]; edgeLight?: string };
export type ShapeLanguagePlan = { entityRules: Record<string, string[]> };
export type FaceIdentityPlan = { targetId: string; contour: string; eyeShape: string; browEyeAxis: string; noseMouth: string; asymmetry: string; recognitionPoint: string; expressionDeformation: string; lightStableFeature: string };
export type ExpressionPlan = { targetId: string; emotion: string; visibleDeformation: string };
export type InformationBudget = { foreground: number; midground: number; background: number; texture: number; estimatedConcepts: number };
export type RenderingGrammarPlan = RenderingGrammar;
export type SceneCredibilityPlan = { functionalDetails: string[]; culturalAnchors: string[]; usageTraces: string[] };
export type FreedomAllocation = { area: string; allowed: string[]; budget: number };
export type AestheticDecision = { target: string; reason: string; affectedNodes: string[]; priority: number; degradable: boolean; source: string };
export type AestheticPlan = { schemaVersion: '2.2.1'; visualThesis: string; focalHierarchy: FocalTarget[]; composition: CompositionPlan; poseDynamics: PoseDynamicsPlan; formLighting: FormLightingPlan; shapeLanguage: ShapeLanguagePlan; faceIdentity?: FaceIdentityPlan; expression: ExpressionPlan[]; informationBudget: InformationBudget; renderingGrammar: RenderingGrammarPlan; sceneCredibility: SceneCredibilityPlan; controlledFreedom: FreedomAllocation[]; decisions: AestheticDecision[] };
export type AttentionBudget = { entityCount: number; hardConstraintCount: number; relationCount: number; highPrecisionRegions: number; physicsEvents: number; lightSources: number; textBrandRequirements: number; styleRequirements: number; negativeConstraints: number; estimatedConceptDensity: number };
export type ComplexityLevel = 'single_pass' | 'staged_recommended' | 'staged_required' | 'unsupported';
export type StagePlan = { level: ComplexityLevel; stages: Array<{ stage: number; focus: string[]; locked: string[] }> };
export type RenderIntent221 = { kind: 'vast.render-intent'; schemaVersion: '2.2.1'; prompt: string; positiveInstructions: string[]; negativeConstraints: string[]; entityMappings: Array<{ entityId: string; instruction: string }>; composition: CompositionPlan; physics: string[]; lighting: string[]; informationBudget: InformationBudget; staging: StagePlan; softItems: string[]; hardItems: string[]; compressionAudit: { removed: string[]; merged: string[]; downgraded: string[] }; outputModality: string; provenance: { contractHash: string; aestheticPlanHash: string; intentHash?: string } };
export type RendererCapabilities = { id: string; version: string; textToImage: boolean; imageToImage: boolean; references: boolean; masks: boolean; staging: boolean; aspectRatios: string[]; qualityModes: string[] };
export type AdapterRequest = { adapterId: string; prompt: string; negativePrompt?: string; inputImages: string[]; aspectRatio?: string; quality?: string; metadata: Record<string, unknown> };
export type RenderResult = { success: boolean; adapterId: string; imagePath?: string; modality: 'text' | 'image'; inputImageCount: number; model?: string; provider?: string; metadata: Record<string, unknown>; error?: { code: string; message: string } };
export type RendererAdapter = { id: string; capabilities(): RendererCapabilities; lower(intent: RenderIntent221): AdapterRequest; validateRequest(request: AdapterRequest): ValidationResult; render(request: AdapterRequest): Promise<RenderResult> };
export type EvaluationDefect = { id: string; dimension: string; region?: string; entityId?: string; observation: string; severity: 'low' | 'medium' | 'high'; confidence: number; violatedNode: string; patch: RevisionPatch };
export type EvaluationResult = { schemaVersion: '2.2.1'; runId: string; status: 'PASS' | 'FAIL'; scores: Record<string, number>; defects: EvaluationDefect[]; evidence: string[]; humanReviewRequired: boolean };
export type RevisionPatch = { id: string; operations: TypedOperation[]; targetDefects: string[]; rationale: string; round: number };
export type RunRecord = { runId: string; createdAt: string; input: string; contract: CanonicalSceneContract; aestheticPlan: AestheticPlan; renderIntent: RenderIntent221; adapter: RendererCapabilities; render?: RenderResult; evaluation?: EvaluationResult; revisions: RevisionPatch[] };
