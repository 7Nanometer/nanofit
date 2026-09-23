// ============================================================
// 所有跟"储物柜"打交道的代码，都写在这一个文件里
// ============================================================
//
// 【localStorage 是什么】
// 浏览器自带的一个"储物柜"，按网址分开存放，别人看不到。
// 存进去的东西：关掉浏览器还在，关机重启还在。
// 会丢的情况：你主动清缓存、手机存储极端满、iPhone 上超过 7 天没打开过这个网站。
// 所以"每周导出一次备份"很重要。
//
// 【为什么全项目只在这一个文件里碰它】
// 这是最容易出问题的地方（存储满、被禁用、数据损坏）。
// 集中在一处，将来出问题你只需要查这一个文件，不用满项目乱找。
//
// ------------------------------------------------------------
// 2026-09-23 加的：打包成安卓 App 之后，存储换了个地方
// ------------------------------------------------------------
//
// 【为什么要换】
// 原来不管网页还是手机，数据都存在浏览器的 localStorage 里。
// 套上安卓壳之后，localStorage 变成 WebView（壳里那个浏览器内核）的地盘：
//   · 它是"网页缓存"的一部分，用户在系统设置里一清 App 数据就没
//   · 享受不到安卓对 App 私有数据的那些保护（比如系统级自动备份）
// 所以安卓端改成写进 Capacitor 的 Preferences ——
// 它落到 /data/data/<包名>/shared_prefs/ 里的一个 XML 文件，
// 是安卓认可的"App 自己的数据"，比 WebView 的存储稳当。
//
// 【★关键设计：内存快照（cache）】
// 麻烦在哪：Preferences 是**异步**的（读写都要 await），localStorage 是同步的。
// 而全项目有 15 处地方在"打开页面的一瞬间"同步读数据，长这样：
//     const [sessions] = useState<WorkoutSession[]>(readSessions)
// 如果读函数改成异步，这 15 处全得改成
// "先给个空值 → useEffect 去读 → 读回来再重画"，7 个页面都要加"加载中"。
// 那属于改业务逻辑，不是打包适配。
//
// 换的做法：**App 启动时把全部数据一次性读进内存**（就是下面那个 cache）。
// 之后：
//   · 读 = 读内存 → 还是同步的，函数签名一个字没变，那 15 处一行都不用改
//   · 写 = 先改内存（界面立刻就是对的），再异步落盘（真正写进硬盘）
// App 启动时多等几十毫秒（读 7 个格子），用户察觉不到。
//
// 【代价，说清楚】
//   网页版：写是同步的，能如实返回"成功/失败"，红字提示照旧准确。
//   安卓版：写是异步的，当场拿不到结果，所以 write() 返回的其实是
//          "内存改成功了"。真正的落盘失败在下面 persist() 里单独处理：
//          重试一次，再失败就直接弹窗。**不偷偷吞掉错误。**
//
// 【为什么不干脆两边都用 Preferences 插件】
// 它的网页实现内部虽然就是 localStorage，但会**给 key 加前缀**
// （源码里写死 `CapacitorStorage.`），于是你现在存在手机上的
// nanofit:v1:xxx 会全部"找不到"，看起来像数据全丢了。
// 所以网页端绕开插件、直接用原生 localStorage：key 不变，老数据原封不动。
//
// 判断依据：@capacitor/preferences 8.0.1 的 dist/esm/web.js 里
//     get impl() { return window.localStorage }
//     get prefix() { return this.group === 'NativeStorage' ? '' : `${this.group}.` }
// ============================================================

import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { DEFAULT_SETTINGS } from '../types'
import type {
  BodyMetric,
  Exercise,
  Settings,
  Template,
  WorkoutSession,
} from '../types'

// 现在是不是跑在安卓（或 iOS）的原生壳里。
// 在浏览器里打开时这里是 false —— 所以网页版永远走 localStorage 那条路，
// 一点都不会碰到 Preferences 插件。
const isNative = Capacitor.isNativePlatform()

// ---------- 储物柜的格子名 ----------
//
// 统一用 nanofit:v1: 开头，有两个好处：
//   1. 一眼就能看出哪些数据是这个 App 存的，不会跟同一个网址下别的东西搞混
//   2. v1 表示"第 1 版数据结构"。将来万一要大改，可以换成 v2，新旧数据互不干扰
//
// 分成 7 个格子而不是全塞进一个大格子，好处是：
//   记一次训练只需要改写"训练记录"那一格，不用把动作库也重写一遍。
export const KEYS = {
  settings: 'nanofit:v1:settings', // 休息秒数、要不要显示 RPE、外观、个人资料
  customExercises: 'nanofit:v1:exercises', // 只存你自己建的动作（预置的 40 个在代码里，不进这里）
  sessions: 'nanofit:v1:sessions', // 所有训练记录
  templates: 'nanofit:v1:templates', // 训练模板
  bodyMetrics: 'nanofit:v1:body-metrics', // 身高、体重、体脂
  activeWorkout: 'nanofit:v1:active-workout', // 正在进行、还没结束的那次训练
  beforeImport: 'nanofit:v1:before-import', // 导入备份之前，先偷偷把现状存一份
} as const

// ---------- 内存快照 ----------
//
// 键是格子名，值是那一格里存的**原始文字**（JSON 字符串），
// 故意不提前解析成对象 —— 解析放在 read() 里做，和以前的逻辑一模一样。
const cache: Record<string, string | null> = {}

// 启动时读盘有没有出岔子。
// 出了岔子就**禁止写入** —— 因为这时内存里是空的，
// 再写下去等于拿空数据把硬盘上的真数据盖掉，那才是真的丢数据。
let writable = false

// ---------- 启动：把全部数据一次性读进内存 ----------
//
// 由 src/main.tsx 在画界面之前调用，必须 await 完才能渲染。
export async function initStorage(): Promise<void> {
  const allKeys: string[] = Object.values(KEYS)
  try {
    if (isNative) {
      // 安卓端：一次并发问完 7 个格子，比一个一个问快
      const pairs = await Promise.all(
        allKeys.map((key) => Preferences.get({ key })),
      )
      allKeys.forEach((key, i) => {
        cache[key] = pairs[i].value
      })
    } else {
      for (const key of allKeys) {
        cache[key] = localStorage.getItem(key)
      }
    }
    writable = true
  } catch {
    // 读盘失败：内存里的东西是残缺的，绝不能拿它去覆盖硬盘。
    // 界面会因为我不到数据而显示成"空的"，同时由于 writable 是 false，
    // 任何保存都会返回失败 → 亮红字提示。用户至少知道"现在存不进去"，
    // 而不是以为存好了、其实硬盘上被清空。
    writable = false
  }
}

// ---------- 两个通用工具：读一格、写一格 ----------

// 读。
// 如果格子里是空的，或者里面的东西已经损坏（不是合法格式），
// 就返回你给的默认值 —— 绝不让整个页面因为读不到数据而白屏。
function read<T>(key: string, fallback: T): T {
  const raw = cache[key]
  if (raw === null || raw === undefined) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    // 格子里的内容坏了，解析不出来。当成"没有数据"处理，保证 App 还能打开。
    return fallback
  }
}

// 写。返回 true 表示写成功，false 表示写失败。
// 失败最常见的原因是手机存储满了。这时必须让界面提醒用户，
// 而不是偷偷吞掉错误 —— 那才是真的会丢数据。
//
// 注意安卓端的返回含义有所不同，见本文件顶部「代价」那一段。
function write(key: string, value: unknown): boolean {
  // 启动时读盘失败 → 拒绝写入。
  // 这时内存里是空的，写下去会把硬盘上的真数据盖掉。
  if (!writable) return false

  let text: string
  try {
    text = JSON.stringify(value)
  } catch {
    return false
  }

  // ① 先改内存 —— 界面立刻就是对的
  cache[key] = text

  // ② 再落盘
  if (isNative) {
    persist(key, text)
    // 老实说：这里返回的是"内存改成功了"。
    // 真正的落盘结果在 persist() 里处理（失败会重试，再失败会弹窗）。
    return true
  }

  // 网页版：localStorage 是同步的，能如实返回成功/失败
  try {
    localStorage.setItem(key, text)
    return true
  } catch {
    // 【重要】这里绝对不能调用 localStorage.clear()。
    // 那会把同一个网址下别的功能的数据也一起删光，是灾难性的做法。
    return false
  }
}

// 安卓端真正把数据写进硬盘。
//
// 【为什么不吞掉错误】
// 这个项目有一条铁规矩：写失败必须让用户知道。
// 网页版靠 write() 返回 false、让界面弹红字；安卓端当场返回不了结果，
// 所以这里补上：重试一次，再失败就直接弹窗。
// 数据要丢的时候，弹窗丑一点不要紧，装作没事才要命。
function persist(key: string, text: string): void {
  Preferences.set({ key, value: text }).catch(() => {
    void Preferences.set({ key, value: text }).catch(() => {
      window.alert(
        '数据没能存进手机！请马上到「设置」里导出备份，再把这个情况告诉开发者。',
      )
    })
  })
}

// ---------- 你自己建的动作 ----------

// 读出来。如果你还没建过任何动作，就返回一个空列表。
export function readCustomExercises(): Exercise[] {
  return read<Exercise[]>(KEYS.customExercises, [])
}

// 整个列表一次写回（新建动作、删除动作之后都调用它）。
// 注意是"整个列表写回"而不是"追加一条"：因为一个格子只能整个替换，
// 而且自建动作数量很少（几十条），一次全写完完全不影响速度。
export function writeCustomExercises(list: Exercise[]): boolean {
  return write(KEYS.customExercises, list)
}

// ---------- 设置 ----------

// 读设置。你没改过的话，返回默认值（休息 90 秒、显示 RPE）。
export function readSettings(): Settings {
  return read<Settings>(KEYS.settings, DEFAULT_SETTINGS)
}

export function writeSettings(value: Settings): boolean {
  return write(KEYS.settings, value)
}

// ---------- 正在进行、还没结束的那次训练 ----------
//
// 【为什么它值得单独占一个格子】
// 这是整个 App 最重要的一个设计。
// 你每点一次 ✓，数据就立刻写进这里。
// 所以练到一半锁屏、关掉浏览器、手机没电关机，重开还在。
// 如果等"结束训练"才存，中途出任何意外，这一小时的记录就白练了。
export function readActiveWorkout(): WorkoutSession | null {
  return read<WorkoutSession | null>(KEYS.activeWorkout, null)
}

export function writeActiveWorkout(session: WorkoutSession): boolean {
  return write(KEYS.activeWorkout, session)
}

// 结束训练时调用，把"正在进行"这个格子清空
export function clearActiveWorkout(): boolean {
  return write(KEYS.activeWorkout, null)
}

// ---------- 已经结束的训练记录 ----------

export function readSessions(): WorkoutSession[] {
  return read<WorkoutSession[]>(KEYS.sessions, [])
}

export function writeSessions(list: WorkoutSession[]): boolean {
  return write(KEYS.sessions, list)
}

// ---------- 训练模板 ----------
// 这里存的是"你自己建的"模板。3 个预置模板写在代码里（src/data/templates.ts），不进这里。

export function readTemplates(): Template[] {
  return read<Template[]>(KEYS.templates, [])
}

export function writeTemplates(list: Template[]): boolean {
  return write(KEYS.templates, list)
}

// ---------- 身体数据（身高 / 体重 / 体脂）----------

export function readBodyMetrics(): BodyMetric[] {
  return read<BodyMetric[]>(KEYS.bodyMetrics, [])
}

export function writeBodyMetrics(list: BodyMetric[]): boolean {
  return write(KEYS.bodyMetrics, list)
}

// ---------- 导入备份前的"保险箱" ----------
//
// 用户点"导入备份"时，会先把"现在手机里的东西"整个存进这一格。
// 万一他选错了文件（比如导入了三个月前的旧备份），
// 至少还能从这一格里把现在的数据捞回来。
export function writeSafetyBackup(value: unknown): boolean {
  return write(KEYS.beforeImport, value)
}

export function readSafetyBackup(): unknown {
  return read<unknown>(KEYS.beforeImport, null)
}

// 按日期写入。同一天已经有记录就**覆盖**那一条，而不是新增一条。
//
// 【为什么同一天只留一条】
// 早上称一次、晚上称一次，应该以最新的为准。
// 如果两条都留着，趋势图上会出现两个点挤在同一天，看着很乱。
export function upsertBodyMetric(metric: BodyMetric): boolean {
  const others = readBodyMetrics().filter((m) => m.date !== metric.date)
  // localeCompare 是按文字排序。日期是 '2026-09-23' 这种格式，
  // 按文字排序的结果正好等于按时间排序（因为年份在最前面）。
  const next = [...others, metric].sort((a, b) => a.date.localeCompare(b.date))
  return write(KEYS.bodyMetrics, next)
}
