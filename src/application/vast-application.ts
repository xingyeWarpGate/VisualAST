import { applyGuardPolicy, analyzeIntent } from '../domain/intent-guard.js';
import { buildVisualAst } from '../domain/ast.js';
import { compileRenderIntent } from '../domain/compiler.js';
import { normalizeContract } from '../domain/normalize.js';
import { validateVisualAst } from '../domain/validator.js';
import type { ApplicationDependencies } from './ports.js';
import { DeterministicSemanticRuntime, ParserBackedSemanticRuntime, requestIdFor } from '../runtime/semantic-runtime.js';
import { canonicalize, validateContract, validateProposal, validateRevision } from '../core/constraint-core.js';
import { planAesthetics, type AestheticProfile } from '../aesthetic/planner.js';
import { compile221 } from '../compiler/compiler-221.js';
import { MockRendererAdapter } from '../adapters/renderer/mock-adapter.js';
import { ImageCliRendererAdapter, type ImageCliOptions } from '../adapters/renderer/image-cli-adapter.js';
import { evaluateRender, revisionFor } from '../evaluator/evaluator.js';
import { RunStore } from '../infrastructure/run-store.js';
import { writeEvidence } from '../infrastructure/evidence.js';
import type { AestheticPlan, CanonicalSceneContract, CompileRequest, CompileResponse, DiagnosticHelp, InspectRequest, InspectResponse, IntentDiagnostic, ParserPort, RegressionRequest, RegressionResponse, RenderIntent221, RendererAdapter, RevisionPatch, SemanticProposal, ValidationResult, ValidateRequest, ValidateResponse } from '../domain/types.js';

const help: Record<IntentDiagnostic, DiagnosticHelp> = {
  CONTRADICTORY_INTENT: { code: 'CONTRADICTORY_INTENT', summary: '显式视觉要求互相冲突。', action: '选择要保留的要求后重新编译。', severity: 'error' },
  ATTENTION_COMPETITION: { code: 'ATTENTION_COMPETITION', summary: '多个元素争夺视觉中心。', action: '确认视觉主次，或用 acknowledgedIssueIds 接受现状。', severity: 'warning' },
  UNDECLARED_VISUAL_HIERARCHY: { code: 'UNDECLARED_VISUAL_HIERARCHY', summary: '视觉层级没有明确声明。', action: '补充主次关系或确认由默认预算处理。', severity: 'warning' },
  STYLE_PROPAGATION_GAP: { code: 'STYLE_PROPAGATION_GAP', summary: '样式没有传播到全部节点。', action: '补充节点语法或确认继承场景语法。', severity: 'warning' },
  COMPOSITION_OVERLOAD: { code: 'COMPOSITION_OVERLOAD', summary: '构图负荷超出可解释范围。', action: '减少同等优先级元素或调整构图。', severity: 'error' },
  SCALE_READABILITY_RISK: { code: 'SCALE_READABILITY_RISK', summary: '相对尺度可能难以辨认。', action: '确认尺度关系和画面可读性。', severity: 'notice' },
  SEMANTIC_AMBIGUITY: { code: 'SEMANTIC_AMBIGUITY', summary: '输入保留了开放语义。', action: '保持开放，不要让渲染器擅自具体化。', severity: 'notice' },
  RENDERER_DEFAULT_RISK: { code: 'RENDERER_DEFAULT_RISK', summary: '渲染器默认行为可能改变意图。', action: '补充抑制或绘画语法约束。', severity: 'notice' },
  CONTEXTUAL_SEMANTIC_PRIOR_COLLISION: { code: 'CONTEXTUAL_SEMANTIC_PRIOR_COLLISION', summary: '上下文暗示了被禁止的具体类别。', action: '确认保持开放语义，或允许该类别。', severity: 'warning' },
};

export class VastApplication {
  private readonly runtime;
  private readonly store = new RunStore();
  constructor(private readonly parser: ParserPort, private readonly dependencies: ApplicationDependencies = {}) { this.runtime = new ParserBackedSemanticRuntime(parser); }

  async parse221(text: string): Promise<{ proposal: SemanticProposal; draft: Awaited<ReturnType<ParserPort['parse']>>['draft']; parser: Awaited<ReturnType<ParserPort['parse']>>['parser']; warnings: string[] }> {
    const parsed = await this.parser.parse({ text, locale: 'zh-CN' });
    const isFixtureLiteral = /^fixture\s*:/i.test(text.trim()) || /^\s*[\[{]/.test(text);
    const proposal = parsed.parser.adapter === 'fixture' && !isFixtureLiteral ? await new (await import('../runtime/semantic-runtime.js')).DeterministicSemanticRuntime().propose({ text }) : await this.runtime.propose({ text, locale: 'zh-CN' });
    return { proposal, draft: parsed.draft, parser: parsed.parser, warnings: parsed.warnings };
  }

  async compile221(text: string, options: { renderer?: string; staged?: 'auto' | 'on' | 'off'; profile?: AestheticProfile; image?: ImageCliOptions } = {}): Promise<{ proposal: SemanticProposal; contract: CanonicalSceneContract; plan: AestheticPlan; intent: RenderIntent221; validation: ValidationResult; adapter: RendererAdapter }> {
    const parsed = await this.parse221(text);
    const proposalValidation = validateProposal(parsed.proposal);
    if (proposalValidation.status === 'FAIL') throw new Error(proposalValidation.diagnostics.map((x) => x.message).join('; '));
    const contract = canonicalize(parsed.draft, parsed.proposal, requestIdFor(text));
    const validation = validateContract(contract);
    if (validation.status === 'FAIL') throw new Error(validation.diagnostics.map((x) => x.message).join('; '));
    const adapter = this.adapter(options.renderer ?? 'mock', options.image);
    const plan = planAesthetics(contract, adapter.capabilities(), options.profile);
    let intent = compile221(contract, plan, { staged: options.staged }); if (intent.staging.level !== 'single_pass' && !adapter.capabilities().staging) intent = { ...intent, softItems: [...intent.softItems, 'staged execution requested but adapter does not support staging; no local-lock guarantee is claimed'] };
    return { proposal: parsed.proposal, contract, plan, intent, validation, adapter };
  }

  async compileContract221(contract: CanonicalSceneContract, options: { renderer?: string; staged?: 'auto' | 'on' | 'off'; profile?: AestheticProfile; image?: ImageCliOptions } = {}): Promise<{ contract: CanonicalSceneContract; plan: AestheticPlan; intent: RenderIntent221; validation: ValidationResult; adapter: RendererAdapter }> {
    const validation = validateContract(contract); if (validation.status === 'FAIL') throw new Error(validation.diagnostics.map((x) => x.message).join('; '));
    const adapter = this.adapter(options.renderer ?? 'mock', options.image); const plan = planAesthetics(contract, adapter.capabilities(), options.profile); let intent = compile221(contract, plan, { staged: options.staged }); if (intent.staging.level !== 'single_pass' && !adapter.capabilities().staging) intent = { ...intent, softItems: [...intent.softItems, 'staged execution requested but adapter does not support staging; no local-lock guarantee is claimed'] }; return { contract, plan, intent, validation, adapter };
  }
  adapter(id: string, options?: ImageCliOptions): RendererAdapter { if (id === 'mock') return new MockRendererAdapter(); if (id === 'image-cli' || id === 'image') return new ImageCliRendererAdapter(options); throw new Error(`Unknown renderer adapter: ${id}`); }

  async render221(text: string, options: { renderer?: string; staged?: 'auto' | 'on' | 'off'; profile?: AestheticProfile; image?: ImageCliOptions } = {}): Promise<{ runId: string; record: import('../domain/types.js').RunRecord }> {
    const compiled = await this.compile221(text, options); const request = compiled.adapter.lower(compiled.intent); const requestValidation = compiled.adapter.validateRequest(request); if (requestValidation.status === 'FAIL') throw new Error(requestValidation.diagnostics.map((x) => x.message).join('; '));
    const render = await compiled.adapter.render(request); const runId = `run_${Date.now()}_${requestIdFor(text).slice(-8)}`; const record = { runId, createdAt: new Date().toISOString(), input: text, contract: compiled.contract, aestheticPlan: compiled.plan, renderIntent: { ...compiled.intent, provenance: { ...compiled.intent.provenance, intentHash: requestIdFor(compiled.intent.prompt) } }, adapter: compiled.adapter.capabilities(), render, revisions: [] } as import('../domain/types.js').RunRecord; record.evaluation = evaluateRender({ runId, contract: record.contract, intent: record.renderIntent, render }); await this.store.save(record); await writeEvidence(record); return { runId, record };
  }

  async evaluate221(runId: string): Promise<import('../domain/types.js').EvaluationResult> { const record = await this.store.load(runId); if (!record.render) throw new Error(`Run ${runId} has no render result`); const evaluation = evaluateRender({ runId, contract: record.contract, intent: record.renderIntent, render: record.render }); record.evaluation = evaluation; await this.store.save(record); return evaluation; }
  async revise221(runId: string, maxRounds = 2): Promise<{ runId: string; revisions: RevisionPatch[]; evaluation?: import('../domain/types.js').EvaluationResult }> { const record = await this.store.load(runId); const revisions: RevisionPatch[] = []; for (let round = 1; round <= Math.min(maxRounds, 2); round++) { const evaluation = record.evaluation ?? (record.render ? evaluateRender({ runId, contract: record.contract, intent: record.renderIntent, render: record.render }) : undefined); if (!evaluation) break; const patch = revisionFor(evaluation, round); if (!patch) break; const validation = validateRevision(record.contract, patch); if (validation.status === 'FAIL') break; revisions.push(patch); record.revisions.push(patch); record.contract = canonicalize({ requiredEntities: [], optionalEntities: [], forbiddenEntities: [], requiredStates: [], requiredRelations: [], sceneIdentity: record.contract.sceneIdentity, composition: record.contract.composition, palette: record.contract.palette, explicitPose: record.contract.explicitPose, explicitGaze: record.contract.explicitGaze, outputModality: record.contract.outputModality as 'image' | 'illustration' | 'diagram' | 'unknown' }, { schemaVersion: '2.2.1', operations: patch.operations, ambiguities: record.contract.unresolvedAmbiguities, assumptions: record.contract.assumptions, sourceEvidence: [], confidence: 1 }, record.contract.requestId); record.evaluation = evaluation; break; } await this.store.save(record); return { runId, revisions, evaluation: record.evaluation }; }
  async inspectRun(runId: string): Promise<import('../domain/types.js').RunRecord> { return this.store.load(runId); }
  async doctor(): Promise<Record<string, unknown>> { const adapters = [new MockRendererAdapter(), new ImageCliRendererAdapter()]; const checks = { node: process.versions.node, schemaVersion: '2.2.1', adapters: adapters.map((x) => x.capabilities()), outputDirectory: 'artifacts/vast-2.2.1', credentialsConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.VAST_PARSER_API_KEY), liveRender: false }; await writeEvidence(); return checks; }

  async inspect(request: InspectRequest): Promise<InspectResponse> {
    const parsed = await this.parser.parse({ text: request.text, locale: 'zh-CN', parserProfile: request.parserProfile });
    const rawGuard = analyzeIntent(parsed.draft);
    const guard = applyGuardPolicy(rawGuard, request.mode ?? 'interactive', request.acknowledgedIssueIds);
    return { guard, parser: parsed.parser, warnings: parsed.warnings };
  }

  async compile(request: CompileRequest): Promise<CompileResponse> {
    const parsed = await this.parser.parse({ text: request.text, locale: 'zh-CN', parserProfile: request.parserProfile });
    const rawGuard = analyzeIntent(parsed.draft);
    const guard = applyGuardPolicy(rawGuard, request.mode ?? 'interactive', request.acknowledgedIssueIds);
    if (guard.decision !== 'CONTINUE') return { guard };
    const contract = normalizeContract(parsed.draft, Object.fromEntries((request.acknowledgedIssueIds ?? []).map((id) => [id, 'acknowledged'])));
    const ast = buildVisualAst(contract);
    const validation = validateVisualAst(contract, ast);
    if (validation.status === 'FAIL') return { guard, contract, ast, validation };
    const renderIntent = compileRenderIntent(ast);
    return { guard, contract, ast, validation, renderIntent };
  }

  async validate(request: ValidateRequest): Promise<ValidateResponse> {
    const contract = request.contract ?? normalizeContract({
      sceneIdentity: request.ast.scene.identity,
      location: request.ast.scene.location,
      time: request.ast.scene.time,
      environment: request.ast.scene.environment,
      requiredEntities: request.ast.entities.filter((x) => x.presence === 'required'),
      optionalEntities: request.ast.entities.filter((x) => x.presence === 'optional'),
      forbiddenEntities: request.ast.forbiddenEntities,
      requiredStates: request.ast.states,
      requiredRelations: request.ast.relations,
      layers: request.ast.layers,
      motions: request.ast.motions,
      composition: request.ast.composition,
      renderingGrammar: request.ast.style,
      semanticOpenness: request.ast.semanticOpenness,
      scaleConstraints: request.ast.scaleConstraints,
      countConstraints: request.ast.countConstraints,
      explicitPose: request.ast.explicitPose,
      explicitGaze: request.ast.explicitGaze,
      outputModality: request.ast.scene.outputModality as 'image' | 'illustration' | 'diagram' | 'unknown' | undefined,
      palette: request.ast.palette,
    });
    return validateVisualAst(contract, request.ast);
  }

  explainDiagnostic(code: IntentDiagnostic): DiagnosticHelp { return help[code]; }

  async regression(request: RegressionRequest = {}): Promise<RegressionResponse> {
    if (!this.dependencies.regression) return { status: 'PASS', total: 0, passed: 0, cases: [] };
    return this.dependencies.regression(request);
  }
}
