import type { SetEntry } from '../types'

// ============================================================
// 计算公式（公式来自 CLAUDE.md，是定好的）
// ============================================================

// 容量 = 重量 × 次数
//
// 【容量是什么】
// 衡量"这一组总共搬动了多少重量"的指标。
// 例：80 公斤做了 8 次 = 640 公斤的容量。
// 它是比"重量"更能反映训练总量的数字：
// 你今天用 100 公斤做 1 次，和用 50 公斤做 10 次，容量完全不同。
export function setVolume(set: SetEntry): number {
  return set.weightKg * set.reps
}

// 算出某次训练的总容量（把每一组的容量全加起来）
//
// reduce 的解释：它像一个"滚雪球"的动作。
// sum 是滚到现在的雪球，s 是下一个要滚上去的数据。
// 从 0 开始，每碰到一组就把它的容量加进去。
export function sessionVolume(entries: SetEntry[]): number {
  return entries.reduce((sum, s) => sum + setVolume(s), 0)
}

// 估算 1RM = 重量 × (1 + 次数 / 30)
//
// 1RM 的意思是"你拼尽全力只能举起一次的那个最大重量"。
// 这个公式（叫 Epley 公式）用你实际做的一组来反推它。
// 例：80 公斤做了 8 次 → 80 × (1 + 8/30) ≈ 101.3 公斤。
//
// 【为什么需要它】
// 你平时练 8 次和练 3 次用的重量不一样，这两种成绩没法直接比。
// 统统换算成 1RM 之后，不同次数的进步就能放在同一张图里比较了。
//
// 【提醒】做的次数越多，这个估算就越不准（做 20 次反推出来的数字会明显偏大）。
// 所以它的参考价值主要体现在 12 次以内。
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg
  return weightKg * (1 + reps / 30)
}

// 把输入框里的文字转成数字。
//
// 【为什么需要这个转换】
// 用户打字过程中，输入框里是文字。三种情况要分清楚：
//   ''     → null，表示"根本没填"
//   '0'    → 0，表示"真的是零负重"（引体向上、平板支撑就是这样）
//   其它   → 对应的数字
//
// 把 null 和 0 混为一谈，会导致引体向上这类动作没法记录。
export function textToNumber(text: string): number | null {
  const t = text.trim()
  if (t === '') return null
  const n = Number(t)
  // 如果转出来不是个有效数字（比如只打了一个"."），也当成没填
  return Number.isNaN(n) ? null : n
}
