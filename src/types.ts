// ============================================================
// 全项目的"字典"
// ============================================================
// 所有数据的"形状"都定义在这一个文件里。
// 其他文件都从这里取用，好处是：想改数据结构，只改这一处，全项目跟着变。
//
// 【为什么这里不用 enum】
// 你装的 TypeScript 6.0 默认开了一个叫 erasableSyntaxOnly 的检查，
// 它不允许用 enum（一种老式的"枚举"写法，用来表示"只能从几个固定选项里选一个"）。
// 所以这里用 "as const 数组 + 派生类型" 这种更现代的替代写法，效果完全一样。
// ============================================================

// ---------- 肌群 ----------

// 六个肌群的"代号"。用英文是因为代号要写进数据里，英文更稳、不会有编码问题。
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
] as const

// 从上面那个数组自动推导出类型：只有这 6 个值之一才算合法。
// 有了它，以后把 'chest' 打成 'cheast' 时编辑器会立刻标红。
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

// 代号 → 中文。界面上给用户看的永远是中文。
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  arms: '手臂',
  core: '核心',
}

// ---------- 动作 ----------

// 一个动作 = 动作库里的一行，比如"杠铃卧推"
export type Exercise = {
  id: string // 身份证号，不重复
  name: string // 中文名，如"杠铃卧推"
  muscleGroup: MuscleGroup // 属于哪个肌群
  equipment: string // 用什么器械，如"杠铃""哑铃""自重"。故意用普通文字而不是固定选项，方便你随便填
  isCustom: boolean // true = 你自己建的，false = 系统预置的 40 个
  note?: string // 问号表示"可以没有"。一句话动作要领
}

// ---------- 一组 ----------

// 你做的"一组"：多重、几次、累不累
export type SetEntry = {
  id: string
  exerciseId: string // 做的是哪个动作
  weightKg: number // 重量。注意：0 是合法的（引体向上、平板支撑就是 0），不代表"没填"
  reps: number // 次数
  rpe?: number // 自感用力程度 1-10，可以有 7.5 这种小数。可以没有
  completedAt: string // 完成时间。存成文字（localStorage 只能存文字）
}

// ---------- 计划项（模板里的一行）----------

// "这次训练打算做：卧推 4 组、每组 8 次"
export type PlannedItem = {
  exerciseId: string
  targetSets: number // 目标组数
  targetReps: number // 目标次数
  targetWeightKg?: number // 可选的预填重量
}

// ---------- 一次训练 ----------

export type WorkoutSession = {
  id: string
  date: string // 形如 '2026-09-23'。★必须是本地日期，不能是国际时间，原因见 lib/date.ts
  name?: string // 名字，通常来自模板，如"推日"
  entries: SetEntry[] // 这次训练做的所有组
  note?: string
  durationSec?: number // 练了多久（秒）
  startedAt?: string // 开始时间，用来算 durationSec
  templateId?: string // 套用的是哪个模板
  plannedItems?: PlannedItem[] // 套用模板后生成的计划清单
}

// ---------- 训练模板 ----------

export type Template = {
  id: string
  name: string // 如"推日"
  items: PlannedItem[] // 数组的先后顺序就是动作的先后顺序
}

// ---------- 身体数据 ----------

// 某一天量的一次数据。date 当身份证号用：一天只有一条
export type BodyMetric = {
  date: string // '2026-09-23'
  weightKg?: number
  heightCm?: number // 2026-09-23 按你的决定加入
  bodyFat?: number // 体脂率，如 18 表示 18%
}

// ---------- 设置 ----------

export type Settings = {
  restSec: number // 组间休息默认多少秒
  rpeEnabled: boolean // 要不要在界面显示 RPE 那一栏
}

// 第一次打开 App 时用的默认设置
export const DEFAULT_SETTINGS: Settings = {
  restSec: 90,
  rpeEnabled: true,
}
