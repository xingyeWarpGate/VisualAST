import type { RendererAdapter, RendererCapabilities } from '../../domain/types.js';

export class RendererRegistry {
  private readonly adapters = new Map<string, RendererAdapter>();
  register(adapter: RendererAdapter): this { this.adapters.set(adapter.id, adapter); return this; }
  get(id: string): RendererAdapter | undefined { return this.adapters.get(id); }
  require(id: string): RendererAdapter { const adapter = this.get(id); if (!adapter) throw new Error(`Renderer adapter unavailable: ${id}`); return adapter; }
  capabilities(): RendererCapabilities[] { return [...this.adapters.values()].map((x) => x.capabilities()); }
  ids(): string[] { return [...this.adapters.keys()]; }
}