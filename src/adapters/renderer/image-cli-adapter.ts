import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { AdapterRequest, RenderIntent221, RenderResult, RendererAdapter, RendererCapabilities, ValidationResult } from '../../domain/types.js';

export type ImageCliOptions = { command?: string; cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number; output?: string; desktop?: boolean; aspectRatio?: 'square' | 'landscape' | 'portrait'; quality?: 'medium'; image?: string; references?: string[] };
const commandDefault = process.platform === 'win32' ? 'D:\\npm\\image.cmd' : 'image';
const quoteWindows = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const run = (command: string, args: string[], options: ImageCliOptions): Promise<{ code: number; stdout: string; stderr: string }> => new Promise((resolve, reject) => {
  const useCmd = process.platform === 'win32' && /\.cmd$/i.test(command);
  const executable = useCmd ? (process.env.ComSpec ?? 'cmd.exe') : command;
  const childArgs = useCmd ? ['/d', '/s', '/c', [quoteWindows(command), ...args.map(quoteWindows)].join(' ')] : args;
  const child = spawn(executable, childArgs, { cwd: options.cwd, env: options.env ?? process.env, windowsHide: true });
  let stdout = ''; let stderr = '';
  const timer = setTimeout(() => { child.kill(); reject(new Error(`image CLI timed out after ${options.timeoutMs ?? 120000}ms`)); }, options.timeoutMs ?? 120000);
  child.stdout.on('data', (x) => stdout += String(x)); child.stderr.on('data', (x) => stderr += String(x)); child.on('error', reject); child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
});

export class ImageCliRendererAdapter implements RendererAdapter {
  id = 'image-cli';
  constructor(private readonly options: ImageCliOptions = {}) {}
  capabilities(): RendererCapabilities { return { id: this.id, version: 'image-cli', textToImage: true, imageToImage: true, references: true, masks: false, staging: false, aspectRatios: ['square', 'landscape', 'portrait'], qualityModes: ['medium'] }; }
  lower(intent: RenderIntent221): AdapterRequest { return { adapterId: this.id, prompt: intent.prompt, negativePrompt: intent.negativeConstraints.join('; '), inputImages: [...(this.options.image ? [this.options.image] : []), ...(this.options.references ?? [])], aspectRatio: this.options.aspectRatio, quality: this.options.quality ?? 'medium', metadata: { model: 'gpt-image-2-medium', provider: 'openai-codex', staging: intent.staging.level, contractHash: intent.provenance.contractHash, aestheticPlanHash: intent.provenance.aestheticPlanHash } }; }
  validateRequest(request: AdapterRequest): ValidationResult { const ds: ValidationResult['diagnostics'] = []; if (!request.prompt.trim()) ds.push({ code: 'EMPTY_PROMPT', message: 'Image CLI prompt is empty', severity: 'error' }); if (request.quality && request.quality !== 'medium') ds.push({ code: 'UNSUPPORTED_QUALITY', message: 'image CLI only supports medium quality', severity: 'error' }); return { status: ds.length ? 'FAIL' : 'PASS', diagnostics: ds }; }
  async render(request: AdapterRequest): Promise<RenderResult> {
    const args: string[] = []; const source = this.options.image;
    for (const reference of this.options.references ?? []) args.push('--reference', reference);
    if (source) args.unshift('--image', source);
    args.push(request.prompt, '--quality', request.quality ?? 'medium', '--json');
    if (request.aspectRatio) args.push('--aspect-ratio', request.aspectRatio);
    if (this.options.desktop) args.push('--desktop');
    if (this.options.output) args.push('--output', this.options.output);
    if (this.options.desktop && this.options.output) return { success: false, adapterId: this.id, modality: source ? 'image' : 'text', inputImageCount: request.inputImages.length, metadata: {}, error: { code: 'INVALID_IMAGE_CLI_OPTIONS', message: '--desktop and --output cannot be used together' } };
    try {
      const result = await run(this.options.command ?? commandDefault, args, this.options);
      let payload: any; try { payload = JSON.parse(result.stdout.trim()); } catch { payload = undefined; }
      const safePayload = payload && typeof payload === 'object' ? { ...payload, prompt: undefined } : payload;
      if (result.code !== 0 || !payload?.success) return { success: false, adapterId: this.id, modality: source ? 'image' : 'text', inputImageCount: Number(payload?.input_image_count ?? request.inputImages.length), model: payload?.model, provider: payload?.provider, metadata: { stderr: result.stderr, cli: safePayload }, error: { code: payload?.error_type === 'io_error' ? 'IMAGE_CLI_IO_ERROR' : payload?.error_type === 'auth_required' ? 'IMAGE_CLI_AUTH_REQUIRED' : 'IMAGE_CLI_FAILED', message: String(payload?.error ?? (result.stderr.trim() || 'image CLI failed')) } };
      const imagePath = payload.image;
      if (typeof imagePath !== 'string') return { success: false, adapterId: this.id, modality: source ? 'image' : 'text', inputImageCount: request.inputImages.length, model: payload?.model, provider: payload?.provider, metadata: safePayload, error: { code: 'IMAGE_CLI_INVALID_RESULT', message: 'image CLI did not return an image path' } };
      await access(imagePath);
      return { success: true, adapterId: this.id, imagePath, modality: payload.modality === 'image' || source ? 'image' : 'text', inputImageCount: Number(payload.input_image_count ?? request.inputImages.length), model: payload.model, provider: payload.provider, metadata: { ...safePayload, request: { ...request, prompt: '[redacted from evidence]' } } };
    } catch (error) { return { success: false, adapterId: this.id, modality: source ? 'image' : 'text', inputImageCount: request.inputImages.length, metadata: {}, error: { code: 'IMAGE_CLI_UNAVAILABLE', message: error instanceof Error ? error.message : 'image CLI unavailable' } }; }
  }
}