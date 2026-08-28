import { applyGuardPolicy, analyzeIntent } from '../domain/intent-guard.js';
import { buildVisualAst } from '../domain/ast.js';
import { compileRenderIntent } from '../domain/compiler.js';
import { normalizeContract } from '../domain/normalize.js';
import { validateVisualAst } from '../domain/validator.js';
import type { ApplicationDependencies } from './ports.js';
import type { CompileRequest, CompileResponse, DiagnosticHelp, InspectRequest, InspectResponse, IntentDiagnostic, ParserPort, RegressionRequest, RegressionResponse, ValidateRequest, ValidateResponse } from '../domain/types.js';

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
  constructor(private readonly parser: ParserPort, private readonly dependencies: ApplicationDependencies = {}) {}

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
