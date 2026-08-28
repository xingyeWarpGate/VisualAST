import { parseIntentDraft } from '../../domain/schemas.js';
import type { IntentDraft, ParseRequest, ParseResult, ParserPort } from '../../domain/types.js';

export type ParserAdapterConfig = { baseUrl: string; apiKeyEnv: string; model: string; timeoutMs: number; repairOnSchemaError?: boolean };
export type ParserFailureKind = 'network' | 'timeout' | 'auth' | 'rate-limit' | 'invalid-json' | 'schema';

export class ParserAdapterError extends Error {
  constructor(public readonly kind: ParserFailureKind, message: string, public readonly details?: unknown) { super(message); this.name = 'ParserAdapterError'; }
}

const endpointFor = (baseUrl: string) => baseUrl.replace(/\/$/, '').endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;

export class OpenAICompatibleParser implements ParserPort {
  constructor(private readonly config: ParserAdapterConfig, private readonly environment: NodeJS.ProcessEnv = process.env) {}

  async parse(input: ParseRequest): Promise<ParseResult> {
    const key = this.environment[this.config.apiKeyEnv];
    if (!key) throw new ParserAdapterError('auth', `Missing parser API key environment variable ${this.config.apiKeyEnv}`);
    const response = await this.request(input, key);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new ParserAdapterError('auth', 'Parser authentication failed', { status: response.status });
      if (response.status === 429) throw new ParserAdapterError('rate-limit', 'Parser rate limit exceeded', { status: response.status });
      throw new ParserAdapterError('network', `Parser request failed with HTTP ${response.status}`, { status: response.status });
    }
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new ParserAdapterError('invalid-json', 'Parser response was not valid JSON'); }
    const candidate = this.extractContent(payload);
    try {
      const draft = parseIntentDraft(candidate);
      return { draft, parser: { adapter: 'openai-compatible', model: this.config.model, schemaVersion: '1' }, warnings: [] };
    } catch (error) {
      if (this.config.repairOnSchemaError) {
        // The default is off; callers opting in get one bounded repair request.
        const repaired = await this.request({ ...input, text: `Return a corrected IntentDraft JSON only. Original input:\n${input.text}` }, key);
        let repairedPayload: unknown;
        try { repairedPayload = await repaired.json(); } catch { throw new ParserAdapterError('invalid-json', 'Parser repair response was not valid JSON', { originalError: String(error) }); }
        try { return { draft: parseIntentDraft(this.extractContent(repairedPayload)), parser: { adapter: 'openai-compatible', model: this.config.model, schemaVersion: '1' }, warnings: ['Initial parser response failed schema validation; one repair request was used.'] }; } catch (repairError) { throw new ParserAdapterError('schema', 'Parser response did not match IntentDraft schema after repair', { originalError: String(error), repairError: String(repairError) }); }
      }
      throw new ParserAdapterError('schema', 'Parser response did not match IntentDraft schema', { error: String(error) });
    }
  }

  private async request(input: ParseRequest, key: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(endpointFor(this.config.baseUrl), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify({ model: this.config.model, messages: [{ role: 'system', content: 'Extract a VAST 2.0.2 IntentDraft. Return JSON only.' }, { role: 'user', content: input.text }], response_format: { type: 'json_object' } }), signal: AbortSignal.timeout(this.config.timeoutMs) });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) throw new ParserAdapterError('timeout', `Parser request timed out after ${this.config.timeoutMs}ms`);
      throw new ParserAdapterError('network', 'Parser network request failed');
    }
    return response;
  }

  private extractContent(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') throw new ParserAdapterError('schema', 'Parser response envelope was not an object');
    const choices = (payload as { choices?: unknown }).choices;
    const content = Array.isArray(choices) && choices[0] && typeof choices[0] === 'object' ? (choices[0] as { message?: { content?: unknown } }).message?.content : undefined;
    if (typeof content === 'object') return content;
    if (typeof content !== 'string') return payload;
    try { return JSON.parse(content) as unknown; } catch { throw new ParserAdapterError('invalid-json', 'Parser message content was not valid JSON'); }
  }
}
