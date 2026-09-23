// ============================================================
// 所有跟 localStorage（浏览器自带储物柜）打交道的代码，都写在这一个文件里
// ============================================================
//
// 【localStorage 是什么】
// 浏览器自带的一个"储物柜"，按网址分开存放，别人看不到。
// 存进去的东西：关掉浏览器还在，关机重启还在。
// 会丢的情况：你主动清缓存、手机存储极端满、iPhone 上超过 7 天没打开过这个网站。
// 所以"每周导出一次备份"很重要（阶段 6 会做这个功能）。
//
// 【为什么全项目只在这一个文件里碰它】
// 这是最容易出问题的地方（存储满、被禁用、数据损坏）。
// 集中在一处，将来出问题你只需要查这一个文件，不用满项目乱找。
// ============================================================

import type { Exercise } from '../types'

// ---------- 储物柜的格子名 ----------
//
// 统一用 nanofit:v1: 开头，有两个好处：
//   1. 一眼就能看出哪些数据是这个 App 存的，不会跟同一个网址下别的东西搞混
//   2. v1 表示"第 1 版数据结构"。将来万一要大改，可以换成 v2，新旧数据互不干扰
//
// 分成 6 个格子而不是全塞进一个大格子，好处是：
//   记一次训练只需要改写"训练记录"那一格，不用把动作库也重写一遍。
export const KEYS = {
  settings: 'nanofit:v1:settings', // 休息秒数、要不要显示 RPE
  customExercises: 'nanofit:v1:exercises', // 只存你自己建的动作（预置的 40 个在代码里，不进这里）
  sessions: 'nanofit:v1:sessions', // 所有训练记录
  templates: 'nanofit:v1:templates', // 训练模板
  bodyMetrics: 'nanofit:v1:body-metrics', // 身高、体重、体脂
  activeWorkout: 'nanofit:v1:active-workout', // 正在进行、还没结束的那次训练
} as const

// ---------- 两个通用工具：读一格、写一格 ----------

// 读。
// 如果格子是空的，或者里面的东西已经损坏（不是合法格式），
// 就返回你给的默认值 —— 绝不让整个页面因为读不到数据而白屏。
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback // 格子是空的，用默认值
    return JSON.parse(raw) as T
  } catch {
    // 走到这里只有两种可能：
    //   1. 浏览器禁用了 localStorage（比如 iPhone 的某些隐私模式）
    //   2. 格子里的内容坏了，解析不出来
    // 两种情况都当成"没有数据"处理，保证 App 还能正常打开。
    return fallback
  }
}

// 写。返回 true 表示存成功，false 表示存失败。
// 失败最常见的原因是手机存储满了。这时必须让界面提醒用户，
// 而不是偷偷吞掉错误 —— 那才是真的会丢数据。
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // 【重要】这里绝对不能调用 localStorage.clear()。
    // 那会把同一个网址下别的功能的数据也一起删光，是灾难性的做法。
    return false
  }
}

// ---------- 你自己建的动作 ----------

// 读出来。如果你还没建过任何动作，就返回一个空列表。
export function readCustomExercises(): Exercise[] {
  return read<Exercise[]>(KEYS.customExercises, [])
}

// 整个列表一次写回（新建动作、删除动作之后都调用它）。
// 注意是"整个列表写回"而不是"追加一条"：因为 localStorage 只能整个格子替换，
// 而且自建动作数量很少（几十条），一次全写完全不影响速度。
export function writeCustomExercises(list: Exercise[]): boolean {
  return write(KEYS.customExercises, list)
}
