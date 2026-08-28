# VAST 2.0 — Canonical Merged Specification

> Status: **FROZEN / Canonical Baseline**
>
> Version: **VAST Core 2.0.2**
>
> Lineage: **VisualAST 1.0 behavioral baseline → VAST 2.0 engineering refactor**
>
> This file is the single source of truth for VAST 2.0. It fully inherits the validated visual behavior of VisualAST 1.0 while reorganizing runtime, compiler, adapters, evaluation, regression, revision, and interfaces into a smaller headless architecture.

---

## 0. Definition

VAST 2.0 is a **typed visual compiler**, not a prompt enhancer, image UI, node editor, or ComfyUI replacement.

Its job is to transform user visual intent into a canonical visual intermediate representation, validate hard constraints, compile executable drawing instructions, lower them to renderer-specific requests, and optionally evaluate rendered artifacts.

Canonical responsibility:

```text
Intent
  ↓
Scene Contract
  ↓
Typed VisualAST / Canonical IR
  ↓
Deterministic Validation
  ↓
Compiler Passes
  ↓
Renderer-neutral RenderIntent
  ↓
Renderer Adapter
  ↓
Image Renderer
```

Optional post-render loop:

```text
Image Artifact
  ↓
Evaluate
  ↓
Diagnostics / Suggested Patch
  ↓
Recompile
```

Core principle:

> **VAST 1.0 defines the behavioral baseline; VAST 2.0 changes code organization, lifecycle boundaries, interfaces, and test architecture without weakening validated visual behavior.**

---

# 1. Core principles

1. Semantic and structural correctness precede aesthetics.
2. Abstract concepts must compile into drawable, checkable instructions.
3. **Scale ≠ Attention**: physical scale and visual saliency are independent.
4. Darkness, fog, empty space, omission, and lost edges may be intentional visual information.
5. Detail is a finite resource; prohibit `detail everywhere`.
6. Visual hierarchy must be structural, not achieved merely by enlarging a subject.
7. Ordinary scenes must be allowed to remain ordinary; prohibit automatic cinematic/art-direction escalation.
8. Narrative props may not be generalized into arbitrary clutter.
9. Hard guards must be executable Validator rules, not verbal prompt wishes.
10. Renderer input must contain only validated image-layer instructions.
11. Composition controls not only placement but also viewing path.
12. Style Domain must propagate into concrete Rendering Grammar at Typed Node level.
13. Explicit pose or relation constraints override renderer-inferred dramatic defaults.
14. Intentionally ambiguous semantics must remain open; the renderer may not arbitrarily narrow them.
15. **IR expressibility ≠ Compile correctness ≠ Render correctness.**
16. Regression failures should first become field/rule/pass fixes, not new top-level architecture.
17. Core must remain headless; UI/CLI/TUI/MCP/DSH/DB are adapters or infrastructure.
18. Renderer and Evaluator must be physically isolated by API/type boundaries.
19. VAST is allowed to suppress information; it is not required to make every object maximally legible.
20. Aesthetic failure must not be misdiagnosed as schema failure, and a beautiful image that violates hard constraints is still a failure.
21. Predictable authoring risks should be surfaced before Scene Contract freeze, but the compiler must not silently replace the author's aesthetic decision.

---

# 2. VAST 2.0 lifecycle architecture

## 2.1 Runtime Core

```text
Parse
  ↓
Authoring Intent Guard
  ↓
Normalize
  ↓
Validate
  ↓
Compile
  ↓
Renderer Adapter
```

Responsibilities:

- **Parse**: extract user-specified visual facts and ambiguity into an Intent Draft; do not beautify.
- **Authoring Intent Guard**: diagnose contradictions and predictable visual-design risks before Contract freeze; never rewrite the Intent Draft.
- **Normalize**: convert loose Scene Contract information into strict canonical Typed VisualAST / IR.
- **Validate**: check deterministic hard constraints before rendering.
- **Compile**: lower IR into executable Drawing Instructions through explicit internal passes.
- **Renderer Adapter**: translate renderer-neutral RenderIntent into provider-specific request syntax/capabilities.

The Runtime Core must not own:

- UI
- DSH-specific logic
- MCP server logic
- database implementation
- revision storage
- regression reports
- model account/auth orchestration
- provider SDK policy beyond adapters

## 2.1.1 Authoring Intent Guard

The Authoring Intent Guard is a replaceable sub-pass inside the Parse phase boundary. It is not a new top-level product subsystem and does not change the downstream compiler architecture.

```text
Raw Intent
  ↓
Parse → Intent Draft
  ↓
Authoring Intent Guard
  ├─ ERROR   → BLOCK
  ├─ WARNING → PAUSE FOR AUTHOR DECISION
  └─ NOTICE  → CONTINUE WITH DIAGNOSTIC
  ↓
Normalize + Freeze Scene Contract
```

Canonical diagnostic kinds:

```text
CONTRADICTORY_INTENT
ATTENTION_COMPETITION
UNDECLARED_VISUAL_HIERARCHY
STYLE_PROPAGATION_GAP
COMPOSITION_OVERLOAD
SCALE_READABILITY_RISK
SEMANTIC_AMBIGUITY
RENDERER_DEFAULT_RISK
CONTEXTUAL_SEMANTIC_PRIOR_COLLISION
```

Representative type:

```ts
type IntentIssue = {
  id: string;
  severity: "error" | "warning" | "notice";
  type: IntentDiagnostic;
  evidence: string[];
  consequence: string;
  choices?: string[];
  affectedNodes: string[];
};

type IntentGuardResult = {
  decision: "BLOCK" | "PAUSE" | "CONTINUE";
  issues: IntentIssue[];
  draft: IntentDraft; // same value; never rewritten by the Guard
};
```

Rules:

1. `ERROR` is reserved for mutually incompatible explicit requirements or structurally impossible intent.
2. `WARNING` identifies executable intent with a predictable consequence that requires an authorial choice.
3. `NOTICE` records a non-blocking risk or under-specification.
4. Acknowledged issue IDs may continue without deleting their diagnostic history.
5. `notice_only` mode may downgrade interaction behavior, but never changes issue severity or hides diagnostics.
6. The Guard must not select a visual protagonist, alter composition, delete an entity, normalize unusual projection, or invent missing style decisions.
7. Explicitly unconventional intent is legal. Once acknowledged, the compiler preserves it.
8. The Guard output is compiler metadata and must never enter RendererInput.

The Guard consumes a parsed Intent Draft rather than raw renderer prompt text. Language-model-assisted detection may propose issues, but blocking behavior must be expressed through typed diagnostics and testable policy.

## 2.2 Optional Render / Evaluate loop

```text
RenderIntent
   ↓
Renderer Adapter
   ↓
Render
   ↓
Image Artifact
   ↓
Evaluate
   ↓
Diagnostics / Suggested Patch
   ↓
Recompile
```

Evaluate is post-render. It may assess visual properties that cannot be guaranteed structurally before rendering.

## 2.3 Infrastructure

The following are infrastructure/interfaces rather than Core compiler stages:

- Revision / Snapshot Store
- Regression Suite / Test Runner
- CLI
- TUI
- MCP Adapter
- DSH Plugin
- Web UI
- Renderer invocation shell
- Artifact storage

Preferred implementation order:

```text
Core
→ CLI
→ DSH/TUI
→ MCP when multi-agent use justifies it
→ Web only if real usage justifies it
```

---

# 3. Scene Contract

Scene Contract is the user-intent-facing declarative layer.

It may preserve ambiguity and under-specification, but must preserve user facts.

At minimum it may contain:

- Location / Scene Identity
- Time / Environment
- Required Entities
- Optional Entities
- Forbidden Entities
- Required States
- Required Relations
- Narrative Prop Set
- Relational Scale Constraints
- Ordinariness Flag
- Output Modality
- Composition Invariants
- Style Domain
- Semantic Openness declarations
- Explicit Count constraints
- Explicit Pose / Gaze constraints
- Rendering Grammar declarations
- Palette / Color placement constraints

Principle:

> **Contract may be loose; IR must be strict.**

## 3.1 Entity Presence Schema

Presence is typed:

- **Required**: must exist.
- **Optional**: may exist but remains subject to Attention / Frequency / Occupancy budgets.
- **Forbidden**: hard prohibition; a violation blocks render or fails post-render evaluation.

Forbidden is not equivalent to an unbound entity.

## 3.2 Semantic Openness

Used when the user intentionally keeps an object/region underdefined.

Representative schema:

```yaml
semantic_specificity: low | medium | high
category_lock: none | declared_category
required_property: []
forbidden_narrowing: []
```

If specificity is low, the renderer must not collapse ambiguity into a single concrete category.

Example:

```yaml
outside_anomalies:
  semantic_specificity: low
  category_lock: none
  required_property:
    - distorted
    - ambiguous
    - partially_unrecognizable
  forbidden_narrowing:
    - monsters
    - creatures
    - tentacle_ecosystem
    - identifiable_species
```

Identity Invariant and Semantic Openness are complementary:

- **Identity Invariant**: if the user clearly says what something is, it must not change.
- **Semantic Openness**: if the user deliberately does not define what something is, it must not be over-interpreted.

## 3.3 Exact Count Constraint

Explicit user counts are typed:

```yaml
count:
  expected: 12
  tolerance: 0
  mode: exact
  scope: scene
```

Pre-render validation checks declaration consistency. Post-render evaluation checks actual count.

## 3.4 Relational Scale Constraint

Scale is a relation, not merely an adjective.

```yaml
relation:
  type: relative_scale
  a: human
  b: machine
  expected_ratio: 1:2
  tolerance: 0.15
```

Examples:

```text
human : machine ≈ 1 : 2
machine : room ≪ 1
```

The renderer must not violate relational scale to manufacture spectacle.

---

# 4. Typed VisualAST / Canonical IR

Typed VisualAST is the strict internal representation.

Required properties:

- canonical
- typed
- deterministic where Contract is explicit
- stable IDs
- provenance
- no hidden UI semantics
- no renderer-specific syntax in Core IR

## 4.1 Entity Node

Visible entities:

```text
person
train
building
machine
pipe
desk
bed
shrine
koi
...
```

Entity fields may include:

```yaml
id:
type:
presence:
identity_lock:
affordances:
count:
rendering_grammar_override:
attention_role:
detail_budget:
occupancy_budget:
provenance:
```

## 4.2 State Node

States such as:

- sleeping
- tired
- dawn
- abandoned_for_years
- overcast
- alert
- curled
- upright

States must compile into visible consequences rather than remain vague adjectives.

## 4.3 Relation Node

Relations include:

```text
forehead touches glass
holds flashlight
faces megastructure
wears rabbit headpiece
sits on bed
light originates from battery
```

Relational scale also belongs here.

## 4.4 Layer Operator

Media/layer behavior:

- glass reflection
- fog occlusion
- rain layer
- foreground/midground/background mixing
- reflection layer

Preferred over incorrectly modeling every perceptual layer as a normal Entity.

Fields may include:

```yaml
opacity:
structural_fidelity:
edge_fidelity:
contrast_budget:
mixing_mode:
```

## 4.5 Motion Operator

Motion and visible consequences:

- high-speed passing city
- wind-blown hair
- flowing rain
- motion blur
- directional deformation

## 4.6 Attention Node

Supported roles:

- Target
- Support
- Suppressor
- Spatial Attention Target
- Attention Island
- Attention Path

## 4.7 Composition Node

May include:

- subject occupancy
- camera / framing
- negative space
- spatial hierarchy
- composition invariants
- composition dependency graph
- visual mass balance
- boundary legibility
- split-frame constraints
- exit/return path

## 4.8 Lighting Node

May represent:

- source direction
- causal source
- form lighting
- rim lighting
- shadow-loss regions
- naturalness constraints
- local contrast hierarchy

## 4.9 Frequency Node

Represents:

- Semantic × Depth Frequency Map
- local spatial frequency
- detail budget
- texture suppression
- edge density

## 4.10 Narrative Prop Node

A prop that carries meaningful story/time/identity/causal information.

Narrative props may not be replaced by generic clutter.

## 4.11 Style / Rendering Grammar Node

Style must not remain only a label such as `anime`.

A Style Domain should lower into a Style Vector such as:

```text
Shape Abstraction
Line Presence
Shading Quantization
Material Simplification
Texture Abstraction
Edge Hierarchy
```

## 4.12 Stable IDs and provenance

Examples:

```text
entity.girl
entity.battery
relation.girl-holds-battery
constraint.scale-001
constraint.openness-002
```

Recommended provenance:

```yaml
source:
source_span:
revision:
confidence:
```

Stable IDs support diagnostics, CLI edits, diffing, revision management, and regression.

---

# 5. Deterministic Validator

Validator is independent from Compiler.

Pre-render structural checks include at minimum:

- Required entity/state/relation/operator completeness
- Forbidden entity presence
- Scene Identity consistency
- Narrative Prop preservation
- Entity Identity Invariant
- Relational Scale tolerance
- Explicit Count declaration validity
- Composition Invariants
- Occupancy Budget
- Output Modality
- Control-layer leakage
- Style/Grammar assignment validity
- Semantic Openness consistency
- pose/gaze hard constraints
- allowed/forbidden transformations
- renderer capability compatibility where deterministically knowable

Hard failure:

```text
COMPILE FAILED
→ Renderer does not execute
→ return structured diagnostics
```

Validator should use modular Rule Registry architecture.

Conceptual structure:

```text
rules/
├─ entity-presence
├─ entity-identity
├─ relational-scale
├─ semantic-openness
├─ exact-count
├─ pose
├─ gaze
├─ occupancy
├─ composition
├─ style-grammar
└─ output-isolation
```

Common Rule interface:

```text
id
phase
appliesTo
validate()
diagnostics()
```

Do not accumulate all rules in one God File.

---

# 6. Compiler

`Compile` is an internal pass pipeline, not a single prompt-building function.

Canonical 2.0 structure:

```text
Compile
├─ Identity Pass
├─ State / Pose / Gaze Pass
├─ Spatial / Scale Pass
├─ Lighting Pass
├─ Attention Pass
│  └─ Visual Hierarchy Budget
├─ Negative Space / Occupancy Pass
├─ Frequency / Detail Pass
├─ Composition Pass
├─ Narrative / Ordinariness Pass
├─ Drawing Grammar / Style Propagation Pass
├─ Forbidden / Suppression Pass
├─ Unprompted Accent Budget Pass
└─ Prompt Sanitizer
```

The historical 1.0 compiler behaviors below are preserved inside these passes.

## 6.1 Emotion → Pose

Emotion/state must become drawable body mechanics:

- posture
- center of gravity
- muscle tension
- shoulders
- hands
- head/neck
- eyelids
- motion energy

Do not compile `tired` merely as “sad face” or “head lowered”.

Explicit pose always wins over inferred emotional pose.

Example:

```yaml
pose: upright
hands: flat_on_knees
```

must block a renderer from making the character slumped, bowed, or dramatically mournful without permission.

## 6.2 Action-aligned Gaze

Explicit activity determines gaze target.

Examples:

```text
explore → flashlight endpoint / darkness
repair → machine
read → text/object
move → movement direction / threat
```

Do not force eye contact with the camera unless requested.

## 6.3 Form Lighting

Lighting must describe how light reveals form, not only that “light exists”.

Causal lighting should be encoded where relevant:

```text
battery → cold blue light → face/hands/interior
```

## 6.4 Scale ↔ Attention Decoupling

A huge object may have low Attention.

A small object may be the primary visual target.

The compiler must not fix saliency by changing physical scale.

## 6.5 Visual Hierarchy Budget

Attention is multi-channel rather than one scalar.

Recommended dimensions:

```yaml
semantic_priority:
visual_priority:
detail_budget:
contrast_budget:
occupancy_budget:
saturation_budget:
sharpness_budget:
edge_definition:
```

This prevents a “low attention” repeated element from dominating through count, area, detail, or contrast.

## 6.6 Spatial Attention Target / Attention Island

Visual center may be a relational island:

```text
person
→ flashlight
→ beam
→ illuminated machine
```

## 6.7 Semantic × Depth Frequency

Detail frequency depends on:

- depth
- narrative importance
- attention role
- semantic function

Near-camera does not automatically mean high detail.

## 6.8 Detail Conservation Law

The image has a finite total detail budget.

Increasing detail in one region requires reducing it elsewhere.

Style complexity does not grant additional detail budget. A scene may use sharp fashion contours, transparent overlays, saturated accents, or elaborate graphic rhythm while still requiring sparse low-frequency backgrounds.

For `subject_sharp_background_sparse`, the Compiler must independently bound:

- background microtexture;
- background primary structure lines;
- reflection/highlight groups outside the subject;
- distant environmental detail.

The subject may remain graphically sharp without escalating the entire image into dense digital concept rendering.

## 6.9 Occupancy Budget / Active Negative Space

Frequency answers “how finely drawn”.

Occupancy answers “how much of the image may be occupied”.

Negative Space is an active Composition Node.

The compiler must not allow the renderer to fill requested emptiness with:

- vegetation
- particles
- waves
- extra props
- environmental architecture
- texture clutter
- meaningless ornament

## 6.10 Narrative Prop Lock

Narrative props must preserve:

- existence
- identity
- basic relation
- causal role where relevant

## 6.11 Ordinariness Preservation

Ordinary spaces may remain:

- cheap
- random
- mismatched
- sparse
- mildly cluttered
- visually unremarkable

Do not upgrade them into polished production design without user intent.

## 6.12 Unprompted Accent Budget

Renderer freedom may be permitted in small amounts.

Default principle:

```text
≤ 1–2 minor accent classes/locations
Support only
must not change narrative
```

## 6.13 Drawing Grammar

Drawing Grammar should compile style into actions/information budgets.

Examples:

### Cel / anime

- clean but selective linework
- quantized shading
- reduced PBR
- simplified mechanical materials
- controlled edge hierarchy
- environment must inherit anime abstraction rather than drift to CG

### Woodblock / screenprint

- coarse black contour
- flat fills
- limited registration offset
- sparse paper/ink irregularity
- no photographic materials
- no cinematic light
- no unnecessary volumetric modeling

### Rough crayon

- uneven pressure
- coarse irregular lines
- incomplete fill gaps
- strokes may cross object boundaries
- no polished lineart
- no smooth gradient
- no realistic shadow
- no AO
- no 3D volume

### Ink wash

- blank paper as semantic space
- sparse concentrated strokes
- graded ink rather than western volume lighting
- unpainted regions may represent water/sky

Global grammar propagates to nodes unless an explicit override is legal.

## 6.14 Style Grammar Propagation

`style = anime` alone is insufficient.

Each node should inherit or override a concrete Rendering Grammar.

Example:

```text
character → anime abstraction
machine → anime mechanical simplification
environment → anime background-painting abstraction
materials → reduced PBR / CG realism
lighting/frequency/texture → same grammar domain
```

Style Coherence means:

> each node faithfully executes the grammar assigned to it

—not necessarily that every node uses an identical medium.

Heterogeneous per-entity grammar is valid when explicitly declared.

## 6.15 Forbidden / Suppression Pass

Hard suppression may apply to:

- forbidden entities
- forbidden transformations
- environmental auto-completion
- semantic narrowing
- extra characters
- text/signage
- unwanted cinematization
- generic model defaults

## 6.16 Prompt Sanitizer

Prompt Sanitizer removes control-layer information from renderer input.

### Control Layer

Forbidden from renderer input:

- AST
- raw weights
- scores
- Validator output
- test report
- process description
- UI
- flowchart
- internal IDs if not visually meaningful

### Image Layer

Allowed:

- visible scene content
- executable Drawing Instructions
- renderer-supported generation parameters

Sanitizer complements but does not replace API-level isolation.

---

# 7. Composition System

## 7.1 Composition Dependency Graph

```text
Anchor
→ Dependency
→ Visual Flow
→ Exit / Return
```

This represents why elements must occupy certain relationships to create intended viewing behavior.

## 7.2 Split-Frame Detector

Detect whether:

- window frames
- door frames
- columns
- wall corners
- high-contrast boundaries

accidentally split two high-priority regions into independent pictures.

If unintended, recompile or patch composition.

## 7.3 Visual Mass Balance

Distinguish:

```text
Semantic Center
vs
Actual Visual Mass Center
```

Prevent a nominal primary character from being visually overwhelmed by:

- sky
- sunset
- megastructure
- highly textured background
- saturated secondary props

## 7.4 Boundary Legibility

Controls explicitness of room/spatial boundaries.

Reference scale:

```text
1.0 explicit
≈0.3 ambiguous
0 absent
```

A highly ambiguous white-space room may target roughly 0.15–0.25.

---

# 8. Layer / Motion System

Glass, fog, rain, reflection, motion blur, and similar perceptual mechanisms should usually be Operators.

Example:

```text
L0 = person / train interior
L1 = weak glass reflection
L2 = fast-moving outside city
```

Glass handles Layer Mixing.

Motion Operator handles the external scene’s visible movement consequences.

---

# 9. Renderer-neutral RenderIntent

Core produces a renderer-neutral `RenderIntent`.

Renderer-specific lowering lives in adapters.

```text
adapters/
├─ gpt-image
├─ midjourney
├─ comfyui
└─ jimeng
```

Adapters may declare capability profile:

```text
negative_prompt
seed
aspect_ratio
reference_image
weighted_prompt
structured_regions
inpainting
image_edit
text_rendering
```

Core must not accumulate scattered:

```text
if renderer == ...
```

branches.

---

# 10. Evaluate

Post-render Evaluation may score:

- Scene Fidelity
- Visual Center / Saliency
- Composition / Visual Flow
- Pose / Gaze
- Lighting Structure
- Frequency / Detail Budget
- Occupancy / Negative Space
- Narrative Prop Fidelity
- Layer / Motion Correctness
- Relational Scale
- Exact Count
- Forbidden Entity Compliance
- Semantic Openness / Narrowing
- Ordinariness / Anti-Art-Direction
- Style Fidelity / Grammar Inheritance
- Style Coherence
- Overall Aesthetic Quality

Evaluation exists to locate failure:

```text
Parser
Contract
IR
Validator
Compiler
Adapter
Renderer
```

Aesthetic assessment must remain separate from hard constraint correctness.

---

# 11. Render / Evaluate isolation

Automated testing must physically isolate render input from evaluation metadata.

Correct architecture:

```text
Case Fixture
   ↓
VAST Core
   ↓
RenderIntent
   ↓
Renderer
   ↓
Pure Image Artifact
   ↓
Evaluator(image, assertions)
```

Renderer input type must not contain:

- Case ID
- regression title
- version labels used only for testing
- assertions
- scores
- PASS / FAIL
- Validator result
- Evaluator result
- report layout instructions

Do not rely on “please do not draw the report”.

The renderer should not know the report exists.

---

# 12. Regression result levels

Canonical levels:

```text
IR / Validate PASS
Compile PASS
Render / Evaluate PASS
```

Possible run statuses:

```text
PASS
PARTIAL PASS
FAIL
INVALID TEST
ORCHESTRATION FAIL
```

Definitions:

- **PASS**: all core constraints satisfied; minor irrelevant visual deviation allowed.
- **PARTIAL PASS**: core mechanism works but one or more explicit constraints fail.
- **FAIL**: core target fails or a hard semantic constraint is violated.
- **INVALID TEST**: test setup itself is contaminated or invalid.
- **ORCHESTRATION FAIL**: multi-case merge, wrong output count, cross-case contamination, etc.

---

# 13. Revision / Snapshot infrastructure

Revision is infrastructure, not compiler logic.

Suggested revision record:

```yaml
id:
parent_id:
vast_snapshot_id:
compiled_prompt_id:
renderer:
renderer_params:
outputs:
  - image_id
  - image_url
validation_result:
created_at:
```

Prefer snapshot + delta/content-hash approaches where useful.

Current product assumption:

> Most generation is linear; do not build a Lineage Canvas unless real usage proves a simple revision list insufficient.

---

# 14. CLI / TUI / MCP / DSH

VAST 2.0 is headless.

CLI is the preferred first interface.

Conceptual commands:

```bash
vast parse scene.txt
vast inspect
vast set scale girl machine 1:2
vast validate
vast compile
vast render
vast diff v11 v12
vast restore v10
vast test case-01
vast test --all
```

TUI may provide a lightweight operational shell for:

- revision list
- current AST summary
- validation
- compiled prompt
- diff / restore
- generate

MCP should be a thin standard-tool adapter when multiple agents materially benefit from it.

No business logic belongs in CLI, TUI, MCP, or DSH adapters.

---

# 15. Engineering structure

Recommended repository:

```text
vast/
├─ core/
│  ├─ parser/
│  ├─ contract/
│  ├─ ir/
│  ├─ normalize/
│  ├─ validator/
│  └─ compiler/
│
├─ rules/
│  ├─ entity-presence/
│  ├─ entity-identity/
│  ├─ relational-scale/
│  ├─ semantic-openness/
│  ├─ exact-count/
│  ├─ pose/
│  ├─ gaze/
│  ├─ occupancy/
│  ├─ style-grammar/
│  └─ composition/
│
├─ adapters/
│  ├─ gpt-image/
│  ├─ midjourney/
│  ├─ comfyui/
│  └─ jimeng/
│
├─ evaluator/
│  ├─ saliency/
│  ├─ composition/
│  ├─ count/
│  └─ visual-validation/
│
├─ revision/
│  └─ snapshot-store/
│
├─ cli/
├─ tui/
├─ mcp/
└─ tests/
   ├─ unit/
   ├─ fixtures/
   └─ regression/
```

Implementation preference:

- functional/pure Core where practical
- explicit ports for stateful/replaceable external capabilities
- adapters around side effects
- no unnecessary service/interface/impl/factory chains
- no premature microservices
- no workflow engine for a fundamentally linear compiler
- no database requirement inside Core

---

# 16. Historical VAST 1.0 regression lineage retained by 2.0

These cases explain why the behavior exists and remain historical regression references.

## A — Rainy-night convenience store

Target:

- 2am
- night-shift woman
- leaning near convenience-store glass
- phone
- transparent umbrella
- wet coat
- bright interior / dark street

Historical failures:

- “tired” incorrectly compiled to bowed/sad face
- body retained active tension
- facial form lighting insufficient
- background competed with person

Resulting mechanisms:

- Emotion → Pose
- Form Lighting
- Attention Budget

Lesson:

> Emotion must become body dynamics, not merely a facial label.

## B — Megastructure coast

Target:

- human faces immense industrial structure at sea
- much of structure disappears into fog

Historical failures:

- scale/complexity automatically became attention
- scale-reference human degraded to pure back-view
- saliency optimizer cheated by enlarging person
- control metadata leaked into output

Resulting mechanisms:

- Scale–Attention Decoupling
- Prompt Sanitizer
- Camera/Pose Geometry
- Saliency Feedback
- Composition Invariants
- Target / Support / Suppressor

Lesson:

> Huge scale does not imply huge visual priority.

## C — Dormitory morning

Target:

- girl just woke, lying sideways and spacing out
- roommate has left
- instant noodles, books, charging cable
- curtain slightly open

Historical failures:

- scene identity drift
- control-layer leakage
- narrative props generalized to random clutter
- ordinary dorm auto-art-directed
- spacing-out character stared at camera

Resulting mechanisms:

- Scene Identity Lock
- Narrative Prop Lock
- Ordinariness Preservation
- Naturalness Constraint
- Gaze Compiler
- regression infrastructure

Lesson:

> Ordinary is a visual property that must be actively protected.

## D — Underground industrial facility

Target:

- abandoned underground facility
- maintenance person with flashlight
- narrow passage
- ceiling unseen
- deep darkness

Historical failures:

- fantasy archive drift
- detail everywhere
- no stable visual focus
- foreground pipes over-detailed
- person turns toward camera
- renderer adds horror red lights

Resulting mechanisms:

- Spatial Attention Target
- Frequency Budget
- Detail Conservation Law
- Semantic Assertion Guard
- Semantic × Depth Frequency
- Action-aligned Gaze
- Unprompted Accent Budget

Lesson:

> Near-camera does not mean high-detail; darkness itself is information.

## E — High-speed train window

Target:

- evening
- schoolgirl sleeping against window
- weak glass reflection
- fast-moving city outside

Historical failures:

- alien wasteland / giant planet drift
- prompt-level guard proved insufficient
- reflection too strong
- tourist-ad sunset bias
- window divided image into “left portrait + right scenery”
- semantic center differed from visual-mass center

Resulting mechanisms:

- Typed VisualAST
- Deterministic Validator
- Layer Operator
- Motion Operator
- Composition Dependency Graph
- Split-Frame Detector
- Visual Mass Balance

Lesson:

> Composition is not just placement; it is viewing path.

## F — Machine in a white room

Target:

- enormous empty white space
- machine about twice human height
- staff inspecting machine
- no window
- no explicit wall corner

Historical failures:

- renderer enlarged machine instead of room
- windows/stairs/consoles appeared
- insufficient negative space
- industrial-CG drift
- boundaries remained too explicit

Resulting mechanisms:

- Relational Scale Constraint
- Required / Optional / Forbidden schema
- Occupancy Budget
- Active Negative Space
- Style Grammar Propagation
- Boundary Legibility
- Style Vector

Lesson:

> Empty space is a first-class AST element; space scale cannot be expressed by incorrectly enlarging objects.

---

# 17. Current style-stress regression suite

The formal style suite is maintained as separate machine-readable regression fixtures.

Current coverage categories include:

- Identity / Scale / Negative Space / Limited Palette
- Drawing Grammar / Count / Repetition / Attention
- Abstract Entity / Identity / Style Coherence / Composition
- Semantic Negative Space / Implied Entity / Count
- Multi-view / Contradictory Projection
- Per-Entity Grammar / Material Heterogeneity
- Exact Count / Grid / Controlled Mutation
- Semantic Relation / Identity Boundary / Diagram Grammar
- Semantic Openness / Grammar Inheritance / Causal Lighting

Confirmed system-level regression classes:

- Presence Failure
- Identity Failure / Semantic Drift
- Scale Failure
- Explicit Count Failure
- Attention / Saliency Failure
- Drawing Grammar Failure
- Style Coherence / Grammar Leakage
- Semantic Narrowing
- Composition / Aesthetic Failure
- Output Isolation / Orchestration Failure
- Representation / Projection Failure (candidate category; promote only with repeated evidence)

Regression principle:

> Constraint correctness ≠ aesthetic quality.

---

# 18. Case 01 — VAST 2.0 migration regression record

Core version:

```text
VAST Core 2.0.0
```

## Run 01

```text
VALID
FAIL
```

Observed failures:

- environmental over-completion
- mountains / trees / clouds / buildings / text added
- shrine and koi too salient
- negative space insufficient
- bed and scene over-detailed
- scene beautified into high-information ukiyo-e rather than sparse limited-color allegory

Diagnosis:

- IR could express the case
- compiler lowering lost important 1.0 behavioral constraints
- Attention / Negative Space / Detail / Suppression / Sanitizer needed explicit internal passes

## Run 02

```text
INVALID TEST
```

Reason:

- evaluation/report context leaked into renderer input

## Run 03

```text
INVALID TEST
```

Reason:

- evaluation/report context leaked into renderer input

## Run 04

```text
VALID
PARTIAL PASS
```

Passed:

- bed identity
- negative-space recovery
- attention hierarchy substantially improved
- distant shrine scale
- forbidden-environment suppression substantially improved

Remaining issues:

- upright pose drifted into bowed/slumped emotional posture
- drawing grammar remained too volumetric/refined
- bed detail remained excessive
- koi/reeds/background frequency remained too high

Fixes promoted into VAST 2.0 behavior:

1. Renderer/Evaluator physical isolation.
2. Explicit Compiler Pass pipeline.
3. Visual Hierarchy Budget under Attention Pass.
4. Explicit Pose precedence over emotional inference.
5. Drawing Grammar compiled as drawing actions/information budget.
6. Per-entity Detail/Frequency/Contrast/Occupancy suppression.
7. Strong Forbidden/Suppression against environmental auto-completion.
8. Separate IR/Validate, Compile, Render/Evaluate result levels.

---

# 19. Version policy

Current canonical Core:

```text
VAST Core 2.0.0
```

Semantic versioning policy:

- `2.0.x`: compatible bugfix / implementation correction
- `2.x.0`: compatible new capability
- `3.0.0`: deliberate breaking change to canonical IR/compiler contract

Regression run numbers are independent:

```text
Core: 2.0.0
Case: case-01
Run: run-04
```

Do not invent new Core versions merely to label a test run.

---

# 20. Freeze rules

VAST 2.0 is frozen as the current canonical baseline.

Allowed near-term work:

1. Implement Core.
2. Implement deterministic schemas and rule registry.
3. Implement CLI.
4. Convert formal Cases to machine-readable fixtures.
5. Implement renderer adapters.
6. Build strict render/evaluate test harness.
7. Verify actual VAST 2.0 render performance is not worse than VAST 1.0 baseline.
8. Add TUI/DSH integration.
9. Add MCP only when standardized multi-agent tool access is materially useful.

Disallowed without repeated evidence:

- new top-level compiler stages for single-case defects
- heavy web IDE
- general workflow engine
- infinite/node canvas as default interaction
- premature microservices
- DB ownership inside Core
- coupling VAST to one renderer
- replacing deterministic constraints with prompt-only wording

New findings should normally become:

```text
existing node field
or
Validator rule
or
Compiler pass correction
or
Renderer adapter behavior
or
Evaluator metric
or
Regression fixture
```

Only cross-case failures that cannot be represented by existing abstractions justify schema-level expansion.

---

# 21. Canonical summary

> **VAST 2.0 = VisualAST 1.0 validated visual semantics + strict Scene Contract / Canonical IR + deterministic Validator + explicit Compiler Passes + renderer-neutral RenderIntent + physically isolated Render/Evaluate loop + lightweight revision/regression/CLI infrastructure.**

Short form:

```text
V0  visual prompting rules
↓
V1  typed visual AST and validated visual semantics
↓
V2  reusable headless visual compiler
```

The VAST product is the compiler.

Revision is infrastructure.

CLI/TUI/MCP/Web are projections/adapters.

Renderer-specific behavior is isolated.

Regression cases are behavioral contracts.


---

# 22. Canonical Evolution Ledger — Formal Case 01–09

> This section is normative design rationale. It records not only the current regression target, but the failure evidence that caused VAST semantics to evolve.
>
> Evidence policy: preserve only runs/results supported by the frozen regression suite or valid project records. Invalid generated “test report” images are not treated as evidence.

## 22.1 Evolution chain

```text
Stage 0 — Visual prompting script
  ↓
Proved that visual intent can be decomposed and compiled into stronger image instructions.

Stage 1 — VisualAST 1.0
  ↓
Converted prompt heuristics into Scene Contract + Typed VisualAST + deterministic validation.
  ↓
Historical A–F regressions established:
Emotion→Pose, Form Lighting, Scale≠Attention, Scene Identity,
Narrative Prop Lock, Ordinariness, Frequency/Detail Budget,
Layer/Motion Operators, Composition Dependency, Relational Scale,
Required/Optional/Forbidden, Occupancy, Active Negative Space,
Style Grammar Propagation.

Stage 1.x — Formal style stress suite Case 01–09
  ↓
Attacked identity, count, repetition, abstraction, semantic negative space,
contradictory projection, heterogeneous material grammar, controlled mutation,
semantic relation boundaries, semantic openness, grammar inheritance,
causal lighting, saliency, and output isolation.
  ↓
Converted repeated failures into canonical constraints/rules.

Stage 2 — VAST 2.0
  ↓
Preserved all validated behavior while reorganizing implementation into:
Parse → Authoring Intent Guard → Normalize → Validate → Compile → Renderer Adapter
with Render/Evaluate isolated and regression/revision/CLI moved to infrastructure.
```

## 22.2 Case 01 — Folk woodblock × surreal allegory

### Frozen target

- Flooded black rice field at night.
- Huge flat vermilion wooden bed.
- Young biological woman in white mourning clothes.
- Explicit pose: perfectly upright; both hands flat on knees.
- Small black koi form a slow ring but remain low-attention.
- Tiny isolated white shrine in the distance.
- ≥50% negative space.
- Four principal colors: dark indigo / ink black / old-paper white / vermilion.
- Woodblock + screenprint Drawing Grammar.
- No modern buildings, poles, lanterns, boats, bridges, trees, mountains, second person, text, moon, or extra large objects.

### Original formal-suite result

First result was visually successful but `bed → platform`.

Classification:

```text
Identity Drift
```

This established that Presence PASS is not Identity PASS and reinforced:

- Entity Identity Invariant
- affordance preservation
- forbidden transformation
- bed must remain `furniture_bed`, not platform/stage/island/architecture

### VAST 2.0 migration runs

#### Run 01 — VALID / FAIL

Observed:

- mountains / trees / clouds / buildings / text auto-added
- shrine and koi too salient
- insufficient negative space
- bed and scene over-detailed
- sparse allegory drifted into high-information ukiyo-e

Diagnosis:

The IR could express the case, but 2.0 refactoring had over-abstracted compiler behavior.

Promoted fixes:

- explicit internal Compiler Pass pipeline
- Attention Pass
- Negative Space Pass
- Detail/Frequency Budget
- Forbidden/Suppression
- Prompt Sanitizer

#### Run 02 — INVALID TEST

Evaluator/report context leaked into Renderer.

#### Run 03 — INVALID TEST

Evaluator/report context leaked into Renderer again.

These runs are excluded from visual-quality regression evidence.

Promoted engineering fix:

```text
RendererInput must not contain:
Case ID / assertions / score / PASS-FAIL /
Validator output / Evaluator output / report metadata
```

Render and Evaluate are physically isolated by API/type boundary.

#### Run 04 — VALID / PARTIAL PASS

Recovered:

- bed identity
- negative space
- attention hierarchy
- distant shrine scale
- environmental suppression

Remaining:

- upright pose became bowed/slumped emotional posture
- grammar remained too volumetric/refined
- bed detail remained excessive
- koi/reeds/background frequency remained too high

Promoted fixes:

- explicit Pose precedence over emotional inference
- Drawing Grammar as drawing actions/information budget
- Visual Hierarchy Budget under Attention
- per-entity detail / contrast / occupancy / frequency suppression

### Design rationale retained

Case 01 is now the canonical example proving:

```text
IR correct
≠ Compile correct
≠ Render correct
```

and that low Attention alone cannot prevent an entity from dominating through count/detail/occupancy.

---

## 22.3 Case 02 — Rough child crayon × anomalous memory

### Frozen target

- Empty yellow classroom.
- Exactly 12 green desks.
- All chairs empty except a young human woman in the rear center.
- Oversized white rabbit headpiece is a wearable.
- Small red birthday cake with one unlit candle.
- Rough child-crayon drawing actions.
- Attention: woman > cake > desks.
- Large empty wall/floor/inter-desk gaps.
- No extra people, bags, books, windows, wall decorations, clocks, text, toys, flowers, or extra food.

### Historical result — PARTIAL PASS

Succeeded:

- rough-crayon Drawing Grammar

Failed:

- `rabbit_headpiece → rabbit_humanoid`
- explicit desk count drifted
- cake saliency became too strong

### Mechanisms reinforced

```text
Entity Identity Boundary
wears(woman, rabbit_headpiece)
forbidden_transform = rabbit_humanoid

Exact Count Constraint
expected = 12
tolerance = 0

Attention + Repetition + Occupancy joint control
```

This case proves that repeated low-priority objects require count, occupancy, detail, and saliency controls together.

It also establishes that a style label such as “crayon” is insufficient; Drawing Grammar must describe executable marks.

---

## 22.4 Case 03 — Constructivism × abstract science fiction

### Frozen target

- Off-white empty background.
- Running human woman in simplified black spacesuit.
- Huge vermilion 2D circle, diameter ≈ 2.5× woman height.
- Exactly three thick black diagonal lines.
- Small cobalt square, side ≈ woman height / 5.
- No environment.
- Hard-edge flat constructivist grammar.
- Abstract entities must remain abstract.
- Attention: large red circle → woman → lines → blue square.

### Historical result

```text
Constraint PASS
Aesthetic / Composition FAIL
```

Succeeded:

- geometric Identity
- abstract entities remained non-literal
- structural constraints held

Weakness:

- woman tended toward generic vector illustration
- constructivist aesthetic tension was weaker than intended

### Mechanisms reinforced

- Abstract Entity Identity
- Style Grammar Inheritance
- Global Grammar propagation to the human figure
- separate Constraint correctness from Aesthetic/Composition evaluation

### Design rationale retained

Case 03 proves that:

```text
Identity Invariant ≠ Semantic Openness
```

The circle is not ambiguous; it is explicitly a pure abstract circle.

It also proves that aesthetic failure should not automatically cause AST schema expansion.

---

## 22.5 Case 04 — Ink wash × extreme semantic blank space

### Frozen target

- Vertical rice paper.
- ≥75% completely unpainted paper.
- Young woman on tiny black rock near bottom.
- Water is not directly painted.
- Water/sky are primarily implied by blank paper.
- Exactly seven tiny birds.
- Sparse ink grammar.
- No mountains, clouds, moon, buildings, boats, text, second person.

### Baseline result

```text
FROZEN PASS
Aesthetic PASS
```

### Mechanisms validated

- Negative Space as first-class semantic region
- Implied Entity
- Explicit Count
- Sparse Drawing Grammar
- suppression of renderer “fill the blank” instinct

### Design rationale retained

Blank space can carry semantic content. “Nothing drawn” is not missing data.

This case is frozen and its input must not be casually edited.

---

## 22.6 Case 05 — Cubism × contradictory multi-view projection

### Frozen target

- Seated young woman.
- Left hand supports face.
- Right hand holds blue glass.
- Left eye front view.
- Nose side view.
- Mouth rotated toward another direction.
- Glass simultaneously exposes side profile and top opening.
- Contradictory views must coexist.
- Renderer must not “correct” them into normal perspective.

### Historical result — PARTIAL PASS

Succeeded:

- overall cubist reading
- glass multi-view representation

Failed:

- requested facial local viewpoints were not executed strictly one by one

### Architectural decision

Potential need identified:

```text
Representation / Projection Constraint
```

But **not promoted into canonical top-level schema yet**.

Reason:

One case is insufficient evidence for a new abstraction. More independent failures are required.

### Design rationale retained

VAST regression policy favors:

```text
field/rule/pass correction first
schema expansion only after repeated cross-case evidence
```

---

## 22.7 Case 06 — Collage × heterogeneous material grammar

### Frozen target

One standing woman assembled from four media:

- face = black-and-white newspaper photo clipping
- hair = torn black paper
- dress = red botanical wrapping paper
- hands/legs = rough pencil lines
- holds a yellow paper flower
- gray-white cardboard background
- cut/torn/overlap edges remain visible
- no unified digital-painting treatment

### Baseline result

```text
FROZEN PASS
```

Minor issue:

- slight material-assignment deviation

Core success:

- heterogeneous grammar survived compilation

### Mechanisms validated

- `scene.default_grammar`
- legal `entity.rendering_grammar_override`
- Per-Entity Rendering Grammar
- Material Identity / Separation
- heterogeneous Style Coherence

### Design rationale retained

Style Coherence means:

> each entity faithfully executes its assigned grammar

—not “all entities must look the same”.

---

## 22.8 Case 07 — Pop comic × repeated female portrait

### Frozen target

- Exact 3×3 grid.
- Exactly nine instances of the same frontal female portrait.
- Same structure / position / size.
- Only hair, background, and lip colors vary.
- Center cell only: eyes closed.
- Other eight: eyes open.
- Comic black outline / flat fill / halftone.
- No tenth portrait.
- No text/report board.

### Historical result

```text
PASS
```

Independent rerun confirmed:

- One Contract One Render
- Exact Count
- Grid
- Controlled Mutation

### Mechanisms validated

- repeated identity consistency
- exact instance count
- indexed controlled variation
- output isolation

### Schema implication

Repeated instances should be representable without pretending they are unrelated entities.

Conceptual form:

```yaml
entity: woman
instances:
  count: 9
identity_lock: true
overrides:
  cell_05:
    eyes: closed
```

This is a field-level IR refinement, not a new top-level compiler stage.

---

## 22.9 Case 08 — Technical drawing × mechanical analogy of human motion

### Frozen target

- Deep-blue engineering blueprint.
- Central front-facing biological human woman.
- Six mechanical sectional diagrams.
- Lines point to shoulder / elbow / wrist / hip / knee / ankle.
- Mechanical structures are explanatory analogies.
- They are not internal body parts.
- No robot / cyborg / powered armor transformation.
- 2D blueprint grammar.

### Historical result

```text
PASS on core Relation / Identity Boundary
```

Minor deviations:

- some medical-diagram tendency
- some axonometric/3D tendency

### Mechanisms validated

```text
woman.type = biological_human
mechanical_diagrams.count = 6
relation = explanatory_analogy
forbidden relation = part_of(woman)
```

### Design rationale retained

“Diagram explains A” must not be semantically lowered into “diagram is a component of A”.

This case is a canonical Relation Semantic Boundary regression.

Typography/dimension fidelity is renderer capability-dependent and must not be confused with Core semantic correctness.

---

## 22.10 Case 09 — Wasteland × cel animation × causal nuclear cold light

### Frozen target

- Wasteland.
- Cel-animation grammar.
- Long-skirt military girl curled inside a horizontal abandoned sewer pipe.
- Holds an energy rifle.
- Nuclear battery powers rifle and emits blue cold light.
- Battery light causally illuminates face/hands/clothes/nearby pipe.
- Outside pipe: darkness and various distorted things.
- Attention: girl > battery/rifle > pipe > outside anomalies.
- Outside anomalies intentionally remain semantically open.

### Historical result

Strong:

- overall visual quality
- Container relation
- curled pose
- Causal Lighting

Failures:

- Semantic Narrowing:
  `distorted things → monster ecosystem`
- Global Grammar Leakage:
  girl cel-shaded while environment drifted toward CG/concept-art rendering
- rifle saliency slightly too high

### Mechanisms promoted

#### Semantic Openness Constraint

```yaml
semantic_specificity: low
category_lock: none
required_property:
  - distorted
  - ambiguous
  - partially_unrecognizable
forbidden_narrowing:
  - all_monsters
  - all_creatures
  - tentacle_ecosystem
  - identifiable_species
```

#### Global Grammar Inheritance

All non-overridden scene entities inherit the scene grammar, including environment and anomalies.

#### Saliency / causal-light distinction

The rifle/battery may be narratively causal without becoming the primary visual center.

### Design rationale retained

Case 09 is the canonical proof that:

> deliberate ambiguity is itself a constraint.

The renderer must not “helpfully explain” an intentionally unresolved visual concept.

---

# 23. Case 01–09 Coverage Matrix — Canonical

| Case | Primary attack surface | Historical state | Canonical lesson |
|---|---|---|---|
| 01 | Identity / Scale / Negative Space / Limited Palette | Identity Drift; 2.0 Run04 PARTIAL | Identity + compiler budgets + render isolation |
| 02 | Drawing Grammar / Count / Repetition / Attention | PARTIAL PASS | wearable boundary + exact count + repetition saliency |
| 03 | Abstract Identity / Style / Composition | Constraint PASS / Aesthetic FAIL | grammar inheritance; aesthetics separate |
| 04 | Semantic Negative Space / Implied Entity / Count | FROZEN PASS | blank space is semantic |
| 05 | Multi-view / Contradictory Projection | PARTIAL PASS | do not prematurely expand schema |
| 06 | Per-Entity Grammar / Material Heterogeneity | FROZEN PASS | heterogeneous coherence |
| 07 | Exact Count / Grid / Controlled Mutation | PASS | repeated identity + indexed overrides |
| 08 | Semantic Relation / Identity Boundary / Diagram Grammar | PASS core | analogy ≠ component |
| 09 | Semantic Openness / Grammar Inheritance / Causal Lighting | Regression target | ambiguity must remain open |

---

# 24. Evolution-derived system regression taxonomy

Confirmed:

```text
Presence Failure
Identity Failure / Semantic Drift
Scale Failure
Explicit Count Failure
Attention / Saliency Failure
Drawing Grammar Failure
Style Coherence / Grammar Leakage
Semantic Narrowing
Composition / Aesthetic Failure
Output Isolation / Orchestration Failure
```

Candidate, not yet promoted:

```text
Representation / Projection Failure
```

Promotion rule:

> A candidate becomes canonical only after repeated independent evidence shows that existing Node/Relation/Rule/Compiler abstractions cannot express or validate it cleanly.

---

# 25. Evidence and provenance policy

The VAST specification distinguishes:

1. **Frozen formal-suite evidence** — canonical.
2. **Valid isolated render runs** — eligible regression evidence.
3. **Invalid contaminated runs** — retained only as test-harness failure evidence.
4. **Generated report graphics containing scores/status text** — never treated as factual test results merely because the image contains them.
5. **Unverified implementation claims** — must remain UNVERIFIED until executable Core/CLI tests exist.

Therefore the Case 01–09 history above preserves supported outcomes from the frozen regression suite and the valid VAST 2.0 Case 01 migration runs, while refusing to promote fabricated report-image metrics into canonical results.

---

# 26. Final lineage statement

VAST 2.0 should be understood as the accumulated result of three major generations:

```text
Generation 0
Visual interpretation / prompt compilation script
        ↓
Generation 1
VisualAST 1.0
Typed visual semantics + deterministic constraints
        ↓
Generation 1.x
A–F + formal Case 01–09 regression pressure
Failure-driven semantic/rule evolution
        ↓
Generation 2
VAST 2.0
Same validated behavior reorganized into a reusable,
headless, testable visual compiler
```

Nothing in VAST 2.0 may silently remove a behavior whose existence is justified by these regression histories.

The regression suite is therefore not auxiliary documentation.

> **It is part of the behavioral contract of the compiler.**

---

# 27. VAST Core 2.0.1 compatible upgrade

VAST Core 2.0.1 adds the Authoring Intent Guard as a Parse-boundary sub-pass. It was introduced after a valid render demonstrated that faithful compilation may expose an under-specified authoring decision: a giant Moon, a narrative human gesture, and a recognizable Earth could all be legal while competing for visual dominance; global cel-animation wording could also leave astronomical entities vulnerable to renderer-default realistic texture.

This finding is classified as pre-freeze authoring diagnostics, not AST schema failure and not Renderer failure.

Compatibility guarantees:

- Scene Contract, Typed VisualAST, Validator, Compiler Pass order, RenderIntent, Adapter, Evaluate, and Case 01–09 behavior remain compatible.
- The Guard is optional at interaction level but diagnostics remain observable.
- No aesthetic preference is promoted to a hard canonical rule.
- Renderer/Evaluator physical isolation remains unchanged.

The new regression gate must prove:

1. contradictions block;
2. attention competition and grammar propagation gaps pause;
3. notices do not block;
4. acknowledgement permits continuation;
5. the Intent Draft is not mutated;
6. unusual but acknowledged composition remains legal;
7. Guard metadata cannot cross the Renderer boundary.

---

# 28. VAST Core 2.0.2 compatible bugfix

VAST Core 2.0.2 incorporates evidence from the second stylized anime stress run without expanding the AST Schema or top-level lifecycle.

## 28.1 Contextual Semantic Prior Collision

Semantic Openness may be formally declared while the surrounding visual cues still strongly imply a forbidden concrete category. Example:

```text
environment: sky
entity: large pale-yellow circle
forbidden_narrowing: [sun, moon]
```

The entity alone is abstract, but the cue combination strongly predicts `sun`. A negative prompt is not sufficient to erase this visual prior.

Parser or knowledge-assisted analysis may emit:

```ts
type ContextualSemanticPrior = {
  id: string;
  cues: string[];
  impliedCategory: string;
  confidence: number;
  forbiddenCategories: string[];
  affectedNodes: string[];
};
```

If `confidence >= 0.75` and `impliedCategory` is forbidden, Authoring Intent Guard emits `CONTEXTUAL_SEMANTIC_PRIOR_COLLISION` as a WARNING and pauses for author choice. The Guard does not rewrite the scene and does not hard-code a specific object/category pair.

This is a Guard diagnostic contract, not a new AST Node. Promotion to a broader semantic inference subsystem still requires repeated independent evidence.

## 28.2 High stylization without detail escalation

The Drawing Grammar / Frequency Pass now treats stylistic complexity and information density as independent variables. When the subject requires sharp graphic fashion treatment but the environment must remain sparse, the Compiler may emit explicit budgets for background microtexture, background structure lines, and reflection/highlight groups.

## 28.3 Non-change

Localized causal-light spill remains a Render/Evaluate/Adapter precision issue. It does not justify a new Core field or compiler stage in this release.

Compatibility guarantees:

- Case 01–09 behavior remains unchanged.
- 2.0.1 Intent Guard decisions remain valid.
- Contextual prior and Guard metadata remain physically excluded from RendererInput.
- No renderer-specific branch enters Core.
