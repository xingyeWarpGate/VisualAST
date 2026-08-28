# CLI → Image Generation Run

日期：2026-08-28

链路：

```text
fixtures/case-XX.txt
→ node dist/cli/main.js compile ... --format prompt --out cli-prompts/case-XX.txt
→ Codex built-in image_gen authorization
→ cli-run-case-XX.png
→ manual visual inspection
```

这里的图片使用的是当前 Codex 界面的内置授权。请求目标按 `gpt-image-2` 约束编写，但内置工具不会暴露实际 provider/model 标识；因此这些是实际生成图和实际复核结果，不冒充直接 OpenAI Image API 的模型调用。

| Case | Result | Evidence |
|---|---|---|
| 01 | PARTIAL PASS | 木床、女性、姿态和 3 条鱼成立；背景稻梗与纹理偏密。 |
| 02 | PASS | CLI 输出包含 exactly 12 desks；生成图可见四行三列共 12 张桌子，头套为可穿戴物。 |
| 03 | PARTIAL PASS | 抽象圆、人物、方形和 3 条斜线成立；风格出现过度渐变/体积化，弱于硬边平面目标。 |
| 04 | PASS | 7 只鸟、底部小人物、极大空白和水墨语法成立。 |
| 05 | PARTIAL PASS | 持杯和托脸关系成立；多视角表达存在，但局部视角约束仍不够严格。 |
| 06 | PASS | 报纸脸、撕纸头发、植物包装纸裙、铅笔四肢和纸花均成立。 |
| 07 | PASS | 3×3、9 个重复肖像、中心闭眼与其他睁眼成立。 |
| 08 | PASS | 恰好 6 个机械剖面图，左右各 3 个，人体仍为生物学人体。 |
| 09 | PARTIAL PASS | 管内蜷缩、独立电池、步枪供能和蓝光成立；外部环境仍偏 CG/体积化，语义开放性需要更严格评测。 |

结论：当前 VAST CLI 已经可以真实驱动一组生图测试，但现有 Compiler 仍更像“约束提示生成器”，还不是能保证图片硬约束的 Renderer/Evaluator。数量和结构型 Case 已能通过定向提示修正；多视角、稀疏度、绘画语法和语义开放性仍需要正式 Evaluator 与迭代策略。
