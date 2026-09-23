import type { BodyMetric, SetEntry, WorkoutSession } from '../types'
import { estimate1RM, sessionVolume, setVolume } from './calc'
import { dateKey, parseDateKey } from './date'

// ============================================================
// 把原始记录"算"成图表要用的数据
// ============================================================
//
// 【为什么单独一个文件】
// 统计页要画好几种图，每一种都要先把散落的训练记录"汇总"成一行行数据点。
// 这些计算跟界面没关系，单独放一处，好读也好改。
//
// 这个文件里所有函数都是"纯函数"：给它同样的输入，永远得到同样的输出，
// 不会去读储物柜、也不会改任何东西。所以可以放心调用。
// ============================================================

// ---------- 内部小工具 ----------

// 找出某一天所在那一周的**周一**。
// 中国习惯是"周一是一周的第一天"，所以一周的范围是：周一 ~ 周日。
function mondayOf(date: Date): Date {
  // 先复制一份，免得改坏了传进来的那个日期
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() 的返回值：周日 = 0，周一 = 1，周二 = 2 …… 周六 = 6
  const weekday = d.getDay()
  // 周日要往回退 6 天才是周一，其他日子退 (weekday - 1) 天
  const back = weekday === 0 ? 6 : weekday - 1
  d.setDate(d.getDate() - back)
  return d
}

// 把 '2026-09-23' 变成图表横轴上那个短短的 '9/23'
function shortLabel(dateStr: string): string {
  const d = parseDateKey(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---------- 每周总容量（柱状图用）----------

export type WeekPoint = {
  label: string // 这一周周一的日期，如 '9/22'
  volume: number // 这一周的总容量
}

// 最近 N 周、每周的总容量。默认最近 8 周。
export function weeklyVolumes(
  sessions: WorkoutSession[],
  weekCount = 8,
): WeekPoint[] {
  const thisMonday = mondayOf(new Date())
  const points: WeekPoint[] = []

  // 从最早的那一周开始，一周一周往后算
  for (let i = weekCount - 1; i >= 0; i--) {
    const monday = new Date(thisMonday)
    monday.setDate(monday.getDate() - i * 7)

    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    // 日期写成 'YYYY-MM-DD' 之后，按文字比较的大小顺序 = 按时间比较的大小顺序，
    // 所以可以直接用 >= 和 <= 来判断"这一天在不在这一周里"
    const startKey = dateKey(monday)
    const endKey = dateKey(sunday)

    const volume = sessions
      .filter((s) => s.date >= startKey && s.date <= endKey)
      .reduce((sum, s) => sum + sessionVolume(s.entries), 0)

    points.push({
      label: `${monday.getMonth() + 1}/${monday.getDate()}`,
      volume,
    })
  }

  return points
}

// ---------- 单个动作的变化趋势（折线图用）----------

export type ExercisePoint = {
  date: string // 完整日期，用来排序和当 key
  label: string // 横轴上显示的短日期，如 '9/23'
  maxWeight: number // 这一天这个动作用过的最大重量
  volume: number // 这一天这个动作的总容量
  best1RM: number // 这一天这个动作最好的估算 1RM
}

// 把"某个动作"在所有训练里的表现，按天汇总成一条时间线
export function exerciseSeries(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExercisePoint[] {
  // 先按日期把这个动作的所有组归拢到一起
  const byDate = new Map<string, SetEntry[]>()

  for (const session of sessions) {
    const sets = session.entries.filter((e) => e.exerciseId === exerciseId)
    if (sets.length === 0) continue // 这次训练没练这个动作，跳过
    const list = byDate.get(session.date) ?? []
    list.push(...sets)
    byDate.set(session.date, list)
  }

  const points: ExercisePoint[] = []
  for (const [date, sets] of byDate) {
    const maxWeight = Math.max(...sets.map((s) => s.weightKg))
    const volume = sets.reduce((sum, s) => sum + setVolume(s), 0)
    const best1RM = Math.max(
      ...sets.map((s) => estimate1RM(s.weightKg, s.reps)),
    )

    points.push({
      date,
      label: shortLabel(date),
      maxWeight,
      volume,
      // 保留一位小数，免得图上显示 101.33333333 这种
      best1RM: Math.round(best1RM * 10) / 10,
    })
  }

  // 按日期从早到晚排：图表的左边是过去，右边是现在，一眼看出进步
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ---------- 身体数据趋势（折线图用）----------

export type BodyPoint = {
  date: string
  label: string
  weight?: number
  height?: number
  bodyFat?: number
}

export function bodySeries(metrics: BodyMetric[]): BodyPoint[] {
  return [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      date: m.date,
      label: shortLabel(m.date),
      weight: m.weightKg,
      height: m.heightCm,
      bodyFat: m.bodyFat,
    }))
}

// ---------- 顶部那几个大数字 ----------

// 本周（从周一算起）的总容量
export function thisWeekVolume(sessions: WorkoutSession[]): number {
  const mondayKey = dateKey(mondayOf(new Date()))
  return sessions
    .filter((s) => s.date >= mondayKey)
    .reduce((sum, s) => sum + sessionVolume(s.entries), 0)
}

// 本周练了几次
export function thisWeekCount(sessions: WorkoutSession[]): number {
  const mondayKey = dateKey(mondayOf(new Date()))
  return sessions.filter((s) => s.date >= mondayKey).length
}

// 最近一次训练的日期（没有记录时返回空字符串）
export function lastSessionDate(sessions: WorkoutSession[]): string {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const last = sorted[0]
  return last === undefined ? '' : last.date
}

// 最近一次训练的总容量
export function lastSessionVolume(sessions: WorkoutSession[]): number {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))
  const last = sorted[0]
  return last === undefined ? 0 : sessionVolume(last.entries)
}

// ---------- 给统计页那个下拉框用 ----------

// 历史里"真正练过"的动作 id 列表。
// 注意不是把 40 个动作都列出来 —— 没练过的动作放进去，选出来会是一张空图。
export function usedExerciseIds(sessions: WorkoutSession[]): string[] {
  const ids = new Set<string>()
  for (const session of sessions) {
    for (const entry of session.entries) ids.add(entry.exerciseId)
  }
  return [...ids]
}
