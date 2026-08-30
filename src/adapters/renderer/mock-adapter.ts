import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { AdapterRequest, RenderIntent221, RenderResult, RendererAdapter, RendererCapabilities, ValidationResult } from '../../domain/types.js';

export class MockRendererAdapter implements RendererAdapter {
  id = 'mock';
  capabilities(): RendererCapabilities { return { id: this.id, version: '1.0.0', textToImage: true, imageToImage: true, references: true, masks: false, staging: true, aspectRatios: ['square', 'landscape', 'portrait'], qualityModes: ['medium'] }; }
  lower(intent: RenderIntent221): AdapterRequest { return { adapterId: this.id, prompt: intent.prompt, negativePrompt: intent.negativeConstraints.join('; '), inputImages: [], metadata: { staged: intent.staging.level } }; }
  validateRequest(request: AdapterRequest): ValidationResult { return { status: request.prompt ? 'PASS' : 'FAIL', diagnostics: request.prompt ? [] : [{ code: 'EMPTY_PROMPT', message: 'Mock renderer prompt is empty', severity: 'error' }] }; }
  async render(request: AdapterRequest): Promise<RenderResult> { const path = resolve('artifacts/vast-2.2.1/images', `mock-${Date.now()}.png`); await mkdir(dirname(path), { recursive: true }); const png = Buffer.from('89504e470d0a1a0a', 'hex'); await writeFile(path, png); return { success: true, adapterId: this.id, imagePath: path, modality: request.inputImages.length ? 'image' : 'text', inputImageCount: request.inputImages.length, provider: 'mock', model: 'structural-test', metadata: { request: { ...request, prompt: '[redacted in mock evidence]' } } }; }
}
