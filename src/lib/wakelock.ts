// ============================================================
// 休息期间让手机屏幕别自动熄灭
// ============================================================
//
// 【它解决什么问题】
// 你练完一组，把手机往旁边一放，屏幕过 30 秒自己黑了。
// 等你再拿起来解锁，休息早就结束了 —— 中间的提醒全错过。
//
// 这个功能就是告诉手机："这段时间先别熄屏。"
//
// 【重要限制：浏览器要求 https 才能用】
// 你现在手机上访问的是 http://192.168.3.21:5173（局域网地址），
// 属于"不安全的环境"，浏览器会拒绝这个请求 —— 所以现在它不生效。
// 等阶段 6 部署到 https 之后，它就会自动开始工作，不用再改代码。
//
// 【另一个限制：切到别的 App 时，系统会自动收回】
// 页面看不见的时候，屏幕常亮会自动失效（这是设计如此，防止网页偷偷耗电）。
// 所以它只解决"手机放着不动、屏幕自动熄灭"，不解决"主动切走"。
// ============================================================

let enabled = false // 当前是不是开着
let sentinel: WakeLockSentinel | null = null // 系统发回来的"凭证"

async function request(): Promise<void> {
  try {
    // 有些浏览器根本没有这个功能，先问一句
    if (!('wakeLock' in navigator)) return

    // 页面不可见时申请必然失败，别浪费
    if (document.hidden) return

    // 已经亮着了，不用重复申请
    if (sentinel !== null) return

    sentinel = await navigator.wakeLock.request('screen')

    // 系统主动收回时（比如你切到了别的 App），把凭证清掉，
    // 这样切回来时才能重新申请一个新的。
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    // 申请失败不影响任何功能，最多是屏幕照常自动熄灭。
    // 常见的失败原因：不是 https、手机电量很低、浏览器不支持。
  }
}

async function release(): Promise<void> {
  const current = sentinel
  sentinel = null
  try {
    await current?.release()
  } catch {
    // 释放失败无所谓，系统自己也会收回去
  }
}

function onVisibilityChange(): void {
  // 切回前台时重新申请一次（因为切走时已经被系统收回了）
  if (!document.hidden) void request()
}

// 开关。界面在"开始休息"时打开，休息结束时关掉。
export function setKeepAwake(on: boolean): void {
  if (on === enabled) return // 状态没变就别重复折腾
  enabled = on

  if (on) {
    document.addEventListener('visibilitychange', onVisibilityChange)
    void request()
  } else {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void release()
  }
}
