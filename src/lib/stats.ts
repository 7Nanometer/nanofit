import type { BodyMetric, SetEntry, WorkoutSession } from '../types'
import { estimate1RM, sessionVolume, setVolume } from './calc'
import { dateKey, parseDateKey } from './date'
import { sessionKcalSplit } from './kcal'

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

// ---------- 折线图 / 柱状图的纵轴刻度 ----------
//
// 【为什么需要这个函数】
// 不给刻度时，画图库（recharts）自己算出来的间隔会是这种：
//     体脂 20.15 / 19.5 / 18.85 / 18.2 / 17.55   ← 间隔 0.65
//     体重 75.6 / 74.7 / 73.8 / 72.9 / 72         ← 间隔 0.9
// 数本身没错，但一眼读不出"大概多少"，得在脑子里做除法。
//
// 【这个函数怎么做的】
// 一个很经典的算法，三步：
//   1. 先把范围除以份数，得到一个"大概的间隔"（比如 0.9）
//   2. 把这个间隔往上取到最近的"好看数"——1、2、5、10、20、50…
//      （0.9 会变成 1，0.65 会变成 1，13 会变成 20）
//   3. 用这个好看的间隔去铺刻度，并让上下两端都落在整倍数上
// 结果是：不管数据是什么范围，刻度都是 1、2、5 这类整数的倍数。
//
// 【什么是"整数的倍数"】
// 大部分情况下就是整数（17、18、19、20）。
// 数据范围特别小的时候（比如身高一直记 176，上下只差 1 厘米），
// 间隔会落到 0.5 —— 这时如果硬用整数，整个轴只剩两三条刻度，
// 反而看不出变化。0.5 也是"好看数"，照样一眼能读。

// 希望纵轴上大约出现几条刻度。
// 太少（3 条）读不出中间的细节，太多（8 条以上）字会挤成一团。
// 只有这一处能调，不要在各个调用点各写各的 —— 那样早晚会打架。
const TICK_COUNT = 5
export function niceAxis(
  values: number[],
  includeZero = false,
): { domain: [number, number]; ticks: number[] } {
  // 一个数都没有：给个安全的最小范围，免得后面除以 0
  if (values.length === 0) return { domain: [0, 1], ticks: [0, 1] }

  let min = Math.min(...values)
  let max = Math.max(...values)

  // 容量这类"从 0 起才有意义"的指标要含 0。
  // 放在这里处理最省事：min 变成 0 之后，第一步算出的起点自然就是 0。
  if (includeZero) min = Math.min(min, 0)

  // 所有值都一样（例如身高一直记 176）：硬撑开一个范围，
  // 否则这条线会贴着边缘，看不出它其实是平的。
  if (min === max) {
    min -= 1
    max += 1
  }

  const roughStep = (max - min) / TICK_COUNT
  // magnitude 是"数量级"：0.9 的数量级是 0.1，13 的数量级是 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const normalized = roughStep / magnitude
  // 往上取到最近的 1、2、5、10 之一
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  let step = magnitude * factor

  // 【优先用整数间隔】
  // 主人要的是"整数刻度"。上面那套算法偶尔会选出 0.5 这种间隔
  // （体脂 17.9～20 那条本来会被切成 0.5 一格）。
  // 只要数据范围够宽（≥2），就换成 1 —— 那条照样有 17/18/19/20 四条刻度，
  // 读起来反而更顺。
  // 只有范围窄到 2 以内，整条轴会只剩两三条刻度、看不出变化，才保留小数间隔。
  if (step < 1 && max - min >= 2) step = 1

  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let i = 0; ; i++) {
    const value = start + i * step
    if (value > end + step / 1000) break
    // toFixed(6) → Number 是为了消掉小数运算的浮点误差：
    // 不加这一步会冒出 176.00000000000003 这种刻度。
    ticks.push(Number(value.toFixed(6)))
    // 保险：万一 step 小得离谱，别把内存撑爆
    if (ticks.length > 30) break
  }

  return { domain: [Number(start.toFixed(6)), Number(end.toFixed(6))], ticks }
}

// ============================================================
// 有氧
// ============================================================

// 把训练记录分成"只有力量"和"只有有氧"两份。
//
// 【为什么要分】
// 有氧记录的 weightKg 和 reps 都是 0（见 types.ts 的说明）。让它们混进
// 力量统计的话，单动作曲线会冒出一堆 0，周容量图也会被拉平。
//
// 【为什么在这里分一次，而不是在每个统计函数里各判断一次】
// 那样上面那 5 个函数全都得加一个"哪些是有氧"的参数、全都要改签名。
// 在这里分一次，它们一个字都不用动，照常吃"干净的"数据。
export function splitSessions(
  sessions: WorkoutSession[],
  cardioIds: Set<string>,
): { lifting: WorkoutSession[]; cardio: WorkoutSession[] } {
  const pick = (keep: (exerciseId: string) => boolean) =>
    sessions
      .map((s) => ({
        ...s,
        entries: s.entries.filter((e) => keep(e.exerciseId)),
      }))
      // 分完一条不剩的整场直接扔掉。
      // 留着的话，"最近一次"会指向一个只剩 0 的日期，看着莫名其妙。
      .filter((s) => s.entries.length > 0)

  return {
    lifting: pick((id) => !cardioIds.has(id)),
    cardio: pick((id) => cardioIds.has(id)),
  }
}

// 本周有氧一共多少秒。参数是 splitSessions 分出来的那一份。
export function thisWeekCardioSec(cardioSessions: WorkoutSession[]): number {
  const mondayKey = dateKey(mondayOf(new Date()))
  return cardioSessions
    .filter((s) => s.date >= mondayKey)
    .reduce(
      (sum, s) =>
        sum + s.entries.reduce((t, e) => t + (e.durationSec ?? 0), 0),
      0,
    )
}

// 一次有氧 = 图上的一条记录
export type CardioPoint = {
  date: string
  label: string // 横轴上显示的短日期，如 '9/24'
  km: number // 距离，公里，保留两位小数
}

// "单次距离趋势"那张图的数据。
//
// 【为什么只挑填了距离的】
// 跑步机上只看时间不看距离的人，记出来的记录没有距离。
// 硬把它们当成 0 画上去，图上会出现一串莫名其妙的下探到 0 的点 ——
// 那不是"跑了 0 公里"，是"没记距离"。宁可少画几个点。
export function cardioDistanceSeries(
  cardioSessions: WorkoutSession[],
): CardioPoint[] {
  const points: CardioPoint[] = []
  for (const session of cardioSessions) {
    for (const entry of session.entries) {
      if (entry.distanceM === undefined) continue
      points.push({
        date: session.date,
        label: shortLabel(session.date),
        km: Math.round((entry.distanceM / 1000) * 100) / 100,
      })
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ---------- 消耗热量 ----------

export type KcalSplit = {
  strength: number
  cardio: number
  total: number
}

const ZERO_KCAL: KcalSplit = { strength: 0, cardio: 0, total: 0 }

// 某一天（含）以后一共消耗了多少，力量和有氧分开算。
//
// 【为什么要分开】
// 两个数的含义完全不同：力量那边是靠"这次练了多久 + 你自己选的强度档位"
// 推的，有氧那边是靠"动作类型 + 速度"推的。混成一个数字看不出问题在哪。
export function kcalInRange(
  sessions: WorkoutSession[],
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
  fromKey: string,
): KcalSplit {
  let strength = 0
  let cardio = 0
  for (const session of sessions) {
    // 和 weeklyVolumes 一样用字符串比日期：'2026-09-24' 这种写法
    // 按文字比就等于按时间比
    if (session.date < fromKey) continue
    const split = sessionKcalSplit(session, weightKg, cardioIds)
    if (split === null) continue
    strength += split.strength
    cardio += split.cardio
  }
  if (strength === 0 && cardio === 0) return ZERO_KCAL
  return { strength, cardio, total: strength + cardio }
}

// 本月第一天。和 mondayOf 是一个路子，只是按月份归零。
function firstOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// 本周（周一起）消耗了多少
export function thisWeekKcal(
  sessions: WorkoutSession[],
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
): KcalSplit {
  return kcalInRange(sessions, weightKg, cardioIds, dateKey(mondayOf(new Date())))
}

// 本月（1 号起）消耗了多少
export function thisMonthKcal(
  sessions: WorkoutSession[],
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
): KcalSplit {
  return kcalInRange(
    sessions,
    weightKg,
    cardioIds,
    dateKey(firstOfMonth(new Date())),
  )
}

// 每周消耗，给柱状图用。每周两根柱子：力量、有氧。
export type WeeklyKcalPoint = {
  label: string
  strength: number
  cardio: number
}

export function weeklyKcal(
  sessions: WorkoutSession[],
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
  weekCount = 8,
): WeeklyKcalPoint[] {
  const points: WeeklyKcalPoint[] = []
  const monday = mondayOf(new Date())

  for (let i = weekCount - 1; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const startKey = dateKey(start)
    const endKey = dateKey(end)

    let strength = 0
    let cardio = 0
    for (const session of sessions) {
      if (session.date < startKey || session.date > endKey) continue
      const split = sessionKcalSplit(session, weightKg, cardioIds)
      if (split === null) continue
      strength += split.strength
      cardio += split.cardio
    }
    // 抹成整数：这是估算，小数点后几位没有任何意义
    points.push({
      label: shortLabel(startKey),
      strength: Math.round(strength),
      cardio: Math.round(cardio),
    })
  }
  return points
}
