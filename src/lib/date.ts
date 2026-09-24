// ============================================================
// 日期工具
// ============================================================
//
// 【这个文件存在的唯一理由，是一个很容易踩的坑】
//
// JavaScript 自带一个取日期的方法叫 toISOString()，看着很方便，
// 但它给出的是"格林威治时间"，比北京时间整整晚 8 小时。
//
// 后果：北京时间【凌晨 0 点到早上 8 点之间】，用它取到的日期还是"昨天"。
// 实测过（2026-08-24 早上 6:30 记录）：
//     toISOString() 得到 2026-08-23   ← 差了一天
//     本方法得到      2026-08-24   ← 正确
//
// 也就是说：早起晨练完记数据，训练会记到昨天去 ——
// 历史记录的排序、每周统计都会跟着错位。
//
// 所以：全项目取日期，一律用下面这个 dateKey()，它老老实实读你手机上的本地时间。
// ============================================================

// 把某一天转成 '2026-09-23' 这种格式的文字。
// 不传参数时就是"今天"。
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  // 注意 getMonth() 返回 0-11，1 月是 0，所以要 +1 才是人话里的月份
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 单独写一个，是为了代码里看到 todayKey() 一眼就懂，比 dateKey() 更直白
export function todayKey(): string {
  return dateKey()
}

// padStart(2, '0') 在上面出现了两次，解释一下：
// 它把 "9" 补成 "09"，把 "12" 原样保留。
// 目的是让 '2026-9-3' 变成整齐的 '2026-09-03'，
// 这样所有日期长度一样，排序和比较都不会出岔子。

// 把 '2026-09-23' 这种文字转回 Date 对象
export function parseDateKey(key: string): Date {
  const parts = key.split('-') // 按横线切开，得到 ['2026','09','23']
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])

  // 【注意】这里绝对不能写成 new Date('2026-09-23')！
  // 那种写法浏览器会当成"格林威治时间的零点"，在咱们这儿会差 8 小时。
  // 下面这种"分别传年、月、日"的写法，才是按本地时间来算。
  return new Date(y, m - 1, d)
}

// 转成给人看的中文，例如 '9月23日 周三'
const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function formatDateCN(key: string): string {
  const d = parseDateKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEK_NAMES[d.getDay()]}`
}

// 判断某个日期是不是今天。训练页用它来决定显示"今天"还是具体日期。
export function isToday(key: string): boolean {
  return key === todayKey()
}

// ---------- 算两个"绝对时刻"之间差了多少 ----------
//
// 【它和上面那些函数的区别，一定要看清】
// 上面处理的都是 '2026-09-23' 这种**日期**（一天，不是一个时刻）。
// 这个处理的是一串 ISO 时间，长这样：'2026-09-24T06:32:10.123Z'
// —— 它记的是"几点几分几秒"，是一个**绝对时刻**。
//
// 训练记录里存的时间（startedAt、completedAt）全是 ISO 格式，
// 因为它们要能算出"这一组和上一组隔了多久"。
//
// ★ 千万别拿 parseDateKey 去解析 ISO 字符串！
//   它按横线切开后取第三段，会把 '24T06:32:10.123Z' 变成 NaN。
//   解析 ISO 只有一个正确做法：Date.parse()。
export function parseISO(iso: string): number {
  return Date.parse(iso)
}

// 从 fromISO 到 toISO 过了多少秒。算不出来（格式不对、缺字段）返回 null。
//
// 【为什么返回 null 而不是 0】
// 和体脂率、配速那边一个道理：0 是个**假数字**。
// "这次训练 0 秒"和"不知道练了多久"是两回事，混在一起会让热量算出个 0。
export function secondsBetween(fromISO: string, toISO: string): number | null {
  const from = parseISO(fromISO)
  const to = parseISO(toISO)
  // Number.isNaN 用来判断"这不是个有效数字"。
  // 注意不能写 from === NaN —— NaN 和任何东西比都是 false，包括它自己。
  if (Number.isNaN(from) || Number.isNaN(to)) return null
  return (to - from) / 1000
}
