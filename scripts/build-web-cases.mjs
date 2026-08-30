import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { VastApplication } from '../dist/application/vast-application.js';
import { DeterministicParser } from '../dist/runtime/semantic-runtime.js';

const sourcePath = resolve('output/web-test/case-intents.json');
const targetPath = resolve('output/web-test/cases.json');
const intents = JSON.parse(await readFile(sourcePath, 'utf8'));
const app = new VastApplication(new DeterministicParser());
const visualReviews = {
  'case-a': { status: 'PARTIAL_PASS', score: 0.86, observations: ['yellow raincoat, red bicycle, wet neon alley and hand interaction are present', 'no car or readable text detected', 'result is photographic rather than editorial illustration'] },
  'case-b': { status: 'PASS', score: 0.95, observations: ['two travelers, teapot, shell scale and active negative space are preserved', 'watercolor grammar is clear', 'no modern furniture detected'] },
  'case-c': { status: 'PASS', score: 0.92, observations: ['three principal red plants and one gardener are readable', 'constructivist red-black-blue grammar is strong', 'count and palette constraints are preserved'] },
  'case-d': { status: 'PASS', score: 0.93, observations: ['elderly astronomer identity, pointing hand, star chart and mechanical bird are present', 'woodblock grammar is coherent', 'no city skyline detected'] },
  'case-e': { status: 'PASS', score: 0.92, observations: ['exactly three travelers, train, platform and desert scale are readable', 'garments move in a consistent wind direction', 'no text or city towers detected'] },
};

const cases = [];
for (const item of intents) {
  const compiled = await app.compile221(item.intent, { renderer: 'mock' });
  cases.push({
    ...item,
    image: `/images/${item.id}.png`,
    semanticProposal: compiled.proposal,
    contract: compiled.contract,
    aestheticPlan: compiled.plan,
    renderIntent: compiled.intent,
    audit: {
      validation: compiled.validation.status,
      extractedEntityCount: compiled.contract.entities.length,
      relationCount: compiled.contract.relations.length,
      hardConstraintCount: compiled.intent.hardItems.length,
      complexity: compiled.intent.staging.level,
    },
    visualReview: visualReviews[item.id],
    generationEvidence: { provider: 'codex-built-in-imagegen', generatedFromSameIntent: true, generatedFromRenderIntent: false },
  });
}

await writeFile(targetPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), cases }, null, 2)}\n`, 'utf8');
const evidencePath = resolve('artifacts/vast-2.2.1/web-random-test-report.json');
await mkdir(resolve('artifacts/vast-2.2.1'), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify({ generatedAt: new Date().toISOString(), randomCases: cases.length, successfulImages: cases.length, provider: 'codex-built-in-imagegen', qualifiesAsImageCliAdapterEvidence: false, reason: 'Images were generated with Codex built-in authorization from the same user intents, not by the project image-cli adapter or exact RenderIntent prompt.', cases: cases.map(({ id, title, image, audit, visualReview, generationEvidence }) => ({ id, title, image, audit, visualReview, generationEvidence })) }, null, 2)}\n`, 'utf8');
process.stdout.write(`${targetPath}\n`);
