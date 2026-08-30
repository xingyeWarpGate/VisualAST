import { parseIntentDraft } from '../../domain/schemas.js';
import { DeterministicParser } from '../../runtime/semantic-runtime.js';
import type { EntitySpec, IntentDraft, ParseRequest, ParseResult, ParserPort } from '../../domain/types.js';

const entity = (id: string, type: string, presence: EntitySpec['presence'] = 'required'): EntitySpec => ({ id, type, label: type, presence, identityLock: true });
export function fixtureDraft(seed = 'fixture'): IntentDraft { return { text: seed, sceneIdentity: seed, requiredEntities: [entity('entity.subject', 'subject')], optionalEntities: [entity('entity.object', 'object', 'optional')], forbiddenEntities: [], requiredStates: [], requiredRelations: [], outputModality: 'image', palette: [], renderingGrammar: { name: 'neutral', actions: ['faithful visible forms', 'selective detail', 'no unrequested embellishment'] }, styleDomain: 'neutral', composition: { negativeSpace: 0.2 }, explicitPose: {}, explicitGaze: {} }; }

export class FixtureParser implements ParserPort {
  private readonly deterministic = new DeterministicParser();
  async parse(input: ParseRequest): Promise<ParseResult> {
    try { return { draft: parseIntentDraft(JSON.parse(input.text)), parser: { adapter: 'fixture', model: 'structured-input', schemaVersion: '2.2.1' }, warnings: [] }; } catch { const parsed = await this.deterministic.parse(input); return { ...parsed, parser: { adapter: 'fixture', model: 'deterministic-fixture', schemaVersion: '2.2.1' } }; }
  }
}