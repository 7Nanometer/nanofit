import type {
  BodyMetric,
  SetEntry,
  Settings,
  StrengthMetLevel,
  WorkoutSession,
} from '../types'
import { RUNNING_IDS } from '../data/exercises'
import { secondsBetween } from './date'

// ============================================================
// 消耗热量估算
// ============================================================
//
// 【★ 第一件必须说清楚的事：这是估算，不是测量】
//
// 力量训练没有任何办法直接测出消耗了多少热量。能做的只有：
// 查一张国际通用的"运动能量消耗表"（Compendium），看看"这种强度
// 的运动，身体在使劲的倍数是多少"，再乘上体重和时间推出来。
//
// 这张表是拿真人戴呼吸面罩实测出来的，但实测本身的偏差就有 10–20%。
// 手环和健身器械上显示的卡路里同样是估算，一样不准，而且各家算法
// 还都不一样 —— 所以**对不上是正常的，不是谁坏了**。
//
// 界面上永远写"约 XXX 千卡"，绝不写"消耗 523 千卡"。
// 那多出来的 3 千卡是假的精确感，会让人以为这数很可信。
//
// 【这个文件里全是纯函数】
// 给它同样的输入，永远得到同样的输出，不读储物柜、不改任何东西。
// ============================================================

// ---------- 一次训练练了多久 ----------
//
// 优先用记录里存下来的 durationSec；老记录没有这个字段，就现算一个。
//
// 【老记录怎么现算】
// 从 startedAt 算到**最后一组记完的那一刻**。
// 注意这比真实时长略短一点（最后一组完了之后你可能还磨蹭了一会儿），
// 但比"算不出来"强，而且不会跑偏到离谱。
//
// 【endISO 是干什么的】
// "结束训练"那一刻和"最后一组记完"不是一个时刻。点结束训练时把
// 当前时刻传进来，就能拿到真正的整场时长；不传就用最后一组的完成时间。
//
// 算不出来（没开始时间、时间格式坏了、算出来是负数）返回 null。
// 返回 null 表示"没有这个数据"，绝不用 0 顶替 —— 0 是"练了 0 秒"，
// 那是另一个意思，而且会让热量算出个假的 0。
export function sessionSeconds(
  session: WorkoutSession,
  endISO?: string,
): number | null {
  if (session.durationSec !== undefined && session.durationSec > 0) {
    return session.durationSec
  }

  // 开始时刻：优先 startedAt；没有就退回第一组的完成时间。
  // entries 的数组顺序就是记录顺序，所以 [0] 就是最早那条。
  const start = session.startedAt ?? firstCompletedAt(session.entries)
  // 结束时刻：调用方给的；没给就用最后一组。
  const end = endISO ?? lastCompletedAt(session.entries)
  if (start === undefined || end === undefined) return null

  const sec = secondsBetween(start, end)
  // 负数说明手机时间被改过之类的，宁可不写也不写个负的
  if (sec === null || sec <= 0) return null
  return Math.round(sec)
}

function firstCompletedAt(entries: SetEntry[]): string | undefined {
  return entries[0]?.completedAt
}

function lastCompletedAt(entries: SetEntry[]): string | undefined {
  return entries[entries.length - 1]?.completedAt
}

// ---------- 力量档位 ----------
//
// 四档，MET 值来自 Compendium 官方表里"抗阻训练"那几行。
// MET 的意思是"这段时间里身体在使劲的倍数"：
// MET 3.5 就是"比躺着不动多烧 3.5 倍"。
export type MetLevelInfo = {
  key: StrengthMetLevel
  met: number
  label: string
  hint: string
}

export const STRENGTH_MET_INFO: readonly MetLevelInfo[] = [
  { key: 'low', met: 3.0, label: '低强度', hint: '轻重量、组间休息长' },
  {
    key: 'moderate',
    met: 3.5,
    label: '中等',
    hint: '常规增肌，8-15 次/组，休息 60-90 秒',
  },
  {
    key: 'high',
    met: 6.0,
    label: '高强度',
    hint: '复合大重量（深蹲/硬拉/卧推），接近力竭',
  },
  { key: 'circuit', met: 8.0, label: '循环训练', hint: '短休息、多器械轮换、超级组' },
]

export function metOf(level: StrengthMetLevel): number {
  return STRENGTH_MET_INFO.find((x) => x.key === level)?.met ?? 3.5
}

// 老记录没有 metLevel 字段时用哪一档。
// 选"中等"是因为它是最常见的那种训练强度，猜错的代价最小。
export const DEFAULT_MET_LEVEL: StrengthMetLevel = 'moderate'

// ---------- 有氧动作的 MET ----------
//
// 这些动作用的都是固定值，因为它们的强度不跟速度走
// （椭圆机蹬快蹬慢差别没那么大）。
//
// 跑步不在这张表里 —— 它的强度跟速度强相关，单独用下面那张跑步表。
const CARDIO_METS: Record<string, number> = {
  'cardio-elliptical': 5.0, // 椭圆机
  'cardio-spin-bike': 7.0, // 动感单车（骑行中等强度）
  'cardio-rower': 7.0, // 划船机
  'cardio-recumbent-bike': 5.0, // 卧式健身车（比立式骑行轻松）
  'cardio-stair-climber': 9.0, // 楼梯机
  'cardio-air-bike': 10.0, // 风阻单车（手脚并用，很累）
  'cardio-jump-rope': 12.0, // 跳绳
  'cardio-jumping-jack': 8.0, // 开合跳
  'cardio-high-knees': 8.0, // 高抬腿
}

// ---------- 跑步：按速度查表 ----------
//
// 【为什么要有下面两档低速】
// 只列 8/10/12 km/h 的话，一个 5 km/h 的快走会被按"最慢的跑"算，
// 热量虚高到离谱。这两档就是给"走路和很慢的跑"兜底的。
//
// 【为什么用插值而不是就近取档】
// 就近取档会让 7.9 km/h 和 8.1 km/h 算出来差一大截，看着莫名其妙的。
// 中间的值按直线插进去，曲线是连续的，不会跳。
//
// 超过 12 km/h 的一律按 11.8 算（会偏低一点）。
// 这是"宁可保守"的选择 —— 估算本来就不该往高了吹。
const RUN_MET_TABLE: readonly { kmh: number; met: number }[] = [
  { kmh: 5.0, met: 3.5 }, // 快走
  { kmh: 6.4, met: 6.0 }, // 慢跑
  { kmh: 8.0, met: 8.3 },
  { kmh: 10.0, met: 9.8 },
  { kmh: 12.0, met: 11.8 },
]

// 没填距离、也没填配速时，按"慢跑"估。
// 界面上要标一句"按慢跑估的"，提醒填了距离会更准。
export const FALLBACK_RUN_MET = 8.3

// 速度（公里/小时）→ MET
export function metForSpeed(kmh: number): number {
  const first = RUN_MET_TABLE[0]
  const last = RUN_MET_TABLE[RUN_MET_TABLE.length - 1]
  if (kmh <= first.kmh) return first.met
  if (kmh >= last.kmh) return last.met

  for (let i = 0; i < RUN_MET_TABLE.length - 1; i++) {
    const a = RUN_MET_TABLE[i]
    const b = RUN_MET_TABLE[i + 1]
    if (kmh <= b.kmh) {
      // 在 a 和 b 之间按比例插一个值。t 是"离 a 有多近"，0 到 1 之间。
      const t = (kmh - a.kmh) / (b.kmh - a.kmh)
      return a.met + t * (b.met - a.met)
    }
  }
  return last.met
}

// 配速（每公里多少秒）→ 速度（公里/小时）
export function speedFromPace(paceSecPerKm: number): number {
  if (paceSecPerKm <= 0) return 0
  return 3600 / paceSecPerKm
}

// 这个有氧动作的 MET 是多少。算不出来返回 null。
export function metForCardio(
  exerciseId: string,
  durationSec: number | undefined,
  distanceM: number | undefined,
): number | null {
  // 跑步类：能算出速度就按速度查表，算不出来就按慢跑兜底
  if (RUNNING_IDS.has(exerciseId)) {
    if (
      durationSec !== undefined &&
      durationSec > 0 &&
      distanceM !== undefined &&
      distanceM > 0
    ) {
      const hours = durationSec / 3600
      return metForSpeed(distanceM / 1000 / hours)
    }
    return FALLBACK_RUN_MET
  }
  return CARDIO_METS[exerciseId] ?? null
}

// ---------- 公式本体 ----------

// 消耗 = (MET − 1) × 体重(kg) × 时长(小时)
//
// 【为什么要减 1】
// MET 里已经含了"躺着不动也要烧的那部分"（基础代谢）。
// 减掉它，剩下的才是"这次运动**额外**多消耗的"。
//
// ★ 界面上必须解释这一点，不然拿它跟手环对数字（手环常给总消耗，
//   比这个数大一截）会以为哪里算错了。
export function estimateKcal(
  met: number,
  weightKg: number,
  seconds: number,
): number {
  return (met - 1) * weightKg * (seconds / 3600)
}

// 523.4 → "约 520 千卡"
//
// 一律抹到最近的 10。因为它本来就是个 ±10~20% 的估算，
// 写成"523 千卡"那种精确感是在骗人。
export function formatKcal(kcal: number): string {
  return `约 ${Math.round(kcal / 10) * 10} 千卡`
}

// ---------- 体重从哪来 ----------

// BodyMetric 里最近一次记过的体重。
// 注意要 filter 掉"只记了身高体脂、没记体重"的那些天。
export function latestWeightKg(metrics: BodyMetric[]): number | undefined {
  const withWeight = metrics
    .filter((m) => m.weightKg !== undefined && m.weightKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  return withWeight[0]?.weightKg
}

// 算热量用的体重。优先用「身体数据」里最近一次，
// 没记过才用设置里那个默认体重。两个都没有就返回 undefined = 算不了。
export function resolveWeightKg(
  metrics: BodyMetric[],
  settings: Settings,
): number | undefined {
  const latest = latestWeightKg(metrics)
  if (latest !== undefined) return latest
  const fallback = settings.defaultWeightKg
  return fallback !== undefined && fallback > 0 ? fallback : undefined
}

// ---------- 一次训练消耗多少 ----------

// 一条有氧记录的消耗。
// 手动抄的优先 —— 器械上那个数至少是它自己按你的体重算的，
// 比我们拿通用表估的要贴近现场。
function cardioEntryKcal(entry: SetEntry, weightKg: number): number {
  if (entry.kcal !== undefined && entry.kcal > 0) return entry.kcal
  const met = metForCardio(entry.exerciseId, entry.durationSec, entry.distanceM)
  if (met === null) return 0
  return estimateKcal(met, weightKg, entry.durationSec ?? 0)
}

// 一次训练总共消耗多少千卡（估算）。算不出来返回 null。
//
// 【混合训练怎么不重复计算】
// 一次训练里既有力量又有有氧时（练完器械去跑步很常见），
// session.durationSec 是**整场**的时长，里面已经包含了跑步那段时间。
// 直接拿它乘力量档位，等于把跑步算了两遍。
// 所以：力量部分 = 整场时长 − 有氧总时长。
//
// 【纯有氧时不掺力量】
// 一次训练里一条力量记录都没有的话，剩下的那几分钟（走回更衣室之类）
// 不该按杠铃训练的强度算，所以力量部分直接是 0。
export function sessionKcal(
  session: WorkoutSession,
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
): number | null {
  if (weightKg === undefined || weightKg <= 0) return null

  const cardioEntries = session.entries.filter((e) =>
    cardioIds.has(e.exerciseId),
  )
  const strengthEntries = session.entries.filter(
    (e) => !cardioIds.has(e.exerciseId),
  )

  const cardioKcalTotal = cardioEntries.reduce(
    (sum, e) => sum + cardioEntryKcal(e, weightKg),
    0,
  )

  let strengthKcalTotal = 0
  if (strengthEntries.length > 0) {
    const totalSec = sessionSeconds(session)
    const cardioSec = cardioEntries.reduce(
      (sum, e) => sum + (e.durationSec ?? 0),
      0,
    )
    // 减出来是负数说明这次训练的有氧时长记重复了或者记岔了，
    // 按 0 处理，不给一个负的热量
    const strengthSec = totalSec === null ? 0 : Math.max(0, totalSec - cardioSec)
    strengthKcalTotal = estimateKcal(
      metOf(session.metLevel ?? DEFAULT_MET_LEVEL),
      weightKg,
      strengthSec,
    )
  }

  const total = strengthKcalTotal + cardioKcalTotal
  // 一条都算不出来时返回 null，而不是 0 ——
  // "没数据"和"消耗了 0 千卡"是两回事，界面上的处理也完全不同
  return total > 0 ? total : null
}

// 把一次训练的消耗拆成"力量"和"有氧"两半，统计页要分开显示。
export type SessionKcalSplit = {
  strength: number
  cardio: number
  total: number
}

export function sessionKcalSplit(
  session: WorkoutSession,
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
): SessionKcalSplit | null {
  const total = sessionKcal(session, weightKg, cardioIds)
  if (total === null || weightKg === undefined) return null

  const cardio = session.entries
    .filter((e) => cardioIds.has(e.exerciseId))
    .reduce((sum, e) => sum + cardioEntryKcal(e, weightKg), 0)

  return { strength: total - cardio, cardio, total }
}

// ---------- 该推荐哪一档 ----------

// "大重量复合动作"的清单。
//
// 【它干什么用】训练里只要出现了其中任何一个，就认为这次练得够重，
// 推荐"高强度"那一档。
//
// 【为什么是写死 id 而不是看重量】
// 看重量更准，但前提是知道用户的体重和实力 —— 80kg 对新手是极限，
// 对老手是热身。写死动作名是"保守但不会大错"的做法。
const HEAVY_COMPOUND_IDS: ReadonlySet<string> = new Set([
  'bb-squat',
  'bb-front-squat',
  'smith-squat',
  'mach-hack-squat',
  'bb-deadlift',
  'bb-rdl',
  'bb-sumo-deadlift',
  'bb-trap-bar-deadlift',
  'bb-bench-press',
  'bb-incline-bench-press',
  'bb-decline-bench-press',
  'bb-overhead-press',
  'bb-row',
  'bb-hip-thrust',
])

// 相邻两组的间隔，取**中位数**（秒）。算不出来返回 null。
//
// 【为什么是中位数，不是平均数】
// 中间接个电话、或者去趟洗手间，那一次的间隔可能是好几分钟。
// 平均数会被这一个异常值整个带偏（比如本来 50 秒，被一次 10 分钟
// 拉成 3 分钟）；中位数是"排在正中间的那一个"，不受极端值影响。
//
// 【这个数是近似值，得说清楚】
// completedAt 记的是"这一组**记完**的时刻"，所以两次记完之间的间隔
// 实际上是"休息时间 + 做下一组的时间"，比纯休息略长。
// 系统里没有"这一组什么时候开始做的"，所以只能这样近似。
function medianRestSeconds(entries: SetEntry[]): number | null {
  const gaps: number[] = []
  for (let i = 1; i < entries.length; i++) {
    const gap = secondsBetween(entries[i - 1].completedAt, entries[i].completedAt)
    // 只收正的间隔。负数说明时间对不上（改过手机时间之类），丢掉。
    if (gap !== null && gap > 0) gaps.push(gap)
  }
  if (gaps.length === 0) return null

  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  // 偶数个时取中间两个的平均，这是中位数的标准算法
  return gaps.length % 2 === 1 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
}

// "总时长短、组数少"的两个门槛。沾一个就算低强度。
const LOW_INTENSITY_MAX_MIN = 30
const LOW_INTENSITY_MAX_SETS = 8

// 根据这次训练的数据，推荐一个强度档位。
//
// 【判断顺序就是优先级】取第一个命中的那条。
// 所以"组间休息很短"排在"有大重量"前面 —— 一组接一组地练，
// 哪怕里面有大重量，整体也更接近循环训练那种持续输出的感觉。
//
// 注意：调用方应该先确认这次有力量记录，纯有氧的场次用不上这个档位。
export function recommendMetLevel(
  session: WorkoutSession,
  cardioIds: ReadonlySet<string>,
): StrengthMetLevel {
  const strength = session.entries.filter((e) => !cardioIds.has(e.exerciseId))
  if (strength.length === 0) return DEFAULT_MET_LEVEL

  // ① 组间休息普遍很短 → 循环训练
  const rest = medianRestSeconds(strength)
  if (rest !== null && rest < 60) return 'circuit'

  // ② 练了大重量复合动作 → 高强度
  if (strength.some((e) => HEAVY_COMPOUND_IDS.has(e.exerciseId))) return 'high'

  // ③ 时间短或组数少 → 低强度
  const sec = sessionSeconds(session)
  if ((sec !== null && sec < LOW_INTENSITY_MAX_MIN * 60) || strength.length < LOW_INTENSITY_MAX_SETS) {
    return 'low'
  }

  // ④ 其余按常规增肌算
  return DEFAULT_MET_LEVEL
}
