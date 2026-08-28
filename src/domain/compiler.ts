import { grammarFor } from './grammar-budget.js';
import { sanitizeRenderIntent } from './renderer-boundary.js';
import type { RenderIntent, VisualAST } from './types.js';

const describeEntity = (entity: VisualAST['entities'][number], ast: VisualAST): string => {
  const count = entity.count?.expected && entity.count.expected > 1 ? `（${entity.count.expected}个）` : '';
  const grammar = grammarFor(entity.renderingGrammarOverride?.name ?? ast.style.name, entity.renderingGrammarOverride ?? ast.style);
  return `${entity.label ?? entity.type}${count}，${grammar.actions.join('、')}`;
};

export function compileRenderIntent(ast: VisualAST): RenderIntent {
  const lines: string[] = [];
  if (ast.scene.identity) lines.push(`场景：${ast.scene.identity}`);
  if (ast.scene.location) lines.push(`地点：${ast.scene.location}`);
  if (ast.scene.time) lines.push(`时间：${ast.scene.time}`);
  if (ast.scene.environment) lines.push(`环境：${ast.scene.environment}`);
  for (const entity of ast.entities.filter((x) => x.presence !== 'forbidden')) lines.push(describeEntity(entity, ast));
  for (const state of ast.states) lines.push(`${state.subjectId ?? '主体'}处于${state.value}${state.visibleConsequences?.length ? `，可见表现为${state.visibleConsequences.join('、')}` : ''}`);
  for (const relation of ast.relations) lines.push(`${relation.subject}与${relation.object}的关系：${relation.type}`);
  for (const layer of ast.layers) lines.push(`${layer.type}层：${layer.content}`);
  for (const motion of ast.motions) lines.push(`运动：${motion.content}${motion.direction ? `，方向${motion.direction}` : ''}`);
  if (ast.composition.negativeSpace !== undefined) lines.push(`保留约${Math.round(ast.composition.negativeSpace * 100)}%主动负空间，不填充无意义装饰`);
  if (ast.composition.framing) lines.push(`构图：${ast.composition.framing}`);
  if (ast.palette?.length) lines.push(`主色：${ast.palette.join('、')}`);
  lines.push(`绘画语法：${ast.style.actions.join('；')}`);
  const negative = ast.forbiddenEntities.length ? `禁止出现：${ast.forbiddenEntities.map((x) => x.label ?? x.type).join('、')}` : undefined;
  return sanitizeRenderIntent({ kind: 'vast.render-intent', prompt: lines.join('。'), layers: ast.layers.map((x) => ({ id: x.id, role: x.type, content: x.content, instructions: [x.mixingMode ?? '保持层级关系'], opacity: x.opacity })), drawingInstructions: lines, composition: ast.composition, palette: ast.palette, negativePrompt: negative, outputModality: ast.scene.outputModality ?? 'image' });
}
