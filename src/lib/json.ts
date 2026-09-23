import { DEFAULT_SETTINGS } from '../types'
import type {
  BodyMetric,
  Exercise,
  Settings,
  Template,
  WorkoutSession,
} from '../types'
import {
  readBodyMetrics,
  readCustomExercises,
  readSessions,
  readSettings,
  readTemplates,
  writeBodyMetrics,
  writeCustomExercises,
  writeSafetyBackup,
  writeSessions,
  writeSettings,
  writeTemplates,
} from './storage'
import { dateKey } from './date'

// ============================================================
// 备份的导出与导入
// ============================================================
//
// 【这是整个 App 最重要的一件事，别删】
//
// 你的训练数据只存在这台手机的浏览器里。下面这些情况都会让它**彻底消失**：
//   · 你手动清理了浏览器缓存
//   · 手机存储紧张，系统自动清理
//   · iPhone 上超过 7 天没打开过这个网页（Safari 的规矩）
//   · 换手机、重装浏览器
//
// 所以：**导出的那个文件，才是你真正的存档。**
// 建议每周导一次，顺手发到微信收藏里。
//
// 【什么是 JSON】
// 一种通用的文本格式，记事本就能打开看。你导出的备份就是这种文件。
// ============================================================

export type Backup = {
  app: 'nanofit' // 用来认出"这是不是 NanoFIT 的备份"
  schemaVersion: number // 数据格式的版本号，将来大改时用来区分新旧
  exportedAt: string // 导出时间
  data: {
    settings: Settings
    customExercises: Exercise[]
    sessions: WorkoutSession[]
    templates: Template[]
    bodyMetrics: BodyMetric[]
  }
}

// 把手机里现在的东西打包成一个备份对象
export function buildBackup(): Backup {
  return {
    app: 'nanofit',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      settings: readSettings(),
      customExercises: readCustomExercises(),
      sessions: readSessions(),
      templates: readTemplates(),
      bodyMetrics: readBodyMetrics(),
    },
  }
}

// ---------- 导出：生成一个文件让用户存起来 ----------

export function downloadBackup(): void {
  const backup = buildBackup()

  // 第二个参数 null、第三个参数 2 的意思是"缩进两格"，
  // 这样导出的文件是人能读的格式，而不是挤成一坨
  const text = JSON.stringify(backup, null, 2)

  // 浏览器里"凭空造一个文件"的标准三步：
  //   1. 把文字包成 Blob（可以理解成"内存里的一个文件"）
  //   2. 给它生成一个临时网址
  //   3. 造一个隐藏的下载链接，替你点一下
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `nanofit-${dateKey()}.json`
  link.click()

  // ★必须调用，否则这个临时网址会一直占着内存不释放
  URL.revokeObjectURL(url)
}

// ---------- 导入：从文件恢复 ----------

export type ImportResult =
  | { ok: true; summary: string }
  | { ok: false; message: string }

export async function importBackup(file: File): Promise<ImportResult> {
  // 第一步：把文件内容读成文字，再解析成对象
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    return { ok: false, message: '这个文件读不出来，可能不是备份文件。' }
  }

  // 第二步：检查"这确实是 NanoFIT 的备份"
  // 这一步不能省 —— 用户完全可能手滑选错文件
  if (!isBackup(parsed)) {
    return { ok: false, message: '这不是 NanoFIT 的备份文件，没有动你的数据。' }
  }

  const { data } = parsed

  // 第三步：先把"现在手机里的东西"整个存进保险箱
  writeSafetyBackup(buildBackup())

  // 第四步：逐项写入。
  // 设置用 { ...默认值, ...备份里的值 } 的写法合并，
  // 这样即使备份是旧版本、缺了某个字段，也能用默认值补上，不会缺胳膊少腿。
  const results = [
    writeSettings({ ...DEFAULT_SETTINGS, ...data.settings }),
    writeCustomExercises(data.customExercises),
    writeSessions(data.sessions),
    writeTemplates(data.templates),
    writeBodyMetrics(data.bodyMetrics),
  ]

  if (results.includes(false)) {
    return {
      ok: false,
      message:
        '部分数据没写进去，可能是手机存储满了。你先别继续操作，告诉我。',
    }
  }

  return {
    ok: true,
    summary:
      `恢复了 ${data.sessions.length} 次训练、${data.customExercises.length} 个自建动作、` +
      `${data.templates.length} 个自建模板、${data.bodyMetrics.length} 条身体数据。`,
  }
}

// 检查一个东西长得像不像 NanoFIT 的备份。
//
// 【为什么每一项都要用 Array.isArray 查一遍】
// 光看 app 字段名字对不对还不够 —— 万一文件被改坏了，
// sessions 变成了一串文字，后面处理时整个 App 就会崩。
// 在这里拦下来，比在用户手机上崩掉强一万倍。
function isBackup(value: unknown): value is Backup {
  if (typeof value !== 'object' || value === null) return false

  const outer = value as Record<string, unknown>
  if (outer.app !== 'nanofit') return false

  const data = outer.data
  if (typeof data !== 'object' || data === null) return false

  const inner = data as Record<string, unknown>
  return (
    Array.isArray(inner.sessions) &&
    Array.isArray(inner.customExercises) &&
    Array.isArray(inner.templates) &&
    Array.isArray(inner.bodyMetrics)
  )
}
