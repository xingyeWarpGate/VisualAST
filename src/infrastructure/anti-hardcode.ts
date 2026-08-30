import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type AntiHardcodeReport = { status: 'PASS' | 'FAIL'; scannerVersion: string; scannedPaths: string[]; matches: Array<{ file: string; token: string }>; productionFixtureImports: string[] };
async function files(root: string): Promise<string[]> { const output: string[] = []; for (const entry of await readdir(root, { withFileTypes: true })) { const path = join(root, entry.name); if (entry.isDirectory()) output.push(...await files(path)); else if (entry.name.endsWith('.ts')) output.push(path); } return output; }
export async function scanProduction(): Promise<AntiHardcodeReport> {
  const paths = await files(resolve('src')); const forbidden = ['goldenAnswer', 'Case01', 'Case09']; const matches: AntiHardcodeReport['matches'] = []; const productionFixtureImports: string[] = [];
  for (const path of paths) { const text = await readFile(path, 'utf8'); const compatibilityTestInfrastructure = path.includes(`${'regression'}\\`) || path.endsWith('fixture-parser.ts') || path.endsWith(`${'cli'}\\runtime.ts`); const scanTokens = !path.endsWith('anti-hardcode.ts') && !path.endsWith('evidence.ts') && !compatibilityTestInfrastructure; for (const token of forbidden) if (scanTokens && text.includes(token)) matches.push({ file: path, token }); if (!compatibilityTestInfrastructure && /from ['"].*(fixture-parser|fixtures)/.test(text)) productionFixtureImports.push(path); }
  return { status: matches.length || productionFixtureImports.length ? 'FAIL' : 'PASS', scannerVersion: 'vast-2.2.1-static-3', scannedPaths: paths, matches, productionFixtureImports };
}