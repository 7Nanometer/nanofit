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

// ---------- 这次训练"开始于哪一刻" ----------
//
// 【为什么单独抽出来】
// 有两个地方要用这个口径，抽成一个函数让它们共用一份定义
// （以后要改口径，只改这一处）：
//   ① 算时长 —— sessionSeconds 的起点
//   ② 历史页排序 —— 同一天有两条记录时，按开始时刻决定谁在上面
//
// 优先用开始时间；老记录没有 startedAt（那时候还没记这个字段），
// 就退回第一组的完成时间。entries 的数组顺序就是记录顺序，
// 所以 [0] 就是最早那条。
//
// 两个都取不到时返回 undefined —— 意思是"没有这个数据"，
// 具体怎么办交给调用方（算时长那边会返回 null，排序那边排到当天最后）。
export function sessionStartISO(session: WorkoutSession): string | undefined {
  return session.startedAt ?? firstCompletedAt(session.entries)
}

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

  // 开始时刻：口径见上面 sessionStartISO()，和排序那边共用同一份定义
  const start = sessionStartISO(session)
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

// ---------- 练完忘了点"结束训练" ----------
//
// 一场训练超过这个时长，就认为不正常 —— 多半是练完直接走了，
// 隔了很久才想起来打开 App 点结束。
//
// 【为什么是 6 小时】
// 力量训练正常也就 1-2 小时，加上热身和组间闲聊，撑死 3 小时。
// 6 小时这个门槛碰不到任何一个真实训练，但一定挡得住"隔了一夜"。
//
// 【★ 为什么按时长判，不按"是不是跨天"判】
// 只看"开始日期是不是今天"会漏掉一种情况：
// 早上 8 点开练、当天晚上 8 点才打开 App —— 开始日期还是今天，
// 但照样会记成 12 小时。按时长判，两种都抓得到。
//
// 【超时了怎么办：不截断，换成"最后一组"当结束】
// 见 TrainScreen 的 completedSession()。这里只负责"判是不是超了"，
// 不负责改数 —— 把一个真实时长硬砍成 6 小时是**编数据**，
// 而"你最后一组记到几点，就算到几点"是有据可查的。
export const SESSION_STALE_MAX_SEC = 6 * 3600

// 这次训练是不是"开始太久了"（多半忘了点结束）。
// nowISO 不传就用此刻。开始时间都取不到（既没 startedAt 也没记录）返回 false。
export function isStaleSession(
  session: WorkoutSession,
  nowISO?: string,
): boolean {
  const start = session.startedAt ?? firstCompletedAt(session.entries)
  if (start === undefined) return false

  const sec = secondsBetween(start, nowISO ?? new Date().toISOString())
  if (sec === null) return false
  return sec > SESSION_STALE_MAX_SEC
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

// 把档位写成给人看的字，如"低强度 3.0"。
//
// 【为什么不只写中文名，也不只写代号】
// 只写"低强度"，用户没法核对自己算的数（公式里用的是 3.0）；
// 只写"low"，那是给电脑看的。两个一起给才既能读又能算。
//
// 【为什么放在这里而不是各个界面各写一份】
// 历史页和选档面板都要用。抄两遍的话，哪天想改说法（比如觉得
// "低强度"不如"轻松"准确）就得记着改两处 —— 一定会漏。
export function metLabel(level: StrengthMetLevel): string {
  const info = STRENGTH_MET_INFO.find((x) => x.key === level)
  return info === undefined ? level : `${info.label} ${info.met.toFixed(1)}`
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

// 抹到最近的 10。**显示热量前一律先过它。**
//
// 因为它本来就是个 ±10~20% 的估算，写成"523 千卡"那种精确感是在骗人。
// 单独抽出来是为了让"总数"和"力量+有氧的拆分"用同一套精度 ——
// 不然会出现"总共约 520，其中力量 188、有氧 330"这种前后对不上的话。
export function roundKcal(kcal: number): number {
  return Math.round(kcal / 10) * 10
}

// 523.4 → "约 520 千卡"
//
// 【不足 10 千卡的情况】
// 只记了一两组就结束训练的话，算出来可能不到 10 千卡。
// 抹到 10 的倍数会得到"约 0 千卡"—— 看着像坏了，也像在说"你没消耗"。
// 所以这种时候直说"不足 10 千卡"，比编一个 0 或 10 都诚实。
export function formatKcal(kcal: number): string {
  const rounded = roundKcal(kcal)
  if (rounded === 0) return '不足 10 千卡'
  return `约 ${rounded} 千卡`
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
  const e = explainSessionKcal(session, weightKg, cardioIds)
  // 一条都算不出来时返回 null，而不是 0 ——
  // "没数据"和"消耗了 0 千卡"是两回事，界面上的处理也完全不同
  return e === null || e.total <= 0 ? null : e.total
}

// 一次训练的热量"是怎么算出来的" —— 给统计页那条可展开的说明用。
//
// 【为什么把它和 sessionKcal 写成同一件事】
// 说明文字必须和实际算出来的数**用的是同一个公式**。
// 界面那边照着重算一遍的话，哪天公式改了，说明就会和数字对不上 ——
// 那种"解释"比不解释更糟：用户会照着一个错的算式去核对，
// 然后怀疑是自己算错了。所以 sessionKcal 现在就是"取这里的 total"，
// 全项目只有这一份算法。
//
// 【它多给了什么】
// 公式用到的每一样输入：哪一档、MET 多少、体重、整场多久、
// 其中有氧多久、力量按多久算。用户拿这些就能自己核对。
export type KcalExplain = {
  level: StrengthMetLevel
  // 老记录没存过档位，用的是"中等"兜底 —— 这个必须让用户知道，
  // 不然他会以为系统当初就是这么判的
  levelIsDefault: boolean
  met: number
  totalSec: number | null // 整场时长（含组间休息）
  cardioSec: number // 其中的有氧时长
  strengthSec: number | null // 力量部分 = 整场 − 有氧
  strengthKcal: number
  cardioKcal: number
  total: number
}

export function explainSessionKcal(
  session: WorkoutSession,
  weightKg: number | undefined,
  cardioIds: ReadonlySet<string>,
): KcalExplain | null {
  if (weightKg === undefined || weightKg <= 0) return null

  const cardioEntries = session.entries.filter((e) =>
    cardioIds.has(e.exerciseId),
  )
  const strengthEntries = session.entries.filter(
    (e) => !cardioIds.has(e.exerciseId),
  )

  const cardioKcal = cardioEntries.reduce(
    (sum, e) => sum + cardioEntryKcal(e, weightKg),
    0,
  )
  const cardioSec = cardioEntries.reduce(
    (sum, e) => sum + (e.durationSec ?? 0),
    0,
  )

  const level = session.metLevel ?? DEFAULT_MET_LEVEL
  const met = metOf(level)

  // 整场时长。有力量记录才算力量那部分 —— 纯有氧场次里
  // 剩下的那几分钟（走回更衣室之类）不该按杠铃训练的强度算。
  const totalSec = sessionSeconds(session)
  let strengthSec: number | null = null
  let strengthKcal = 0
  if (strengthEntries.length > 0) {
    // 减出来是负数说明这次训练的有氧时长记重复了或者记岔了，
    // 按 0 处理，不给一个负的热量
    strengthSec = totalSec === null ? 0 : Math.max(0, totalSec - cardioSec)
    strengthKcal = estimateKcal(met, weightKg, strengthSec)
  }

  return {
    level,
    levelIsDefault: session.metLevel === undefined,
    met,
    totalSec,
    cardioSec,
    strengthSec,
    strengthKcal,
    cardioKcal,
    total: strengthKcal + cardioKcal,
  }
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
  // 走和 sessionKcal 完全相同的那一条路，不自己再算一遍 ——
  // 以前这里把"有氧那部分"的求和抄了第二遍，抄的东西迟早会和原件走偏
  const e = explainSessionKcal(session, weightKg, cardioIds)
  if (e === null || e.total <= 0) return null
  return { strength: e.strengthKcal, cardio: e.cardioKcal, total: e.total }
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
//
// ★ 2026-09-24 补过一批。原来的 14 个里 12 个是杠铃，
//   结果"倒蹬机 90kg×8 练到 RPE 10"这种事系统完全看不见 ——
//   名字里带"杠铃"才认。现在把固定器械/绳索/史密斯里
//   **和那些杠铃动作一一对应**的大重量多关节动作补齐。
//
// 【判断标准】能上大重量的多关节推 / 拉 / 蹲 / 髋铰链动作。
// 【有意不加的，免得以后有人问"这个怎么漏了"】
//   · 单侧单臂变体（单腿腿举、单臂划船、单臂下拉）—— 上不了大重量
//   · 辅助引体向上 —— 那是"借力做引体"的机器，恰恰是**轻**的信号
//   · 握法变体（窄距下拉、反握下拉）—— 父类"高位下拉"已覆盖这个动作模式
//   · 孤立动作（腿屈伸、腿弯举、夹胸、飞鸟、侧平举、弯举、下压、提踵、耸肩）
//   · 史密斯窄距卧推 —— 能上重量，但目标肌是三头，属于手臂的辅助项
const HEAVY_COMPOUND_IDS: ReadonlySet<string> = new Set([
  // ----- 杠铃（原有）-----
  'bb-squat', // 杠铃深蹲
  'bb-front-squat', // 前蹲
  'bb-deadlift', // 硬拉
  'bb-rdl', // 罗马尼亚硬拉
  'bb-sumo-deadlift', // 相扑硬拉
  'bb-trap-bar-deadlift', // 六角杠硬拉
  'bb-bench-press', // 杠铃卧推
  'bb-incline-bench-press', // 上斜杠铃卧推
  'bb-decline-bench-press', // 下斜杠铃卧推
  'bb-overhead-press', // 杠铃肩上推举
  'bb-row', // 杠铃划船
  'bb-hip-thrust', // 臀推
  // ----- 史密斯 / 固定器械（原有 2 个）-----
  'smith-squat', // 史密斯深蹲
  'mach-hack-squat', // 哈克深蹲
  // ----- 2026-09-24 补的：推胸类 -----
  'mach-chest-press', // 器械推胸
  'mach-incline-chest-press', // 上斜器械推胸
  'smith-bench-press', // 史密斯卧推
  'smith-incline-press', // 史密斯上斜卧推
  // ----- 补的：推肩类 -----
  'mach-shoulder-press', // 坐姿推肩机
  'smith-shoulder-press', // 史密斯肩上推举
  // ----- 补的：划船 / 下拉类 -----
  'mach-seated-row', // 器械坐姿划船
  'cable-seated-row', // 坐姿绳索划船
  'mach-high-row', // 器械高位划船
  'cable-lat-pulldown', // 高位下拉
  // ----- 补的：腿 / 臀 -----
  'mach-leg-press', // 腿举（倒蹬）
  'mach-hip-thrust', // 器械臀推
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

// 记了 RPE 的那些组，中间的那个数。一条都没记返回 null。
//
// 【RPE 是什么】Reps In Reserve 的变体叫法，这里就是"这一组你觉得有多难"，
// 1-10 分，10 是"再也做不动了"。它是**用户亲口说的**，
// 比"组间休息多久""练了哪些动作"这两个间接信号准得多。
//
// 【为什么取中位数，不取最大值】
// 热身组的 RPE 常常只有 5-6。取最大值的话，一次训练里只要有一组冲到 10，
// 整场就被判成高强度 —— 哪怕剩下十几组都很轻松。
// 中位数回答的是"这次训练典型有多累"，那才是我们要问的问题。
//
// 【为什么丢掉 0 和负数】
// RPE 是 1-10 的自评，出现 0 或负数说明数据有问题（也可能是手滑输错了），
// 收进来只会把中位数往下拽。小数（7.5）是允许的，所以不能取整。
function medianRpe(entries: SetEntry[]): number | null {
  const values = entries
    .map((e) => e.rpe)
    .filter((v): v is number => v !== undefined && v > 0)
  if (values.length === 0) return null

  values.sort((a, b) => a - b)
  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 1
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2
}

// ---------- 推荐档位用到的几个门槛 ----------
//
// 【为什么都提出来当常量，而不是散在判断里写字面量】
// 这几个数字是**判断标准**，不是随手写的魔数。集中放一处，
// 以后要调（比如觉得 8 分才算高强度太严）只改这里，一眼能看到全貌。
// 注释里的"依据"也才挂得住。

// 组间休息短于这个秒数 → 一组接一组，算循环训练
const LOW_INTENSITY_MAX_REST_SEC = 60

// RPE 到这个分算"很累" → 高强度（10 是再也做不动了）
const RPE_HIGH_MIN = 8

// RPE 到这个分算"有点累" → 中等；低于它算低强度
const RPE_MODERATE_MIN = 6

// "总时长短、组数少"的两个门槛。沾一个就算低强度。
const LOW_INTENSITY_MAX_MIN = 30
const LOW_INTENSITY_MAX_SETS = 8

// 推荐结果：不只有哪一档，还有**为什么**。
//
// 【为什么要把理由一起返回】
// 之前只返回一个档位，用户看到"系统建议：高强度"却不知道为什么，
// 更看不出"我心里想的那一档"和它对不对得上。理由必须跟档位从**同一个
// 函数**里出来 —— 单独再写一个 explain 函数的话，两份判断逻辑一定会走偏，
// 到时候界面上的理由和实际用的档位对不上，比不说还糟。
export type MetRecommendation = {
  level: StrengthMetLevel
  reason: string
}

// 根据这次训练的数据，推荐一个强度档位。
//
// 【判断顺序就是优先级】取第一个命中的那条。
//
// ★ 2026-09-24 改过，改的原因值得记着：
//
// 原来第一优先是"组间休息很短→循环训练"，然后是"有大重量动作→高强度"，
// 最后"时间短或组数少→低强度"。全靠**从数据里猜**。
//
// 结果出了这么一件事：倒蹬机 90kg×8 练到 RPE 10、16 组、42 分钟，
// 系统给的是"中等" —— 因为腿举不在"大重量"名单里（名单当时全是杠铃），
// 而休息/时长两条门槛都没沾上。问题是：
//
//   **用户每组都记了 RPE。RPE 就是他亲口说的"这一组有多难"，
//   而我们放着这个直接证据不用，去猜。**
//
// 所以现在改成：**记了 RPE 就信 RPE**，没记才退回按数据推测。
//
// 注意：调用方应该先确认这次有力量记录，纯有氧的场次用不上这个档位。
export function recommendMetLevel(
  session: WorkoutSession,
  cardioIds: ReadonlySet<string>,
): MetRecommendation {
  const strength = session.entries.filter((e) => !cardioIds.has(e.exerciseId))
  if (strength.length === 0) {
    return { level: DEFAULT_MET_LEVEL, reason: '这次没有力量记录' }
  }

  const rest = medianRestSeconds(strength)
  // 休息中位数 < 60 秒 = 一组接一组，算"循环训练"。
  // rest 为 null 表示压根没有可算的间隔（比如只有一组），那就不算短。
  const shortRestSec = rest !== null && rest < LOW_INTENSITY_MAX_REST_SEC ? rest : null

  // ---------- ① 第一优先：记了 RPE ----------
  const rpe = medianRpe(strength)
  if (rpe !== null) {
    // RPE 可能是 7.5，所以用原样输出，不做取整
    const howHard = `你记的 RPE 中位数是 ${rpe}`

    if (rpe >= RPE_HIGH_MIN) {
      // 又累、休息又短 → 这是循环训练那种持续输出，比单纯"高强度"还高一档
      if (shortRestSec !== null) {
        return {
          level: 'circuit',
          reason: `${howHard}，而且每组之间只隔了约 ${Math.round(shortRestSec)} 秒`,
        }
      }
      return { level: 'high', reason: howHard }
    }
    if (rpe >= RPE_MODERATE_MIN) return { level: 'moderate', reason: howHard }
    return { level: 'low', reason: howHard }
  }

  // ---------- ② 没记 RPE：退回按训练数据推测 ----------
  if (shortRestSec !== null) {
    return {
      level: 'circuit',
      reason: `每组之间只隔了约 ${Math.round(shortRestSec)} 秒`,
    }
  }

  if (strength.some((e) => HEAVY_COMPOUND_IDS.has(e.exerciseId))) {
    return { level: 'high', reason: '这次练了深蹲、推胸这类大重量多关节动作' }
  }

  const sec = sessionSeconds(session)
  const shortTime = sec !== null && sec < LOW_INTENSITY_MAX_MIN * 60
  if (shortTime || strength.length < LOW_INTENSITY_MAX_SETS) {
    return {
      level: 'low',
      reason: shortTime
        ? `这次只练了 ${Math.round(sec / 60)} 分钟`
        : `这次只有 ${strength.length} 组`,
    }
  }

  // ---------- ③ 其余按常规增肌算 ----------
  // 顺便说一句：这条兜底选"中等"而不是别的，理由和 DEFAULT_MET_LEVEL 一样 ——
  // 猜错的代价最小。
  return { level: DEFAULT_MET_LEVEL, reason: '常规增肌的强度' }
}
