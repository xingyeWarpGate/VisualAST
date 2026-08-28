# VAST 2.0.2 CLI + Agent Plugin 工程实现 Spec

> 状态：Engineer-ready MVP specification  
> 基准：`vast2.0.md` / VAST Core 2.0.2  
> 使用者：个人本地工作流  
> 执行建议：LunaMax 分里程碑实现，每个里程碑独立测试和提交

## 1. 最终目标

把现有 VAST 2.0.2 回归 Core 构建成一个真正可用的无头视觉编译器入口：

```text
自然语言视觉意图
→ ParserPort
→ IntentDraft
→ Authoring Intent Guard
→ Scene Contract
→ Typed VisualAST
→ Validate
→ Compile
→ Renderer-neutral RenderIntent
```

首版提供两个入口：

1. `vast` CLI：个人可直接在终端使用，也方便其他 Agent 通过进程调用。
2. Agent Plugin：把同一 Application API 暴露为工具；优先适配 DSH，但 Core 不依赖 DSH。

首版不负责调用图像模型。输出到 `RenderIntent` 即结束。

## 2. 成功标准

用户可以执行：

```bash
vast inspect scene.txt
vast compile scene.txt --format prompt
vast compile scene.txt --format render-intent --out render-intent.json
vast validate visual-ast.json
vast regression
```

Agent 可以调用：

```text
vast.inspect_intent
vast.compile_intent
vast.validate_ast
vast.explain_diagnostic
```

并获得稳定的结构化 JSON，不依赖解析终端彩色文本。

## 3. 首版范围

### 3.1 必须完成

- TypeScript 类型与运行时边界校验。
- `ParserPort` 接口。
- 一个 OpenAI-compatible Parser Adapter，使用 Node 原生 `fetch`。
- 一个确定性 Fixture/Mock Parser，供测试和离线回归。
- Authoring Intent Guard 交互与非交互策略。
- Scene Contract、VisualAST、Diagnostic、RenderIntent 的稳定 DTO。
- CLI：`inspect`、`compile`、`validate`、`regression`、`version`。
- Application API，CLI 和插件共用，不复制业务逻辑。
- DSH Plugin Adapter；实现前必须读取目标 DSH 仓库的真实插件 API 和 Manifest。
- 现有 40 项测试全部保留。
- CLI contract tests、Plugin contract tests、Parser adapter tests。

### 3.2 明确不做

- 不调用 GPT Image、即梦、Midjourney、ComfyUI。
- 不做 Renderer Adapter。
- 不做自动视觉 Evaluator。
- 不做网页、桌面端、无限画布、节点编辑器。
- 不做数据库、账号系统、队列、Redis、遥测平台。
- 不接 OpenViking、Hindsight 或个人记忆路由。
- 不做 MCP Server；Plugin 已能满足首阶段 Agent 使用。
- 不把 DSH SDK、Provider SDK 或 CLI 库引入 Core。
- 不在 Parser 内自动修复作者意图。

## 4. 关键设计决定

### 4.1 小内核

保持单一 Node 包，不建立 monorepo，不拆微服务。

```text
vast/
├─ src/
│  ├─ domain/
│  ├─ application/
│  ├─ adapters/
│  ├─ cli/
│  └─ plugin/
├─ tests/
├─ fixtures/
├─ package.json
├─ tsconfig.json
└─ README.md
```

### 4.2 依赖方向

```text
CLI ───────────────┐
                   ↓
DSH Plugin → Application API → Domain Core
                   ↑
            Parser Adapter
```

允许方向：外层依赖内层。禁止 Domain Core 导入 CLI、DSH、网络、文件系统或环境变量。

### 4.3 Core 必须保持纯函数

以下函数不能访问文件、网络、环境变量、当前时间或全局可变状态：

```ts
analyzeIntent(draft, policy): IntentGuardResult
normalizeContract(draft, decisions): SceneContract
buildVisualAst(contract): VisualAST
validateVisualAst(contract, ast): ValidationResult
compileRenderIntent(ast, options): RenderIntent
sanitizeRenderIntent(intent): RenderIntent
```

### 4.4 Parser 与 Guard 分离

Parser 可以使用 LLM 抽取结构，但不能直接决定 `BLOCK / PAUSE / CONTINUE`。

```ts
export interface ParserPort {
  parse(input: ParseRequest): Promise<ParseResult>;
}

export type ParseRequest = {
  text: string;
  locale?: "zh-CN" | "en";
  parserProfile?: string;
};

export type ParseResult = {
  draft: IntentDraft;
  parser: {
    adapter: string;
    model?: string;
    schemaVersion: string;
  };
  warnings: string[];
};
```

Parser 输出后，必须由确定性的 `analyzeIntent` 决定是否暂停或阻断。

## 5. DTO 与版本协议

所有可写入文件或跨 CLI/Plugin 边界的对象必须包含：

```ts
type Envelope<T> = {
  vastVersion: "2.0.2";
  schemaVersion: "1";
  kind: string;
  data: T;
};
```

首版稳定类型：

```text
vast.intent-draft
vast.intent-diagnostics
vast.scene-contract
vast.visual-ast
vast.validation-result
vast.render-intent
vast.compile-result
```

禁止依赖完整 Prompt 字符串做结构测试。测试字段、断言、Case ID、评分和 Guard 元数据不得进入 `RenderIntent`。

### 5.1 CompileResult

```ts
type CompileResult = {
  guard: IntentGuardResult;
  contract?: SceneContract;
  ast?: VisualAST;
  validation?: ValidationResult;
  renderIntent?: RenderIntent;
};
```

当 Guard 为 `PAUSE` 或 `BLOCK` 时，`contract/ast/renderIntent` 不得伪造。

## 6. Parser Adapter

### 6.1 OpenAI-compatible adapter

首版只实现协议适配，不绑定任何厂商 SDK。

```ts
type ParserAdapterConfig = {
  baseUrl: string;
  apiKeyEnv: string;
  model: string;
  timeoutMs: number;
};
```

规则：

- 使用 Node 20 原生 `fetch` 和 `AbortSignal.timeout`。
- API Key 只从指定环境变量读取，不写入配置文件或日志。
- 要求模型返回 JSON Schema 约束下的 `IntentDraft`。
- 响应必须经过运行时 Schema 校验；失败不得把半结构化对象送入 Guard。
- 网络错误、鉴权错误、限流、Schema 错误必须区分。
- 默认不自动重试；仅允许一次“JSON schema repair”请求，且必须保留原错误。
- 日志不得打印完整用户意图或密钥；`--debug` 才可打印脱敏摘要。

### 6.2 Fixture parser

`FixtureParser` 根据 fixture id 返回冻结 `IntentDraft`，用于：

- 单元测试；
- CLI 离线演示；
- Case 01–09 回归；
- 不消耗模型额度。

## 7. CLI 设计

可执行文件名：`vast`。

使用 Node 原生 `util.parseArgs`；首版不引入 Commander/Yargs。颜色仅在 TTY 输出层使用，不进入 JSON。

### 7.1 通用输入

```bash
vast <command> [file|-]
```

- `file`：UTF-8 文本或 JSON。
- `-`：从 stdin 读取。
- 没有 file 且 stdin 为 TTY：进入一次性输入提示，不进入完整 TUI。
- `--json`：stdout 只输出机器 JSON。
- 人类提示、进度和错误写 stderr。

### 7.2 `vast inspect`

只运行：

```text
Parse → Intent Guard
```

示例：

```bash
vast inspect scene.txt
vast inspect - --json
vast inspect scene.txt --mode notice-only
```

参数：

```text
--mode interactive|notice-only|strict
--ack <issue-id>        可重复
--parser <profile>
--json
```

行为：

- `BLOCK`：退出，不生成 Contract。
- `PAUSE + TTY`：展示问题与选项，等待用户确认。
- `PAUSE + 非 TTY`：不得自动确认；JSON 返回 issue，并使用退出码 3。
- `notice-only`：保留 severity 和 issues，但不暂停。
- `strict`：WARNING 也返回失败退出码，不询问。

### 7.3 `vast compile`

```bash
vast compile scene.txt --format prompt
vast compile scene.txt --format render-intent
vast compile scene.txt --format ast
vast compile scene.txt --out result.json
```

参数：

```text
--format prompt|render-intent|ast|contract|full
--out <path|->
--mode interactive|notice-only|strict
--ack <issue-id>
--parser <profile>
--json
```

约束：

- Guard 未 `CONTINUE` 不得编译。
- Validator 未 PASS 不得输出 RenderIntent。
- `prompt` 格式只输出纯画面中文提示词，不输出 AST、诊断、评分或 Markdown 包装。
- 写文件采用先写临时文件再原子 rename，避免中断产生半文件。

### 7.4 `vast validate`

```bash
vast validate visual-ast.json
vast validate visual-ast.json --contract scene-contract.json --json
```

只运行确定性 Validator，不调用 Parser 或网络。

### 7.5 `vast regression`

```bash
vast regression
vast regression --case 09
vast regression --layer guard
```

首版复用现有测试和 fixture。不得通过 CLI 重新实现一套回归逻辑。

### 7.6 `vast version`

输出：

```text
VAST Core 2.0.2
Schema 1
CLI <package-version>
```

## 8. 退出码

| Code | 含义 |
|---:|---|
| 0 | 成功 |
| 2 | AST/Contract 验证失败 |
| 3 | Guard PAUSE，非交互环境需要作者决定 |
| 4 | Guard BLOCK |
| 5 | 输入、配置或文件错误 |
| 6 | Parser/网络/Schema 错误 |
| 7 | 内部错误或不变量破坏 |

CLI 和 Plugin 错误码必须共用枚举。

## 9. 配置

优先级：

```text
命令行参数
→ VAST_CONFIG 指定文件
→ 项目 .vast/config.json
→ 内置安全默认值
```

示例：

```json
{
  "parserProfiles": {
    "default": {
      "adapter": "openai-compatible",
      "baseUrl": "https://example.invalid/v1",
      "apiKeyEnv": "VAST_PARSER_API_KEY",
      "model": "configured-model",
      "timeoutMs": 30000
    }
  },
  "guard": {
    "mode": "interactive"
  },
  "output": {
    "locale": "zh-CN"
  }
}
```

配置文件不得保存真实 API Key。

## 10. Application API

CLI 与插件必须调用同一 API：

```ts
export interface VastApplication {
  inspect(request: InspectRequest): Promise<InspectResponse>;
  compile(request: CompileRequest): Promise<CompileResponse>;
  validate(request: ValidateRequest): Promise<ValidateResponse>;
  explainDiagnostic(code: IntentDiagnostic): DiagnosticHelp;
  regression(request: RegressionRequest): Promise<RegressionResponse>;
}
```

Application 层负责 orchestration，但不负责：

- 直接读 `process.env`；
- 输出终端文字；
- 导入 DSH SDK；
- 调用 Renderer；
- 写测试报告图片。

## 11. Agent Plugin

### 11.1 工具面

只暴露四个首版工具：

```text
vast.inspect_intent
vast.compile_intent
vast.validate_ast
vast.explain_diagnostic
```

`regression` 默认不暴露给普通 Agent，避免无意运行完整测试；可作为开发模式工具。

### 11.2 工具输入输出

`vast.inspect_intent`：

```ts
input: {
  text: string;
  mode?: "notice-only" | "strict";
  acknowledgedIssueIds?: string[];
  parserProfile?: string;
}
output: Envelope<IntentGuardResult>
```

插件环境不允许真正的交互暂停，因此发现 WARNING 时返回结构化 `PAUSE`，让上层 Agent 向用户询问；不得替用户自动确认。

`vast.compile_intent` 只有在：

```text
Guard CONTINUE
AND Validator PASS
```

时返回 RenderIntent。

### 11.3 DSH 适配要求

编码前先在目标 DSH 仓库中确认：

- 插件 Manifest 的真实格式；
- 工具注册函数；
- 输入 Schema 方案；
- 生命周期 hook；
- 错误返回约定；
- 插件打包和安装命令。

如果 DSH API 与本 Spec 不同，只修改 `src/plugin/dsh/`，不得为了适配 DSH 改 Domain/Application API。

禁止通过 `child_process` 调用 `vast` CLI；插件应直接导入 `VastApplication`。

## 12. 建议目录

```text
src/
├─ domain/
│  ├─ types.ts
│  ├─ schemas.ts
│  ├─ intent-guard.ts
│  ├─ normalize.ts
│  ├─ validator.ts
│  ├─ compiler.ts
│  ├─ grammar-budget.ts
│  └─ renderer-boundary.ts
├─ application/
│  ├─ ports.ts
│  ├─ vast-application.ts
│  └─ errors.ts
├─ adapters/
│  └─ parser/
│     ├─ openai-compatible-parser.ts
│     └─ fixture-parser.ts
├─ cli/
│  ├─ main.ts
│  ├─ io.ts
│  ├─ format-human.ts
│  └─ format-json.ts
├─ plugin/
│  ├─ tools.ts
│  └─ dsh/
│     ├─ manifest.*
│     └─ index.ts
└─ index.ts
```

## 13. 依赖策略

运行时只允许：

- `zod`：边界 DTO 与 Parser 响应校验。

开发依赖：

- `typescript`
- `tsx`
- `@types/node`

测试优先 Node 内置 `node:test`。不安装 Jest、Vitest、DI 容器、日志框架、HTTP SDK 或 CLI 框架。

若目标 DSH SDK 是插件运行的必要依赖，只允许它出现在 Plugin Adapter 层。

## 14. 日志与隐私

- 默认只记录阶段、耗时、错误类型，不记录完整原始意图。
- `--debug` 输出截断且脱敏的输入摘要。
- API Key、Authorization、Cookie 永不输出。
- JSON stdout 必须纯净；日志只能去 stderr。
- Plugin 返回错误对象，不抛出包含网络响应全文的异常。

## 15. 测试要求

### 15.1 必须保留

- 当前 40/40 Core 回归。
- Case 01–09 golden path。
- Mutation suite。
- RendererInput 元数据隔离。

### 15.2 新增

1. CLI stdin/file 输入一致。
2. `--json` stdout 无日志污染。
3. 非 TTY PAUSE 返回 code 3。
4. BLOCK 返回 code 4。
5. Validator FAIL 返回 code 2。
6. Parser timeout、401、429、无效 JSON、Schema mismatch 分型。
7. API Key 不出现在 snapshot/error。
8. Plugin 和 CLI 对同一 fixture 返回语义等价结果。
9. Plugin 不自动 acknowledge WARNING。
10. Prompt 输出不含 `caseId/assertions/PASS/FAIL/intentDiagnostics`。
11. 文件写入失败不留下部分输出。
12. Windows/Linux 路径和 stdin 基础测试。

## 16. 工程质量门

```bash
npm run typecheck
npm test
npm run build
npm run regression
```

每个命令必须可在无网络环境执行；只有 Parser integration test 需要显式环境开关。

构建产物：

```text
dist/index.js
dist/cli/main.js
dist/plugin/dsh/*
```

发布前 smoke test：

```bash
node dist/cli/main.js version
node dist/cli/main.js inspect fixtures/demo.txt --parser fixture --json
node dist/cli/main.js compile fixtures/demo.txt --parser fixture --format prompt
```

## 17. 最小实现顺序

### Milestone 0 — 冻结基线

- 将当前 40 项测试作为迁移门。
- 不改变 canonical 行为。
- 为现有 JS 导出建立 characterization tests。

验收：迁移前后 40/40 PASS。

### Milestone 1 — TypeScript Domain Core

- 建立 DTO、Zod Schema、错误枚举。
- 迁移现有 Guard、Validator、Grammar Budget、Renderer Boundary。
- 保持纯函数。

验收：40 项旧测试 + 类型测试通过。

### Milestone 2 — Application API

- 实现 `VastApplication`。
- 接 FixtureParser。
- 打通 inspect/compile/validate。

验收：不通过 CLI 也能完成完整应用调用。

### Milestone 3 — CLI

- 实现 version/inspect/compile/validate/regression。
- 完成 TTY 与非 TTY Guard 行为。
- 完成 exit code、stdin、原子写文件。

验收：CLI contract tests 全过。

### Milestone 4 — OpenAI-compatible Parser

- 原生 fetch、timeout、错误分型、Schema 校验。
- 默认关闭联网 integration test。

验收：Mock HTTP 测试覆盖成功、401、429、timeout、坏 JSON。

### Milestone 5 — DSH Plugin

- 先读取 DSH 实际插件规范。
- 只写薄 Adapter。
- 插件与 CLI 语义等价。

验收：四个工具可加载；WARNING 不被自动确认；RenderIntent 无元数据污染。

### Milestone 6 — 打包与文档

- `npm pack`。
- 本地安装 smoke test。
- README 包含五分钟上手、配置、安全边界和故障排查。

## 18. LunaMax 执行方式

LunaMax 可用于本项目，但不要一次投喂整项“全部实现”。建议每轮只给一个 Milestone，并附带以下固定指令：

```text
以 VAST Core 2.0.2 canonical 和现有测试为最高基准。
只实现当前 Milestone，不提前实现后续功能。
先检查现有代码与 dirty worktree，保留无关改动。
不得新增顶层架构、Renderer、Web、数据库或 MCP。
修改后运行 typecheck/test/build/regression。
若测试失败，修复后再交付；不得删除或弱化测试。
输出：改动文件、关键决定、测试证据、剩余风险。
```

推荐分工：

| 工作 | LunaMax 适合度 | 建议 |
|---|---:|---|
| DTO、CLI、文件 IO、测试 | 高 | 可直接执行 |
| OpenAI-compatible Adapter | 高 | 用 mock HTTP 验证 |
| DSH 插件适配 | 中高 | 必须先读真实 SDK |
| Canonical 架构变更 | 低 | 不授权它自行修改 |
| 新视觉规则判断 | 低 | 先通过 VAST 回归证据讨论 |

如果 LunaMax 在一个 Milestone 中修改超过约 15 个核心文件、引入 Web/DB/队列或重写所有 Case，立即停止并回到本 Spec。

## 19. 最终验收清单

- [ ] 自然语言可经 ParserPort 变成合法 IntentDraft。
- [ ] Guard PAUSE 在 CLI 和 Plugin 中都不会被自动绕过。
- [ ] CLI 可以输出中文纯画面 Prompt。
- [ ] CLI 和 Plugin 使用同一 Application API。
- [ ] Plugin 不通过子进程调用 CLI。
- [ ] RenderIntent 不含测试、Guard 或报告元数据。
- [ ] 当前 40 项回归全部通过。
- [ ] 新增 CLI/Plugin/Parser 测试全部通过。
- [ ] 无 API Key 泄露。
- [ ] 无 Renderer、Web、DB、MCP 进入首版。
- [ ] DSH API 差异只存在于 Adapter 层。

## 20. 后续但非本期

只有 CLI 和 Plugin 稳定使用后，再按实际需要选择：

1. ComfyUI Renderer Adapter。
2. 真实视觉 Evaluator。
3. 记忆路由接入，用于经验检索而非 Core 规则所有权。
4. MCP Adapter。
5. 极简 Web UI。

这些能力均通过 Adapter/Infrastructure 接入，不改变 VAST Core 的编译职责。
