import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { OpenAICompatibleParser, ParserAdapterError } from '../src/adapters/parser/openai-compatible-parser.js';

const originalFetch = globalThis.fetch;
const draft = { requiredEntities: [], optionalEntities: [], forbiddenEntities: [], requiredStates: [], requiredRelations: [], outputModality: 'image' };
const parser = () => new OpenAICompatibleParser({ baseUrl: 'https://parser.example/v1', apiKeyEnv: 'TEST_VAST_KEY', model: 'test-model', timeoutMs: 20 }, { TEST_VAST_KEY: 'secret-key' });

afterEach(() => { globalThis.fetch = originalFetch; });

test('OpenAI-compatible parser extracts and validates JSON content', async () => {
  let seen: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => { seen = init; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(draft) } }] }), { status: 200 }); };
  const result = await parser().parse({ text: 'scene' });
  assert.equal(result.parser.adapter, 'openai-compatible');
  assert.equal((seen?.headers as Record<string, string>).authorization, 'Bearer secret-key');
});

test('OpenAI-compatible parser classifies auth failures without exposing key', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 401 });
  await assert.rejects(() => parser().parse({ text: 'scene' }), (error: unknown) => error instanceof ParserAdapterError && error.kind === 'auth' && !String(error).includes('secret-key'));
});

test('OpenAI-compatible parser classifies rate limiting', async () => {
  globalThis.fetch = async () => new Response('nope', { status: 429 });
  await assert.rejects(() => parser().parse({ text: 'scene' }), (error: unknown) => error instanceof ParserAdapterError && error.kind === 'rate-limit');
});

test('OpenAI-compatible parser classifies invalid JSON', async () => {
  globalThis.fetch = async () => new Response('{not-json', { status: 200 });
  await assert.rejects(() => parser().parse({ text: 'scene' }), (error: unknown) => error instanceof ParserAdapterError && error.kind === 'invalid-json');
});

test('OpenAI-compatible parser classifies schema mismatch', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ nope: true }) } }] }), { status: 200 });
  await assert.rejects(() => parser().parse({ text: 'scene' }), (error: unknown) => error instanceof ParserAdapterError && error.kind === 'schema');
});

test('OpenAI-compatible parser classifies timeout', async () => {
  globalThis.fetch = async () => { const error = new Error('deadline'); error.name = 'TimeoutError'; throw error; };
  await assert.rejects(() => parser().parse({ text: 'scene' }), (error: unknown) => error instanceof ParserAdapterError && error.kind === 'timeout');
});
