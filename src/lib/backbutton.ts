import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// ============================================================
// 安卓的物理返回键（手机底部那个三角/横条）
// ============================================================
//
// 【不处理会怎样】
// 我们这个 App 是"单页应用"——四个页面靠一个变量切换，没有网址跳转，
// 所以浏览器/WebView 里压根没有"上一页"这个概念。
// 结果就是：你在「设置 → 身体数据」里填着体重，手一滑按到返回键，
// App 直接整个退出了。这正是主人要求避免的。
//
// 【怎么处理：一个"返回栈"】
// 谁需要拦截返回键，谁就登记一个处理函数。
// 按返回键时，从**最后登记的**开始往前问（后登记的在更上层）：
//   谁返回 true，就表示"这事我接了"，到此为止；
//   一个都没接，才走默认行为（退出 App）。
//
// 【为什么要"从最后登记的往前问"】
// 想象你从「设置」点进了「身体数据」：
//   先登记的是设置页（它随时准备着"退回设置列表"）
//   后登记的是……其实这里只有设置页登记。
// 关键在 App.tsx 那边：它登记的"切回训练页"必须**最先登记**，
// 也就是永远排在栈底、最后才被问到。
// 否则你在身体数据页按返回，会先被 App 那句"切回训练页"抢走，
// 直接从子页面跳回了训练页，把设置页那层跳过去了。
// ============================================================

// 返回 true = "我处理了，别退出 App"
type BackHandler = () => boolean

const handlers: BackHandler[] = []

// 页面登记自己。返回一个"注销"函数 ——
// 页面卸载时必须调用它，否则会攒下一堆已经不在界面上的处理函数。
export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler)
  return () => {
    const i = handlers.indexOf(handler)
    if (i !== -1) handlers.splice(i, 1)
  }
}

// 按返回键时问一圈。返回 true 表示已经有人处理了。
export function handleBack(): boolean {
  // 从后往前 —— 最后登记的在上层，优先问它
  for (let i = handlers.length - 1; i >= 0; i--) {
    if (handlers[i]()) return true
  }
  return false
}

// 挂上安卓的返回键监听。返回一个"摘掉监听"的函数。
//
// 在浏览器里打开时它什么都不做（Capacitor.isNativePlatform() 是 false），
// 直接返回一个空的注销函数 —— 所以网页版完全不受影响。
export function onBackButton(callback: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}

  // App.addListener 是异步的（返回一个 Promise），
  // 所以"挂监听"和"摘监听"之间可能有时序问题：
  // 万一监听还没挂好，React 就把组件卸载了（比如开发时严格模式的二次挂载），
  // 那就会挂上一个没人摘的监听。cancelled 这个标记就是防这个的。
  let cancelled = false
  let handle: { remove: () => void } | null = null

  void App.addListener('backButton', callback).then((h) => {
    if (cancelled) {
      void h.remove()
      return
    }
    handle = h
  })

  return () => {
    cancelled = true
    if (handle !== null) void handle.remove()
  }
}

// 退出 App。
// 只有在"所有页面都说这事不归我管"、且已经在训练页时才会用到。
export function exitApp(): void {
  void App.exitApp()
}
