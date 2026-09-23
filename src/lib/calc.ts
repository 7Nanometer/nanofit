import type { SetEntry, Sex } from '../types'

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

// ============================================================
// 身体数据：BMI 和体脂率
// ============================================================
//
// 【这两个数的公式（主人 2026-09-23 提供）】
//   BMI = 体重(kg) ÷ 身高(m)²      例：60kg、1.65m → 60 ÷ 1.65² ≈ 22.03
//   男性体脂率 = 1.2 × BMI + 0.23 × 年龄 - 16.2
//   女性体脂率 = 1.2 × BMI + 0.23 × 年龄 -  5.4
//
// 【★必须记住的一句话：这是"估算"，不是"测量"】
// 这个公式（1991 年荷兰人 Deurenberg 提出的）的做法是：
// 找来一大群人，量出他们每个人的**真实体脂**，再配上各自的**身高体重年龄性别**，
// 最后拟合出这么一条式子。所以它回答的是：
//   "身高体重年龄性别是这样的人，平均体脂是多少"
// 而不是"你的体脂是多少"。
//
// 误差通常有 ±4～5 个百分点。最要命的一点是：
// **肌肉多的人会被算高** —— 公式只看得见体重，看不见这重量是肌肉还是肥肉。
// 一个 75kg 的肌肉男和一个 75kg 的胖子，它给的答案几乎一样。
//
// 所以界面上永远写着"估算"两个字，绝不假装它是称出来的。
// ============================================================

// 保留一位小数。21.37684… 显示成 21.4，够用且不啰嗦。
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// BMI = 体重(kg) ÷ 身高(m)²
//
// 【它是什么】身体质量指数，只用身高体重就能算的一个粗略指标。
// 【它的毛病】一样分不出肌肉和肥肉：练得壮的运动员 BMI 常被算成"超重"。
// 所以它只能当参考，所以我们才要继续往下算体脂率。
export function bmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100
  return weightKg / (meters * meters)
}

// 由 BMI、年龄、性别估算体脂率（%）
export function estimateBodyFat(
  bmiValue: number,
  age: number,
  sex: Sex,
): number {
  const base = 1.2 * bmiValue + 0.23 * age
  return round1(sex === 'male' ? base - 16.2 : base - 5.4)
}

// 算出"记录的那一天"是几岁。
//
// 【为什么用记录那天，而不是用今天】
// 三个月前记的那一条，应该按三个月前的年龄算才对。
// 而且按记录当天算和按今天算，代码一样简单，没有理由选差的。
//
// 【为什么只精确到年份，不问生日】
// 这里就是两个年份相减。因为公式本身的误差（±4～5 个百分点）
// 远远大于"差一岁"的影响，为了它多问一个生日不值得。
export function ageOn(birthYear: number, date: string): number {
  // date 是 '2026-09-23' 这种格式，前 4 个字符就是年份
  return Number(date.slice(0, 4)) - birthYear
}

// 合理的输入范围。超出这个范围，八成是打错了 ——
// 最常见的就是把身高输成了 1.75（米），那样 BMI 会算出二十多万。
const HEIGHT_CM_RANGE = [100, 250] as const
const WEIGHT_KG_RANGE = [20, 300] as const
const AGE_RANGE = [14, 100] as const

export type BodyComposition = {
  bmi: number // 保留一位小数
  bodyFat: number // 保留一位小数，单位是 %
}

// 把四样东西凑齐 → 算出 BMI 和估算体脂率。
// 缺任何一样、或者数字明显不对，就返回 null，界面上安静地什么都不显示。
//
// 【为什么返回 null，而不是报错、也不是给个 0】
// "算不出来"是这个函数的一种正常结果，不是出了故障。
// 如果返回 0，界面上会出现一个 0% 的假数字，那比不显示更糟。
export function bodyComposition(
  weightKg: number | undefined,
  heightCm: number | undefined,
  birthYear: number | undefined,
  sex: Sex | undefined,
  date: string,
): BodyComposition | null {
  if (weightKg === undefined || heightCm === undefined) return null
  if (birthYear === undefined || sex === undefined) return null
  if (heightCm < HEIGHT_CM_RANGE[0] || heightCm > HEIGHT_CM_RANGE[1]) return null
  if (weightKg < WEIGHT_KG_RANGE[0] || weightKg > WEIGHT_KG_RANGE[1]) return null

  const age = ageOn(birthYear, date)
  if (age < AGE_RANGE[0] || age > AGE_RANGE[1]) return null

  const bmiValue = bmi(weightKg, heightCm)
  const fat = estimateBodyFat(bmiValue, age, sex)
  // 上面的范围已经挡掉了负数，这里是最后一道保险：
  // 宁可"不算"，也不显示一个负的体脂率
  if (fat <= 0) return null

  return { bmi: round1(bmiValue), bodyFat: fat }
}
