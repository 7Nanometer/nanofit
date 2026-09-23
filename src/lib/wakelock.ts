import { Capacitor } from '@capacitor/core'
import { KeepAwake } from '@capacitor-community/keep-awake'

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
// ------------------------------------------------------------
// 【两条路（2026-09-23 改的）】
//
// 网页版：用浏览器的 Wake Lock API。
//   · 硬限制：只有 https 才能用。局域网地址 http://192.168.x.x 属于
//     "不安全的环境"，浏览器会拒绝 —— 所以在局域网真机测试时不生效，
//     部署到 https 之后会自动开始工作。
//   · 另一个限制：切到别的 App 时系统会自动收回（这是设计如此，
//     防止网页偷偷耗电）。所以它只解决"手机放着不动、屏幕自动熄灭"。
//
// 安卓版：用 Capacitor 的原生常亮插件。
//   · 没有 https 那条限制（原生 App 本来就有权限）。
//   · 也不受"切走就收回"那条限制 —— 它是直接给窗口加了个
//     "保持常亮"的系统标志，切到别的 App 再切回来，标志还在。
//     这对健身场景更实用：你切去听个歌，回来屏幕还亮着。
//
// 两条路都在下面的 request() / release() 里分流，对外的 setKeepAwake()
// 一个字没变 —— 用它的地方（RestTimer）完全不用改。
// ============================================================

// 现在是不是跑在安卓的原生壳里（在浏览器里打开时是 false）
const isNative = Capacitor.isNativePlatform()

let enabled = false // 当前是不是开着
let sentinel: WakeLockSentinel | null = null // 系统发回来的"凭证"（网页版才用）

// ---------- 网页版：申请常亮 ----------
async function requestWeb(): Promise<void> {
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

// ---------- 网页版：放开常亮 ----------
async function releaseWeb(): Promise<void> {
  const current = sentinel
  sentinel = null
  try {
    await current?.release()
  } catch {
    // 释放失败无所谓，系统自己也会收回去
  }
}

// ---------- 安卓版 ----------
//
// keepAwake() / allowSleep() 都是原生调用，同样可能失败
// （比如省电模式拦着），但失败了也没关系 —— 最多是屏幕照常熄灭，
// 不影响休息计时本身。所以这里一律吞掉错误。
async function requestNative(): Promise<void> {
  try {
    await KeepAwake.keepAwake()
  } catch {
    // 忽略
  }
}

async function releaseNative(): Promise<void> {
  try {
    await KeepAwake.allowSleep()
  } catch {
    // 忽略
  }
}

// ---------- 网页版专用：切回前台时重新申请 ----------
//
// 为什么要这一步：浏览器在你切走时会把常亮收回，切回来不会自动恢复，
// 得我们自己再申请一次。
// 安卓版不需要这个 —— 原生标志不会因为你切走就被清掉。
function onVisibilityChange(): void {
  if (!document.hidden) void requestWeb()
}

// 开关。界面在"开始休息"时打开，休息结束时关掉。
export function setKeepAwake(on: boolean): void {
  if (on === enabled) return // 状态没变就别重复折腾
  enabled = on

  if (isNative) {
    void (on ? requestNative() : releaseNative())
    return
  }

  if (on) {
    document.addEventListener('visibilitychange', onVisibilityChange)
    void requestWeb()
  } else {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void releaseWeb()
  }
}
