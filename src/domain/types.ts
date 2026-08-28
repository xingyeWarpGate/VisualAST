export const VAST_VERSION = '2.0.2' as const;
export const SCHEMA_VERSION = '1' as const;

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
