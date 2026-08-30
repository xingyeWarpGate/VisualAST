# VAST 2.2.1 Greenfield Rewrite — Zcode 无人值守执行规格

状态：执行级规范（Execution Specification）  
目标执行者：Zcode 或等价 Coding Agent  
执行方式：无人值守、从零建仓、自动测试、有限自修复  
目标产物：可运行的 VAST CLI、类型化视觉编译核心、Runtime、审美层、至少一个真实 Renderer Adapter、回归证据包  

---

## 0. 执行指令

你正在从零实现 VAST 2.2.1。不要重构、复制、包装或渐进迁移旧实现。

旧项目已被确认存在硬编码、面向案例编程与测试集过拟合。旧源码不是资产，也不是架构参考。它只允许作为以下三类只读材料：

1. 用户需求来源；
2. 回归输入与失败现象来源；
3. 用于证明新系统没有重现旧缺陷的反例来源。

任何旧生产源码、旧接口、旧 AST 类型、旧 Prompt 模板、旧控制流均不得进入新项目。若无法确认一段代码是否来自旧实现，默认不使用。

### 0.1 完成目标

最终必须交付一个 CLI，能够执行：

```bash
vast parse request.txt
vast compile request.txt --renderer <adapter>
vast render request.txt --renderer <adapter>
vast evaluate <run-id>
vast revise <run-id>
vast test --suite all
vast test --suite live-render
vast doctor
```

完整闭环：

```text
Natural Language
  -> Semantic Runtime
  -> Typed Operations
  -> Deterministic Core Validation
  -> Canonical Scene Contract
  -> Aesthetic Planner
  -> Compiler Passes
  -> RenderIntent
  -> Renderer Adapter
  -> Image
  -> Aesthetic Evaluator
  -> Typed Revision Proposal
  -> Core Validation
```

### 0.2 禁止虚假完成

- mock Renderer 只能证明结构与控制流，不能证明真实图片生成成功。
- 文本 prompt 快照通过，不能证明视觉质量通过。
- 公开测试通过，不能证明没有过拟合。
- CLI 命令存在但返回占位内容，不算实现。
- Runtime 直接生成最终 prompt，不算实现。
- Aesthetic Planner 只追加“精美、电影感、杰作”等词，不算实现。
- Evaluator 直接读取测试答案、目标分数或 Renderer prompt，不算实现。

---

## 1. 验收等级

系统必须诚实报告一个且仅一个等级：

| 等级 | 定义 |
|---|---|
| `STRUCTURAL` | 类型、模块、CLI 和 mock 流程成立 |
| `BEHAVIORAL_PARTIAL` | 公开语义与回归测试部分通过 |
| `BEHAVIORAL_CONFORMANT` | 离线语义、变形、隐藏测试和消融门槛全部通过 |
| `CLOSED_LOOP_CONFORMANT` | 在前一等级基础上，真实 Renderer 多轮生成、评价、修订证据通过 |

没有真实 Renderer 凭据或真实调用失败时，最高只能报告 `BEHAVIORAL_CONFORMANT`。

最终任务状态独立于等级：

- `COMPLETE`：所有要求在可用环境范围内完成，且无谎报。
- `INCOMPLETE`：存在阻断性失败、关键测试失败或证据缺失。

---

## 2. Greenfield 强制边界

### 2.1 新项目

- 创建全新仓库或全新空目录。
- 不在旧项目目录中原地修改。
- 不把旧项目加入 workspace dependency。
- 不引用旧包、旧生成文件或旧内部模块。
- 可以读取需求文档和测试素材，但必须记录来源。

### 2.2 旧代码零依赖证明

产生：

```text
artifacts/vast-2.2.1/greenfield-proof.json
```

至少包含：

```json
{
  "old_source_dependencies": 0,
  "old_internal_package_imports": 0,
  "production_fixture_imports": 0,
  "case_specific_branches": 0,
  "scanned_paths": [],
  "scanner_version": ""
}
```

CI 必须扫描：

- 生产目录是否包含 `Case01`、`Case09`、`fixture`、`goldenAnswer` 等测试身份；
- 是否包含基于 prompt 文本、哈希、文件名或 case id 的输出分支；
- 生产代码是否导入 `tests/`、`fixtures/`、`regression/`、`goldens/`；
- 测试是否通过修改生产配置偷偷注入标准答案；
- Renderer 输入是否含回归标签和评价信息。

扫描失败必须阻止发布。

---

## 3. 推荐技术栈与目录

默认使用 Node.js 20+、TypeScript strict、pnpm。若目标仓库已有明确且合理的 Greenfield 技术约束，可等价替换，但必须保持接口与测试能力。

```text
vast/
  packages/
    schema/
    core/
    runtime/
    aesthetic/
    compiler/
    adapters/
    evaluator/
    cli/
    testkit/
  configs/
    policies/
    renderers/
  tests/
    unit/
    semantic/
    metamorphic/
    holdout/
    regression/
    adapter/
    live-render/
    security/
  artifacts/
  docs/
```

依赖方向必须是单向的：

```text
schema <- core
schema <- runtime
schema <- aesthetic
schema <- compiler
schema <- adapters
schema <- evaluator
core <- orchestrator
runtime <- orchestrator
aesthetic <- orchestrator
compiler <- orchestrator
adapters <- orchestrator
evaluator <- orchestrator
```

禁止：

- `core -> runtime`
- `core -> adapters`
- `adapters -> evaluator`
- `runtime -> tests`
- `production -> fixtures`

---

## 4. 权威层级

冲突时按以下优先级处理：

1. 用户显式硬约束；
2. 安全和合法性；
3. Canonical Scene Contract 类型与不变量；
4. Renderer 能力边界；
5. 审美策略；
6. 默认值；
7. 模型自由发挥。

审美层不得为了“更好看”违反 1–4。Runtime 不得把自己的推断伪装成用户要求。

---

## 5. 核心数据模型

所有跨模块数据必须经过版本化 schema 校验。禁止用未验证的任意 JSON 在模块间传递。

### 5.1 SemanticProposal

```ts
export interface SemanticProposal {
  schemaVersion: "2.2.1";
  operations: TypedOperation[];
  ambiguities: Ambiguity[];
  assumptions: Assumption[];
  sourceEvidence: SourceEvidence[];
  confidence: number;
}
```

`TypedOperation` 使用可辨识联合类型，至少支持：

- `declare_entity`
- `declare_attribute`
- `declare_relation`
- `declare_event`
- `declare_motion`
- `declare_emotion`
- `declare_presence`
- `declare_saliency`
- `declare_openness`
- `declare_style_preference`
- `declare_forbidden`
- `declare_freedom_slot`

Runtime 只能输出这些操作，不能直接构造已验证 Contract。

### 5.2 CanonicalSceneContract

至少包含：

```ts
export interface CanonicalSceneContract {
  schemaVersion: "2.2.1";
  requestId: string;
  entities: EntityNode[];
  relations: RelationNode[];
  events: EventNode[];
  presence: PresenceConstraint[];
  identityInvariants: IdentityInvariant[];
  spatialInvariants: SpatialInvariant[];
  scaleRelations: ScaleRelation[];
  narrativeWeights: WeightMap;
  saliencyWeights: WeightMap;
  semanticOpenness: OpennessConstraint[];
  stylePreferences: StylePreference[];
  forbiddenOutcomes: ForbiddenOutcome[];
  freedomSlots: FreedomSlot[];
  assumptions: AcceptedAssumption[];
  unresolvedAmbiguities: Ambiguity[];
}
```

必须显式区分：

- Required / Optional / Forbidden；
- Narrative Importance / Visual Saliency；
- Identity / Appearance；
- Physical Scale / Attention Weight；
- User Requirement / Runtime Inference / Aesthetic Choice；
- Determined Meaning / Intentionally Open Meaning。

### 5.3 AestheticPlan

```ts
export interface AestheticPlan {
  schemaVersion: "2.2.1";
  visualThesis: string;
  focalHierarchy: FocalTarget[];
  composition: CompositionPlan;
  poseDynamics: PoseDynamicsPlan;
  formLighting: FormLightingPlan;
  shapeLanguage: ShapeLanguagePlan;
  faceIdentity?: FaceIdentityPlan;
  expression: ExpressionPlan[];
  informationBudget: InformationBudget;
  renderingGrammar: RenderingGrammar;
  sceneCredibility: SceneCredibilityPlan;
  controlledFreedom: FreedomAllocation[];
  decisions: AestheticDecision[];
}
```

每个 `AestheticDecision` 必须记录：目标、理由、影响节点、优先级、是否可降级、来源策略。不得只有形容词。

### 5.4 RenderIntent

Renderer-neutral，至少包含：

- 正向绘制指令；
- 负向限制；
- 实体与区域映射；
- 构图和镜头；
- 动作/重力/惯性约束；
- 光源与结构受光；
- 信息预算；
- 分阶段计划；
- Adapter 可安全忽略的软项；
- 不可忽略的硬项。

RenderIntent 禁止包含：case id、期望评分、历史失败答案、回归标签。

---

## 6. Semantic Runtime

### 6.1 职责

Runtime 负责：

- 从自然语言识别实体、关系、事件、因果、情绪和视觉意图；
- 区分硬约束、软偏好、推断和自由区域；
- 将模糊输入转成候选 Typed Operations；
- 暴露歧义与置信度；
- 为每个重要结论附加来源证据。

Runtime 不负责：

- 直接生成最终 prompt；
- 跳过 Core；
- 判断图像是否好看；
- 根据测试名称返回答案；
- 静默补齐品牌、年龄、服装、场所等用户未指定事实。

### 6.2 Evidence 规则

每个操作必须标记来源：

```ts
type Provenance =
  | { kind: "explicit_user"; span: TextSpan }
  | { kind: "safe_inference"; rationale: string }
  | { kind: "policy_default"; policyId: string }
  | { kind: "aesthetic_choice"; plannerId: string };
```

用户显式项不可被后三者覆盖。低置信度推断进入 ambiguity。

### 6.3 Runtime 测试

- 同义改写产生语义等价的关键操作；
- 词序改变不应改变实体数量；
- 删除一个要求只影响相关节点；
- 添加无关句子不应污染核心场景；
- 替换题材时不得泄漏原题材专属元素；
- 模糊对象不得被擅自收窄；
- 对矛盾要求应输出 diagnostic，不得随机选择。

---

## 7. Deterministic Constraint Core

Core 必须纯确定性、无模型调用、无 Renderer 调用、无审美评分。

### 7.1 Core API

```ts
validateProposal(proposal, context): ValidationResult
applyOperations(base, operations): TransitionResult
validateContract(contract): ValidationResult
validateRevision(contract, patch): ValidationResult
canonicalize(contract): CanonicalSceneContract
```

### 7.2 必须验证的不变量

- Entity Presence；
- Entity Identity；
- Required/Forbidden 冲突；
- 空间关系；
- 相对尺度与容差；
- 数量；
- 事件参与者完整性；
- Narrative Prop Lock；
- Scene Identity Lock；
- Semantic Openness；
- Composition Dependency；
- 用户硬约束不可由低权限来源覆盖。

所有失败返回稳定 diagnostic code、节点路径与修复建议，不能只返回字符串。

---

## 8. Aesthetic Policy Layer

审美层由 Planner 与 Evaluator 构成，两者必须隔离。

### 8.1 Aesthetic Planner

输入：已验证 Contract、用户/项目 Aesthetic Profile、Renderer Capability、复杂度预算。  
输出：已验证 AestheticPlan。

Planner 必须完成以下 pass：

1. Visual Thesis：一句可操作的画面主张；
2. Focal Hierarchy：最多三个注意中心并分配预算；
3. Composition：主体位置、动线、遮挡、负空间；
4. Emotion-to-Pose：把情绪编译为重心、肩颈、手势、视线；
5. Motion/Physics：重力、惯性、碰撞趋势、液体和衣发方向；
6. Form Lighting：光源方向、面部平面、边缘光和反射来源；
7. Shape Language：人物、服装、道具的母形与重复节奏；
8. Face Identity：非模板化身份与表达形变；
9. Information Budget：前中后景与局部纹理预算；
10. Scene Credibility：文化、功能和使用痕迹；
11. Rendering Grammar：线稿/平涂/硬边阴影等绘制动作；
12. Controlled Freedom：明确允许模型自由发挥的位置。

### 8.2 审美配置不得进入 Core

将偏好存为可替换 policy/profile。例如：

```yaml
rendering:
  line_driven: high
  cel_shadow_steps: [2, 3]
  gradient_budget: low
  material_microtexture: low
face:
  template_similarity_max: 0.42
  authored_asymmetry: required
  expression_specificity: high
scene:
  cultural_specificity: high
  generic_background_penalty: 0.8
```

Core 不得出现“美少女”“赛璐珞”“中国小巷”等偏好词。

### 8.3 Face Identity Plan

不得用“漂亮脸、精致五官”作为身份定义。至少描述：

- 头面比例与轮廓；
- 眼形差异而非单纯大眼；
- 眉眼轴关系；
- 鼻口距离与嘴角静态倾向；
- 至少一个非破坏性的轻微不对称；
- 发际线、耳部或侧脸识别点；
- 表情造成的具体形变；
- 光照下仍应保留的身份特征。

禁止通过成熟妆容、写实皱纹或夸张幼态来弥补身份不足。

### 8.4 Planner 消融门槛

必须对相同 Contract 和 Renderer 执行：

- Planner 全开；
- 关闭 Face Identity；
- 关闭 Motion/Physics；
- 关闭 Information Budget；
- 关闭个人 Aesthetic Profile；
- Planner 全关，仅保留合规编译。

若全开版本在约定指标上没有稳定提升，审美层不得判定有效。

---

## 9. 复杂度与分阶段生成

### 9.1 Prompt Attention Budget

为每个 RenderIntent 计算：

- 实体数量；
- 硬约束数量；
- 关系数量；
- 高精度人体区域数；
- 物理事件数；
- 光源数；
- 文字/品牌要求；
- 风格要求；
- 负面限制；
- 估计 token/概念密度。

### 9.2 Complexity Gate

输出：`single_pass | staged_recommended | staged_required | unsupported`。

遇到以下情况至少 `staged_recommended`：

- 多人物且有复杂互动；
- 手、脸、动态、文字和复杂背景同时要求高精度；
- 约束超过 Adapter 的实测注意力阈值；
- 用户要求局部修复但其他区域必须锁定；
- 真实测试显示单次生成的约束保持率明显下降。

### 9.3 默认阶段

```text
Stage 1: 构图、实体、数量、空间、动作与重力
Stage 2: 主体身份、面部、手部、服装和关键道具
Stage 3: 场景文化细节、文字、使用痕迹
Stage 4: 光照、色彩、材质节制与局部修饰
```

Adapter 不支持遮罩/图生图时，不得伪造局部锁定能力；应降低声明等级并记录能力缺口。

---

## 10. Compiler

Compiler 必须由可单测的确定性 pass 组成：

1. Identity Pass；
2. Presence Pass；
3. Spatial/Scale Pass；
4. Event/Motion Pass；
5. Attention Pass；
6. Aesthetic Lowering Pass；
7. Information Compression Pass；
8. Negative Constraint Pass；
9. Staging Pass；
10. Sanitizer。

同一输入、相同配置和相同 Runtime proposal 下，Compiler 输出必须稳定。

### 10.1 Instruction Compression

不得把所有上游字段逐句拼接到 prompt。压缩规则：

- 合并同义要求；
- 删除低优先级重复形容词；
- 将抽象情绪替换成动作指令；
- 将“高级、精致”等空泛词替换或删除；
- 对冲突软项按优先级取舍；
- 保留硬约束和因果链；
- 输出被删除、合并、降级的审计记录。

---

## 11. Renderer Adapter

至少实现：

1. `mock`：只用于结构测试；
2. 一个真实图像 Renderer Adapter。

真实 Adapter 名称由当前环境能力决定，不得假设某服务必然可用。

```ts
interface RendererAdapter {
  id: string;
  capabilities(): RendererCapabilities;
  lower(intent: RenderIntent): AdapterRequest;
  validateRequest(request: AdapterRequest): ValidationResult;
  render(request: AdapterRequest): Promise<RenderResult>;
}
```

每次真实生成必须保存：

- Contract 哈希；
- AestheticPlan 哈希；
- RenderIntent 哈希；
- Adapter 及版本；
- 实际发送参数（敏感值脱敏）；
- 图片引用；
- 时间、费用/用量（可获得时）；
- 随机种子（支持时）；
- 分阶段记录。

---

## 12. Aesthetic Evaluator 与修订

Evaluator 必须在 Renderer 调用完成后独立运行。Renderer 不能接收 evaluator rubric。

### 12.1 评价维度

- Constraint Fidelity；
- Narrative Readability；
- Pose Dynamics；
- Physical Coherence；
- Face Identity；
- Expression–Action Fit；
- Composition；
- Scene Credibility；
- Form Lighting；
- Rendering Grammar；
- AI Artifact Risk；
- Information Budget Compliance。

### 12.2 评价证据

每个缺陷必须附：

- 图像区域或实体引用；
- 可观察现象；
- 严重度；
- 置信度；
- 违反的 Contract/Plan 节点；
- 建议 Typed Patch。

禁止只输出“更自然”“更好看”。

### 12.3 修订权限

- Evaluator 只能提出 patch；
- Core 验证 patch；
- 用户硬约束不得被修订；
- 高复杂度时优先局部或分阶段修订；
- 每轮只修复有限目标，防止修 A 坏 B；
- 最多自动修订两轮，超过后停止并报告。

---

## 13. CLI 规范

### 13.1 基本命令

```bash
vast parse <input> [--json]
vast validate <contract>
vast plan <input|contract> [--profile <id>]
vast compile <input|contract> --renderer <id> [--json]
vast render <input|contract> --renderer <id> [--staged auto|on|off]
vast evaluate <run-id> [--json]
vast revise <run-id> [--max-rounds 2]
vast inspect <run-id>
vast test --suite <unit|semantic|metamorphic|holdout|regression|adapter|live-render|all>
vast doctor
```

### 13.2 退出码

| Code | 含义 |
|---:|---|
| 0 | 成功 |
| 2 | 输入或 schema 错误 |
| 3 | Contract 验证失败 |
| 4 | Runtime 失败或歧义需人工处理 |
| 5 | Adapter 不可用 |
| 6 | Render 失败 |
| 7 | Evaluation 未达阈值 |
| 8 | Regression 失败 |
| 9 | 安全/反硬编码门禁失败 |
| 10 | 能力不足，无法诚实完成 |

### 13.3 `vast doctor`

检查：

- Node/pnpm；
- schema 版本；
- Runtime 配置；
- Adapter 凭据是否存在但不输出值；
- Renderer 能力；
- 输出目录写权限；
- 测试资源；
- 生产/测试隔离；
- live-render 是否可运行。

---

## 14. 测试体系

### 14.1 单元测试

覆盖所有 schema、Core transition、Validator、Compiler pass、复杂度估算、Adapter lowering、诊断码。

最低：生产代码核心模块语句覆盖率 85%，分支覆盖率 80%。覆盖率不是质量替代品。

### 14.2 Semantic Assertions

断言结构语义，不断言完整 prompt 字符串。例如：

- required entity 保留；
- forbidden entity 不出现；
- narrative 与 saliency 分离；
- 相对尺度关系存在；
- 动作原因与受力方向相连；
- 模糊对象保持开放。

### 14.3 Metamorphic Tests

至少实现：

- 同义改写；
- 语序置换；
- 无关句注入；
- 单属性增删；
- 主体左右镜像；
- 镜头变化；
- 风格替换；
- 题材替换；
- 实体改名；
- 数量变化；
- 软要求冲突；
- 硬要求冲突。

每个测试声明哪些节点应保持、哪些允许变化。

### 14.4 Holdout Tests

测试集必须在执行时从独立文件加载。生产代码不得读取。至少包含：

- 未在示例中出现的生活场景；
- 非人物主导场景；
- 极简构图；
- 多人物互动；
- 材料异构；
- 极端留白；
- 空间尺度关系；
- 语义开放对象；
- 非二次元风格；
- 文化地域切换。

若执行者能够看到所有 holdout 答案，仍必须通过变形生成器动态派生未见组合，避免固定答案过拟合。

### 14.5 Anti-Hardcode Tests

- 随机替换实体名称，不变量仍成立；
- 随机生成 case id，不得影响输出；
- prompt 哈希变化一个字符，不得触发完全不同的专属路径；
- 删除测试目录后生产 build 仍成功；
- 禁止 import 图检查；
- 生产 bundle 字符串扫描；
- fixture 泄漏扫描；
- Runtime 示例消融后仍能处理同类未见题材。

### 14.6 Aesthetic Ablation Tests

使用成对或多组运行，对比 Planner 全开与各 pass 关闭。结构性指标必须自动计算；视觉性指标可由隔离 Evaluator 评分，但需盲化运行标签。

最低门槛：

- 全开不得降低硬约束保持率；
- Motion/Physics 开启后，相关错误率相对下降；
- Information Budget 开启后，主体显著性和背景噪声指标改善；
- Face Identity 开启后，跨图身份特征保持和模板相似风险改善；
- 改善需跨多个 holdout 题材，不得只在单一案例成立。

### 14.7 Live Image Generation Tests

至少 6 个题材，包含低、中、高复杂度：

1. 单人物生活动作；
2. 双人物因果互动；
3. 多实体空间与尺度；
4. 强风格化极简场景；
5. 文化具体场景；
6. 高复杂度、应触发 staged render 的场景。

每例至少运行：compile、render、evaluate；其中至少两例运行 revise 再 render。

通过要求：

- 100% 生成可读取图片；
- required/forbidden 硬约束自动/人工复核通过率达到 90%；
- 不出现系统性实体合并、数量漂移或严重人体结构错误；
- 高复杂度案例正确触发 staged；
- 修订后目标缺陷改善，且关键不变量不回归；
- 输出包含完整 provenance 和脱敏证据。

真实视觉判断存在模型误差，因此最终报告必须区分自动评分与人工抽检，不得把 Evaluator 自评分当绝对真值。

---

## 15. 回归测试

旧失败案例允许转写为普通输入 fixture，但须遵守：

- fixture 仅存在于测试目录；
- 不把案例名称送入 Runtime/Renderer；
- 期望结果写为语义不变量和禁止失败模式；
- 不要求固定 prompt；
- 不要求固定像素输出；
- 每个旧案例至少生成两个跨题材变体；
- 若原预期本身错误，以通用机制和用户硬约束为准。

重点回归类别：

- 人物/道具合并；
- 手部和肢体错误；
- 头发、液体、衣物不服从重力；
- 动作与表情不一致；
- 尺度被“宏大感”篡改；
- 场景过度整洁或文化空泛；
- 背景纹理抢占主体；
- 光源未作用于面部结构；
- 二次元脸模板化；
- 提示词过载导致注意力稀释；
- 局部修订造成其他区域回归；
- Renderer 接收到测试元数据。

---

## 16. 自动评分与最终门禁

生成：

```text
artifacts/vast-2.2.1/final-verdict.json
```

示例：

```json
{
  "task_status": "COMPLETE",
  "conformance": "CLOSED_LOOP_CONFORMANT",
  "greenfield": true,
  "old_source_dependencies": 0,
  "cli_commands_passed": true,
  "unit_pass_rate": 1,
  "semantic_pass_rate": 0.98,
  "metamorphic_pass_rate": 0.96,
  "holdout_pass_rate": 0.92,
  "anti_hardcode_passed": true,
  "ablation_effective": true,
  "live_render": {
    "available": true,
    "cases": 6,
    "successful_images": 6,
    "revision_non_regression_rate": 1
  },
  "blocking_failures": [],
  "known_limitations": []
}
```

### 16.1 BEHAVIORAL_CONFORMANT 门槛

- unit：100%；
- semantic：>= 95%；
- metamorphic：>= 92%；
- holdout：>= 90%；
- security/anti-hardcode：100%；
- 核心覆盖率达标；
- 审美消融证明有效；
- 无 P0/P1 缺陷；
- 旧源码依赖为零。

### 16.2 CLOSED_LOOP_CONFORMANT 附加门槛

- live-render 套件全部执行；
- 至少 6 张有效生成图；
- 至少 2 个真实修订闭环；
- 高复杂度 staged 案例成功；
- 修订无关键不变量回归；
- 每个运行证据完整；
- 没有用 mock 替代任何 live 证据。

---

## 17. 无人值守自修复策略

Zcode 可以自动：

- 修复类型、lint、单元测试错误；
- 调整通用算法和阈值；
- 补充通用 diagnostic；
- 改进 Runtime schema-guided 提示；
- 改进跨题材测试；
- 降低 prompt 冗余；
- 根据 Adapter 实测能力调整 staged 阈值。

Zcode 不得自动：

- 为某个 fixture 新增专属生产分支；
- 把 holdout 答案加入 Runtime 示例；
- 降低安全或反硬编码门槛以获得通过；
- 删除失败测试；
- 将失败改标 skipped；
- 用 mock 替代真实生成；
- 擅自改变用户硬约束；
- 无限调用付费 Renderer。

### 17.1 修复循环

```text
run tests
 -> classify failure
 -> identify general mechanism
 -> implement smallest general fix
 -> run focused tests
 -> run full regression
 -> run anti-hardcode scan
 -> record evidence
```

同一失败最多自动修复 3 次。仍失败则记录 blocker，不得继续通过放宽标准掩盖。

真实 Renderer 默认总调用上限：12 次；如环境另有明确预算，以更低者为准。达到上限后停止并报告。

---

## 18. 实施里程碑

### M0：Greenfield 初始化

- 新仓库；
- strict TS；
- 模块依赖门禁；
- CI；
- 旧源码零依赖扫描。

### M1：Schema 与 Core

- Typed Operations；
- Contract；
- Validator；
- deterministic transitions；
- unit tests。

### M2：Runtime

- schema constrained proposal；
- evidence/provenance；
- ambiguity；
- semantic/metamorphic tests。

### M3：基础审美层与 Compiler

- composition、pose、lighting、information budget；
- deterministic passes；
- RenderIntent；
- compression。

### M4：CLI 与 Mock Adapter

- 所有 CLI 命令骨架具备真实行为；
- run artifact；
- doctor；
- inspect。

### M5：真实 Adapter 与复杂度分阶段

- capability gate；
- live renderer；
- staged execution；
- 失败恢复。

### M6：Evaluator、Revision、Face Identity

- 隔离评价；
- typed patch；
- 两轮上限；
- face anti-template；
- ablation。

### M7：完整回归和发布判定

- holdout；
- anti-hardcode；
- live-render；
- evidence bundle；
- final verdict。

每个里程碑完成后必须运行此前全部测试，禁止最后一次性补测试。

---

## 19. 证据包

最终必须生成：

```text
artifacts/vast-2.2.1/
  final-verdict.json
  greenfield-proof.json
  architecture.json
  dependency-graph.json
  test-summary.json
  coverage/
  anti-hardcode-report.json
  semantic-report.json
  metamorphic-report.json
  holdout-report.json
  ablation-report.json
  adapter-capabilities.json
  live-render-report.json
  runs/
  images/
  limitations.md
  execution-log.md
```

所有报告必须可由命令重新生成，不能手写伪造结果。

---

## 20. 最终交付

交付内容：

1. 新 VAST 源码；
2. 可安装 CLI；
3. README 快速开始；
4. 配置示例；
5. Runtime 与 Renderer 凭据说明；
6. 全部测试；
7. 证据包；
8. 最终判定；
9. 已知限制；
10. 从零实现证明。

最终回复必须明确回答：

- 是否从零实现；
- 是否存在任何旧源码依赖；
- CLI 哪些命令真实可用；
- 是否完成真实图片生成；
- 使用哪个 Adapter；
- 真实生成了多少张；
- 回归与 holdout 结果；
- 审美层消融是否证明有效；
- 当前 conformance 等级；
- 未完成项和阻断原因。

不得只回复“已完成”或“所有测试通过”。

---

## 21. 给 Zcode 的最终启动语

```text
严格执行本规格，从一个全新空目录创建 VAST 2.2.1。
不要读取或迁移旧生产源码；旧材料只能转化为测试需求和失败模式。
先建立类型化 Core，再实现 Runtime、审美层、Compiler、CLI、Adapter、Evaluator 与 Revision。
每个里程碑运行完整回归与反硬编码扫描。
有真实 Renderer 凭据时执行 live-render；没有时诚实停在 BEHAVIORAL_CONFORMANT，禁止用 mock 冒充。
允许对通用机制进行最多三轮自动修复，禁止针对单一 fixture 写生产分支、删除失败测试或降低门槛。
最后生成完整 evidence bundle 和 final-verdict.json，并按规格逐项报告。
```

