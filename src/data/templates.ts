import type { Template } from '../types'

// ============================================================
// 3 个预置训练模板
// ============================================================
//
// 【模板是干什么的】
// 它是一个"训练计划单"。比如"推日"就是：
//   杠铃卧推 4 组 × 8 次
//   上斜哑铃卧推 3 组 × 10 次
//   ...
// 点一下"套用"，这些动作和组数次数就自动填进今天的训练里，
// 你不用每次重新想练什么、也不用一个个手动加动作。
//
// 和 40 个预置动作一样，这 3 个模板也直接写在代码里，不进储物柜。
// 所以它们不能改也不能删 —— 想改成自己的版本，就新建一个自建模板。
//
// 这三个模板是健身房里最常见的"推/拉/腿"三分法：
//   推日：练所有"往外推"的动作（胸、肩、肱三头）
//   拉日：练所有"往回拉"的动作（背、肱二头）
//   腿日：专门练腿
// 这样同一块肌肉之间至少隔两天，恢复得过来。
// ============================================================

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'preset-push',
    name: '推日',
    items: [
      { exerciseId: 'bb-bench-press', targetSets: 4, targetReps: 8 },
      { exerciseId: 'db-incline-press', targetSets: 3, targetReps: 10 },
      { exerciseId: 'bb-overhead-press', targetSets: 3, targetReps: 8 },
      { exerciseId: 'db-lateral-raise', targetSets: 3, targetReps: 12 },
      { exerciseId: 'cable-pushdown', targetSets: 3, targetReps: 12 },
    ],
  },
  {
    id: 'preset-pull',
    name: '拉日',
    items: [
      { exerciseId: 'bb-deadlift', targetSets: 3, targetReps: 5 },
      { exerciseId: 'cable-lat-pulldown', targetSets: 4, targetReps: 10 },
      { exerciseId: 'cable-seated-row', targetSets: 3, targetReps: 10 },
      { exerciseId: 'cable-face-pull', targetSets: 3, targetReps: 15 },
      { exerciseId: 'bb-curl', targetSets: 3, targetReps: 12 },
    ],
  },
  {
    id: 'preset-legs',
    name: '腿日',
    items: [
      { exerciseId: 'bb-squat', targetSets: 4, targetReps: 8 },
      { exerciseId: 'mach-leg-press', targetSets: 3, targetReps: 12 },
      { exerciseId: 'bb-rdl', targetSets: 3, targetReps: 10 },
      { exerciseId: 'mach-leg-extension', targetSets: 3, targetReps: 12 },
      { exerciseId: 'mach-calf-raise', targetSets: 4, targetReps: 15 },
    ],
  },
]

// 把"预置的 3 个"和"你自己建的"拼成一个列表
export function mergeTemplates(custom: Template[]): Template[] {
  return [...PRESET_TEMPLATES, ...custom]
}
