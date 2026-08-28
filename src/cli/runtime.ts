import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { FixtureParser } from '../adapters/parser/fixture-parser.js';
import { OpenAICompatibleParser } from '../adapters/parser/openai-compatible-parser.js';
import { VastApplication } from '../application/vast-application.js';
import { runCoreRegression } from '../regression/runner.js';
import type { GuardMode, ParserProfile } from '../domain/types.js';

type Config = { parserProfiles?: Record<string, ParserProfile>; guard?: { mode?: GuardMode } };

export async function loadConfig(cwd = process.cwd()): Promise<Config> {
  const candidates = [process.env.VAST_CONFIG, join(cwd, '.vast', 'config.json')].filter((x): x is string => Boolean(x));
  for (const candidate of candidates) { try { return JSON.parse(await readFile(candidate, 'utf8')) as Config; } catch { /* absent config uses safe defaults */ } }
  return {};
}

export async function createApplication(parserName = 'default'): Promise<VastApplication> {
  const config = await loadConfig();
  const profile = config.parserProfiles?.[parserName];
  if (parserName === 'fixture' || profile?.adapter === 'fixture') return new VastApplication(new FixtureParser(), { regression: runCoreRegression });
  const selected = profile ?? { adapter: 'openai-compatible' as const, baseUrl: 'https://example.invalid/v1', apiKeyEnv: 'VAST_PARSER_API_KEY', model: 'configured-model', timeoutMs: 30000 };
  return new VastApplication(new OpenAICompatibleParser({ baseUrl: selected.baseUrl ?? '', apiKeyEnv: selected.apiKeyEnv ?? 'VAST_PARSER_API_KEY', model: selected.model ?? 'configured-model', timeoutMs: selected.timeoutMs ?? 30000 }), { regression: runCoreRegression });
}
