# VAST CLI + Agent Plugin

VAST Core 2.0.2 is a headless typed visual compiler. It turns visual intent into a validated, renderer-neutral `RenderIntent`; the first release does not call an image model or renderer.

## Five-minute start

```bash
npm install
npm run build
node dist/cli/main.js version
node dist/cli/main.js inspect fixtures/demo.txt --parser fixture --json
node dist/cli/main.js compile fixtures/demo.txt --parser fixture --format prompt
node dist/cli/main.js compile fixtures/demo.txt --parser fixture --format ast --out visual-ast.json
node dist/cli/main.js validate visual-ast.json --json
npm run regression
```

`vast` is the package executable after installation. `--parser fixture` is deterministic and offline; it is intended for examples, tests, and the frozen Case 01–09 migration fixtures.

## Commands

```text
vast version
vast inspect <file|-> [--parser fixture] [--mode interactive|notice-only|strict] [--ack <issue-id>] [--json]
vast compile <file|-> --format prompt|render-intent|ast|contract|full [--out <path|->]
vast validate <ast.json> [--contract contract.json] [--json]
vast regression [--case 09] [--json]
```

Input files are UTF-8 text or JSON. `-` reads stdin. JSON mode keeps stdout machine-readable; human diagnostics go to stderr. Compile files are written through a same-directory temporary file and atomic rename.

Guard behavior is deliberate: `BLOCK` exits with code 4, an unacknowledged non-interactive `PAUSE` exits with code 3, validation failure exits with code 2, input/configuration errors with code 5, and Parser/network/schema failures with code 6.

## OpenAI-compatible Parser configuration

The adapter uses Node's native `fetch`, `AbortSignal.timeout`, and a Chat Completions-compatible JSON response. API keys are read only from the environment variable named by `apiKeyEnv`.

Configuration precedence is command-line selection, `VAST_CONFIG`, `.vast/config.json`, then safe defaults. A minimal `.vast/config.json` is:

```json
{
  "parserProfiles": {
    "local": {
      "adapter": "openai-compatible",
      "baseUrl": "https://provider.example/v1",
      "apiKeyEnv": "VAST_PARSER_API_KEY",
      "model": "your-model",
      "timeoutMs": 30000
    }
  }
}
```

Run with `--parser local` and set `VAST_PARSER_API_KEY` in the process environment. Do not put the key in JSON, source, fixtures, or issue reports.

## Agent Plugin

The same `VastApplication` powers the four tool handlers exported from `dist/plugin/tools.js`:

```text
vast.inspect_intent
vast.compile_intent
vast.validate_ast
vast.explain_diagnostic
```

Successful compile calls return `Envelope<RenderIntent>`. Plugin execution has no interactive prompt and never auto-acknowledges a WARNING; the calling Agent must ask the author and retry with the selected issue IDs. The DSH adapter in `dist/plugin/dsh/index.js` follows the currently documented Cordis `name` / `inject` / `apply(ctx)` entrypoint and contributes a `vastAgentTools` service through `ctx.provide`. It does not start a CLI child process. The Community Fabric `dsh-plugin.json` RFC remains a draft and is intentionally not used.

## Security and boundaries

- Core functions are pure and do not read files, network, environment variables, clock, or mutable global state.
- API keys, Authorization headers, cookies, and full user intent are not logged.
- JSON stdout is reserved for data; diagnostics/logging belong on stderr.
- `RenderIntent` excludes Guard, Validator, test-case, report, score, and evaluator metadata.
- The package contains no Renderer, Web UI, database, MCP server, queue, or image-model call.
- The DSH integration is an adapter boundary; DSH-specific behavior does not enter Domain or Application.

## Troubleshooting

- `code 3`: the Guard found a WARNING in a non-TTY call. Inspect JSON output, ask the author, then retry with `--ack <issue-id>`.
- `code 4`: explicit requirements contradict each other. Change the intent; acknowledgement cannot bypass an ERROR.
- `code 6`: check the selected Parser profile, API key environment variable, HTTP status, timeout, and returned JSON shape. The adapter distinguishes auth, rate-limit, timeout, invalid JSON, and schema failures.
- `vast validate` only validates an AST and optional Contract; it never calls the Parser.
- If an output path fails, the temporary file is cleaned up and the destination is not left partially written.

## Development gates

```bash
npm run typecheck
npm test
npm run build
npm run regression
```

The repository did not contain a legacy JS implementation or the previously mentioned 40 tests when Milestone 0 was audited. `BASELINE.md` records that fact; the repository now carries a 40-test Core migration gate plus CLI, Parser, and Plugin contract tests.
