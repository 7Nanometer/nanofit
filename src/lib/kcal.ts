import type { SetEntry, StrengthMetLevel, WorkoutSession } from '../types'
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
