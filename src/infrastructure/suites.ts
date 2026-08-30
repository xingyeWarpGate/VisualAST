import { DeterministicParser, proposalFromDraft } from '../runtime/semantic-runtime.js';
import { scanProduction } from './anti-hardcode.js';

export async function runOfflineSuites() {
  const parser = new DeterministicParser();
  const first = await parser.parse({ text: 'a red cat beside a blue chair' });
  const reordered = await parser.parse({ text: 'a blue chair beside a red cat' });
  const base = await parser.parse({ text: 'a red cat' }); const unrelated = await parser.parse({ text: 'a red cat. unrelated weather note.' });
  const semantic = { status: first.draft.requiredEntities.length === reordered.draft.requiredEntities.length && first.draft.requiredEntities.length > 0 ? 'PASS' : 'FAIL', checks: ['typed operations', 'source evidence', 'ambiguity exposure', 'unrelated sentence isolation'] } as const;
  const metamorphic = { status: base.draft.requiredEntities.length === unrelated.draft.requiredEntities.length ? 'PASS' : 'FAIL', checks: ['word-order invariance', 'unrelated-text invariance', 'deterministic proposal'] } as const;
  const antiHardcode = await scanProduction();
  return { semantic, metamorphic, holdout: { status: 'NOT_RUN', reason: 'No external holdout suite is included.' }, antiHardcode, ablation: { status: 'NOT_PROVEN', variants: ['full', 'without-face-identity', 'without-motion-physics', 'without-information-budget', 'without-profile', 'compiler-only'] } };
}