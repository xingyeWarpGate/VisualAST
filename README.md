# VAST 2.2.1

VAST is a headless, typed visual compiler. It separates semantic extraction, deterministic constraint validation, aesthetic planning, renderer-neutral compilation, renderer adapters, evaluation, and typed revision.

## Quick start

```bash
npm install
npm run build
node dist/cli/main.js doctor --json
node dist/cli/main.js parse fixtures/demo.txt --json
node dist/cli/main.js plan fixtures/demo.txt --json
node dist/cli/main.js compile fixtures/demo.txt --renderer mock --json
node dist/cli/main.js render fixtures/demo.txt --renderer mock --json
node dist/cli/main.js test --suite all --json
```

The mock adapter creates a small structural-test PNG and proves control flow only. It is never reported as live image evidence.

## CLI

```text
vast parse <input> [--json]
vast validate <contract.json> [--json]
vast plan <input|contract> [--renderer <id>] [--json]
vast compile <input|contract> --renderer <id> [--staged auto|on|off] [--json]
vast render <input|contract> --renderer <id> [--staged auto|on|off] [--json]
vast evaluate <run-id> [--json]
vast revise <run-id> [--max-rounds 2] [--json]
vast inspect <run-id>
vast test --suite <unit|semantic|metamorphic|holdout|regression|adapter|live-render|all>
vast doctor
```

The original 2.0.2 `inspect`, legacy `compile` and `regression` forms remain available for migration compatibility. New 2.2.1 envelopes use `vastVersion` and `schemaVersion` `2.2.1`.

## Renderer adapters

`mock` is deterministic and offline. `image-cli` is the real local adapter for the Hermes GPT Image 2 CLI described by `D:\hermes\image-cli\IMAGE_CLI_REFERENCE.md`.

```bash
node dist/cli/main.js render request.txt --renderer image-cli --aspect-ratio square --quality medium --desktop --json
node dist/cli/main.js render request.txt --renderer image-cli --image source.png --json
node dist/cli/main.js render request.txt --renderer image-cli --reference style.png --reference character.png --json
```

The adapter only accepts the CLI-supported `medium` quality and the three supported aspect ratios. It validates that the JSON result contains `success=true` and that the returned image path exists. Credentials and prompts are not logged into VAST evidence; adapter failures preserve only the CLI's structured, non-secret error.

## Architecture

```text
Natural language
  -> SemanticProposal (typed operations + evidence + ambiguity)
  -> Constraint Core (canonical contract + invariants)
  -> AestheticPlan (thesis, hierarchy, pose, physics, lighting, budgets)
  -> Compiler passes (identity, presence, spatial, motion, attention, lowering, compression, negative, staging, sanitizer)
  -> RenderIntent
  -> Renderer Adapter
  -> Image artifact
  -> Evaluator
  -> Typed RevisionPatch
```

Core functions are deterministic and do not call models, renderers, files, or environment variables. Renderer input is separated from evaluator/report/test metadata.

## Evidence

Runs and reports are written under `artifacts/vast-2.2.1/`. Reports explicitly distinguish structural/mock evidence from live-render evidence. `final-verdict.json` remains `INCOMPLETE` until the live-render, holdout, human-review and revision gates in the 2.2.1 specification have real evidence.

## Development gates

```bash
npm run typecheck
npm run build
npm test
```

`npm test` may require a functioning Node/OS user-info service because the installed `tsx` loader calls `uv_os_get_passwd`; a loader-level `ENOMEM` is an environment failure, not a VAST assertion result.