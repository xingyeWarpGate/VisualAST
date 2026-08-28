# DSH API audit for VAST Plugin

审计日期：2026-08-28

本适配器在 `D:\DSH` 中检查了：

- `docs/plugin-development.md` / `plugin-development.en.md`
- `dsh-community-market/src/index.ts`
- `dsh-plugin-desktop/src/index.ts`
- `dsh-community-fabric/docs/rfcs/0001-plugin-manifest-capabilities-events.md`

当前 DSH/Cordis 插件入口在真实仓库中使用：

```ts
export const name = '...'
export const inject = ['...']
export function apply(ctx: Context): void { ... }
```

当前代码和文档还确认了 `ctx.effect(...)`、`ctx.inject(...)`、`ctx.get(...)`、`ctx.provide(...)` 等 Cordis 生命周期/服务面。VAST Adapter 只依赖其中已确认的 `name`、`inject`、`apply` 和 `provide` 形状，并贡献 `vastAgentTools` 服务。

`dsh-community-fabric` RFC 的 `dsh-plugin.json`、`definePlugin`、标准 `commands` tool broker 属于 Draft；RFC 本身明确说它不是当前可用 API。因此首版没有猜测或依赖这些接口，也没有伪造 Fabric manifest。四个工具由 `src/plugin/tools.ts` 提供，DSH 只承担薄的 Cordis service adapter。
