# VAST 2.0.2 real-image review

日期：2026-08-28

这次使用的是 Codex 当前界面的内置 `image_gen` 授权，不需要 `OPENAI_API_KEY`。用户要求的是 `gpt-image-2`；但内置工具不会向 workspace 暴露实际 provider/model 名称，因此本报告不把它冒充成直接 OpenAI Image API 的 `gpt-image-2` 调用。

每张图都在生成后实际打开检查，检查实体、数量、身份、姿态、关系、构图、负空间、风格和禁止元素。完整机器可读结果在 [evaluation.json](evaluation.json)。

## 首轮结果

| Case | 结果 | 关键观察 |
|---|---|---|
| 01 | PARTIAL PASS | 木床、直立姿势、双手在膝上成立；背景稻梗/纹理偏密。 |
| 02 | FAIL | 只有 9 张桌子，未满足 exactly 12。 |
| 03 | PASS | 抽象圆、方形、3 条斜线、奔跑人物和构成主义语法成立。 |
| 04 | PASS | 7 只鸟、超过 75% 空白、底部小人物和水墨语法成立。 |
| 05 | PARTIAL PASS | 姿势关系和立体主义成立，但局部多视角没有全部严格可辨。 |
| 06 | PASS | 四种材料和一朵纸花的异质语法成立。 |
| 07 | PASS | 3×3、9 个肖像、中心闭眼控制变体成立。 |
| 08 | FAIL | 产生 7 个机械图，而不是 exactly 6。 |
| 09 | PARTIAL PASS | 管内蜷缩、步枪/电池蓝光成立；风格偏体积化，电池与步枪融合。 |

## 定向修正版

- [case-02-revision.png](case-02-revision.png)：四行三列，12 张桌子，数量约束修正为 PASS。
- [case-08-revision.png](case-08-revision.png)：左右各三张机械图，共 6 张，数量和指向关系修正为 PASS。

这证明了当前编译器的结构约束可以指导定向重生成，但也显示仅靠一次提示词不能保证所有视觉约束。下一步若要做正式自动化，需要把这些人工判断替换为真实图像 Evaluator，并保留人工复核作为高风险 Case 的第二道门。
