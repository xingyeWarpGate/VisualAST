# VAST 2.0.2 Milestone 0 baseline

审计日期：2026-08-28

`D:\VisualAST` 初始 worktree 只有 `doc/vast2.0.md` 与
`doc/VAST-2.0.2-CLI-Plugin-Implementation-Spec.md`，没有旧版 JS 导出、40 项测试、fixture、`package.json` 或构建脚本；Git 仓库也没有历史 commit。因此无法执行“迁移前 40/40”或建立针对既有导出的 characterization tests，也没有无关 dirty worktree 可保留。

本项目会把 VAST 2.0.2 Spec 中冻结的 Core 行为转成可执行的 40 项 Core migration gate，并在后续里程碑持续运行。该 gate 是新增的迁移护栏，不声称它来自缺失的旧仓库。

已确认的边界：Core 不访问文件、网络、环境变量、当前时间或全局可变状态；CLI、Parser、DSH Plugin 是外层适配器；首版不包含 Renderer、Web、数据库、MCP 或图像模型调用。
