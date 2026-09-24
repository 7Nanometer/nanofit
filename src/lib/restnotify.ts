// ============================================================
// 组间休息的"后台提醒" —— 跟安卓系统预约一个闹钟
// ============================================================
//
// 【要解决的是什么问题】
// 原来的休息倒计时只能在 App 里响：手机一锁屏、一切到微信，到点什么都不发生。
// 原因是浏览器内核会把网页的定时器冻住，那句 beep() + vibrate() 根本轮不到执行。
// 这不是写错了，是网页技术的硬限制。
//
// 【解法：别自己记时间，改成跟系统预约】
// 通知不是我们自己掐着表发的，而是把"到点叫我"这件事交给安卓系统去办。
// 闹钟在系统手里，App 切后台、被冻住、甚至被系统杀掉，到点一样会响。
//
// 【★核心设计：一条不变式，一个出口】
//
//     预约通知  ⟺  在手机上 且 通知权限已给 且 App 不在前台 且 休息还没结束
//     其余所有情况 一律取消
//
// 这一条判断就是 syncRestNotify()。所有地方改完状态都只是喊一声"重新判断一下"，
// 不自己决定预约还是取消。
//
// 【为什么必须这样，而不是"休息开始时预约、结束时取消"分两处写】
// 分两处写一定会漏：切 tab、点跳过、训练结束、权限被撤销……出口太多了。
// 合成一条判断之后，"预约和取消成套"就不是靠人记得，而是压根写不歪。
// （TrainScreen 里那个"结束训练要顺手清掉倒计时"的 bug，就是这么来的。）
//
// 【为什么它不接收参数，自己去读存档】
// 底部四个 tab 是靠一个变量切换的，切走的时候训练页【整个被卸载】。
// 如果你切到「历史」页再把 App 切后台，训练页的代码早就不在了 ——
// 只有读存档（readActiveWorkout，读的是内存快照，同步的）才拿得到。
//
// 【网页版会怎样】
// 整条链路空转（下面每个出口都有 isNative 判断），一行原生代码都不执行，
// 所以 npm run dev 调试时不会有任何报错。
// ============================================================

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { readActiveWorkout } from './storage'

// 现在是不是跑在手机上。浏览器里打开时是 false。
const isNative = Capacitor.isNativePlatform()

// 休息提醒在系统里的编号。
//
// ★固定用 1，是故意的：安卓认这个号来"覆盖"——
// 用同一个号再预约一次，旧的那条会被顶掉，所以同一时刻
// 只可能存在一条休息提醒，不会攒出一排。
export const REST_NOTIFY_ID = 1

// 设置页那个「试一下」按钮用另一个号。
// 它跟真正的休息提醒不是一回事，用同一个号会互相顶掉。
const TEST_NOTIFY_ID = 99

// 通知渠道的编号（安卓 8 起，每条通知都必须属于某个"渠道"）。
// 详见下面 createChannel() 那段注释。
const CHANNEL_ID = 'rest-timer'

// 点「试一下」之后，过多久响。留 5 秒够你把 App 切到后台。
const TEST_DELAY_MS = 5000

// ---------- 对外汇报的状态 ----------

export type RestNotifyStatus = {
  native: boolean // 是不是装在手机上（网页端一律 false）
  granted: boolean // 通知权限：系统允不允许我们发通知
  exact: boolean // 精确闹钟权限：能不能"准点"响
}

// ---------- 内部状态 ----------

let started = false // 初始化只能做一次
let appActive = true // App 现在在不在前台
let granted = false // 通知权限
let exact = true // 精确闹钟权限（先当有，查到没有再改）

const statusListeners = new Set<() => void>()
const tapListeners = new Set<() => void>()
let pendingTap = false // "点击通知"事件来得比页面挂载还早时，先记在这儿

// ============================================================
// 一、给界面看的几个函数
// ============================================================

// 现在是什么状态。同步返回，因为状态一直存在内存里。
export function getRestNotifyStatus(): RestNotifyStatus {
  return { native: isNative, granted, exact }
}

// 状态变了通知界面重画。返回一个"退订"函数，页面卸载时要调。
export function subscribeRestNotify(cb: () => void): () => void {
  statusListeners.add(cb)
  return () => {
    statusListeners.delete(cb)
  }
}

// 用户点了通知栏那条提醒时要干什么（App.tsx 用它切回训练页）。
export function onRestNotifyTap(cb: () => void): () => void {
  tapListeners.add(cb)
  // 万一事件比页面挂载还早到（快速回到 App 时可能发生），补发一次。
  // 冷启动点通知不会走这里 —— 插件只在 App 还活着时才发这个事件，
  // 而冷启动本来就落在训练页，不需要跳。
  if (pendingTap) {
    pendingTap = false
    cb()
  }
  return () => {
    tapListeners.delete(cb)
  }
}

function emitStatus(): void {
  for (const cb of statusListeners) cb()
}

// ============================================================
// 二、唯一的出口：重新判断该不该预约
// ============================================================

// 判断条件收成一句，是为了让"什么样才预约"只有一处定义。
// 返回值写成 endsAt is number，是为了让 TypeScript 知道
// 下面那个 endsAt 通过检查之后一定是个数字（不是 null）。
function shouldSchedule(endsAt: number | null): endsAt is number {
  return granted && !appActive && endsAt !== null && endsAt > Date.now()
}

// ★所有改动了"休息状态"或"前后台状态"的地方，都只调这一个函数。
//   它不接收参数，自己去读存档。
export function syncRestNotify(): void {
  if (!isNative) return

  const endsAt = readActiveWorkout()?.restEndsAt ?? null

  if (!shouldSchedule(endsAt)) {
    void cancelRest()
    return
  }
  void scheduleRest(endsAt)
}

// ============================================================
// 三、真正跟系统打交道的那几个
// ============================================================

async function scheduleRest(endsAt: number): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_NOTIFY_ID,
          title: '休息结束',
          body: '该下一组了',
          channelId: CHANNEL_ID,
          // 点一下就从通知栏消失，不留残影
          autoCancel: true,
          schedule: {
            at: new Date(endsAt),
            // ★这句是"手机塞在包里也叫得醒"的关键：
            //   它让系统用 setExactAndAllowWhileIdle，会把睡着的手机唤醒。
            //   不加的话，手机进了"省电休眠"，通知可能被推迟几分钟才响。
            allowWhileIdle: true,
          },
        },
      ],
    })
  } catch {
    // 通知权限被系统关掉了 —— 插件的 schedule() 会直接报错
    // （源码里写死了 "Notifications not enabled on this device"）。
    //
    // 吞掉，绝不能让"提醒发不出去"连累到训练记录这件事。
    // 顺手把状态改成"没权限"，界面会跟着变成"点这里开启"。
    granted = false
    emitStatus()
  }
}

async function cancelRest(): Promise<void> {
  try {
    // ① 取消"还没到点"的那条
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFY_ID }] })
    // ② 把"已经显示在通知栏上"的那条也擦掉。
    //    少了这步，你回到 App 之后通知栏里那个"休息结束"还挂在那儿。
    await LocalNotifications.removeAllDeliveredNotifications()
  } catch {
    // 什么都没预约过的时候取消是正常的，不是错误，吞掉
  }
}

// 建通知渠道。
//
// 【渠道是什么】
// 安卓 8 起，每条通知都必须属于一个"渠道"。渠道决定了这条通知
// 重不重要、响不响、震不震、锁屏上显不显示 —— 而且这些是【用户可以在
// 系统设置里自己改的】。这是安卓把控制权交给用户的设计。
async function createChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: '组间休息',
      description: '组间休息结束时提醒你',
      // 4 = HIGH。★必须是 4：
      //   设低了（3 或以下）就没有横幅弹出、也没声音，等于白提醒。
      //
      // ⚠️ 渠道的"重要性"一旦建好就【改不了】—— 安卓的限制，不是我们的毛病。
      //    以后就算把这里的数字改大，已经装过 App 的手机也不会生效
      //    （除非卸载重装，或者用户自己去系统设置里改）。
      //    所以第一次就得是对的。
      importance: 4,
      // 1 = PUBLIC：锁屏上也看得见内容。
      // 组间休息本来就该在锁屏上一眼看到，藏起来没意义。
      visibility: 1,
      vibration: true,
      // 【故意不传 sound】
      // 不传 = 用手机自己的默认通知音。
      // （依据：安卓源码 NotificationChannel 里 mSound 的初值就是
      //   系统默认通知音，插件没传声音时就不会覆盖它。）
      // 传了反而麻烦：插件只认放在 App 里的音频文件，找不到就没声音了。
    })
  } catch {
    // 安卓 7 上根本没有"渠道"这个东西，插件会直接拒绝。吞掉。
    // （安卓 7 的通知照样能发，只是没有渠道这一层，用系统的默认设置。）
  }
}

// ============================================================
// 四、权限
// ============================================================

async function readPermission(): Promise<void> {
  try {
    const res = await LocalNotifications.checkPermissions()
    // display 有四种取值：granted（已给）/ denied（拒绝）/
    // prompt（还没问过）/ prompt-with-rationale（拒绝过一次了）。
    // 只有 granted 才算能用。
    granted = res.display === 'granted'
  } catch {
    granted = false
  }
}

async function readExactAlarm(): Promise<void> {
  try {
    const res = await LocalNotifications.checkExactNotificationSetting()
    exact = res.exact_alarm === 'granted'
  } catch {
    // 安卓 12 以下这个方法会直接返回 granted，不会抛错；
    // 真抛错了就按"没有"处理 —— 界面会提示，比假装有强。
    exact = false
  }
}

// 重新查一遍权限，然后重新判断。
//
// 【为什么每次回到前台都要查】
// 1. 你可能刚去系统设置里改过通知权限
// 2. 撤销"精确闹钟"权限时，安卓会【重启这个 App】并【清空所有已预约的
//    精确闹钟】；换手机、从备份恢复时这个权限也会变回拒绝
// 所以不能假设它一直在。
export async function refreshRestNotify(): Promise<RestNotifyStatus> {
  if (!isNative) return getRestNotifyStatus()

  await readPermission()
  await readExactAlarm()
  emitStatus()
  syncRestNotify()
  return getRestNotifyStatus()
}

// 申请通知权限（会弹出系统那个"允许通知吗"的框）。
//
// 【为什么不在 App 一启动就申请】
// 安卓上拒绝过之后系统就不再弹框了，第一次机会很宝贵 ——
// 要挑用户"刚好需要它"的那一刻问（第一次开始组间休息时）。
// 那一刻的决定写在界面里（RestTimer / 设置页），这里只管弹框。
export async function requestRestNotify(): Promise<RestNotifyStatus> {
  if (!isNative) return getRestNotifyStatus()

  try {
    await LocalNotifications.requestPermissions()
  } catch {
    // 安卓 13 以下没有这个弹框，插件会直接返回，不算错误
  }
  return refreshRestNotify()
}

// 跳到系统的「闹钟和提醒」设置页，让用户自己打开精确闹钟权限。
//
// 【为什么不让 App 自己开】
// 这个权限安卓不允许 App 自己申请，只能用户手动开 —— 这是设计如此。
// 所以我们只能把他送到那个页面，开不开由他决定。
export async function openExactAlarmSetting(): Promise<void> {
  if (!isNative) return

  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    // 用户没开就返回了、或者安卓版本根本不支持，都无所谓
  }
  // 回来之后再查一遍：他可能刚打开，也可能什么都没动
  void refreshRestNotify()
}

// ============================================================
// 五、启动 + 前后台
// ============================================================

// App 启动时调一次（在 main.tsx 里，必须在读盘之后 ——
// 早于读盘的话 readActiveWorkout() 拿到的是空的）。
export function initRestNotify(): void {
  if (!isNative || started) return
  started = true

  void (async () => {
    await createChannel()
    await readPermission()
    await readExactAlarm()
    emitStatus()
    syncRestNotify()
  })()

  // 切后台 / 回前台 / 锁屏 / 解锁。
  //
  // 【这个信号从哪来】
  // 安卓的 onStop()（切到别的 App、按 Home、按电源键锁屏都会触发），
  // 回来时是 onResume()。Capacitor 把它转发成 appStateChange。
  //
  // 【为什么 JS 这时候还能跑】
  // 去看过 Capacitor 的源码了：它切后台时【不会】冻结 WebView
  // （Bridge.onPause() 只是通知各个插件）。所以这里调 schedule() 来得及。
  // 会冻结的是网页自己的定时器 —— 而倒计时那套本来就只把定时器当
  // "刷新画面"用，真正的判断靠 endsAt 时间戳，所以不受影响。
  void App.addListener('appStateChange', ({ isActive }) => {
    appActive = isActive
    // 先立刻按新的前后台状态判断一次（切后台就该预约、回前台就该取消）
    syncRestNotify()
    // 回前台时还要重查权限：用户很可能刚在系统设置里改过东西
    if (isActive) void refreshRestNotify()
  })

  // 用户点了通知栏那条提醒
  void LocalNotifications.addListener('localNotificationActionPerformed', () => {
    if (tapListeners.size === 0) {
      // 页面还没挂上，先记着
      pendingTap = true
      return
    }
    for (const cb of tapListeners) cb()
  })
}

// ============================================================
// 六、设置页那个「试一下」
// ============================================================

// 5 秒后发一条测试通知。返回 false 表示根本没发出去（多半是没权限）。
//
// 【它测得到什么】
// 权限、渠道、声音、震动、横幅、点一下能不能回到 App —— 全都能测。
// 【它测不到什么】
// "切后台时预约"这条路要真训练一次才知道（因为这里 App 还在前台）。
export async function sendTestNotification(): Promise<boolean> {
  if (!isNative) return false

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFY_ID,
          title: '休息结束',
          body: '该下一组了（这是一条测试提醒）',
          channelId: CHANNEL_ID,
          autoCancel: true,
          schedule: {
            at: new Date(Date.now() + TEST_DELAY_MS),
            allowWhileIdle: true,
          },
        },
      ],
    })
    return true
  } catch {
    granted = false
    emitStatus()
    return false
  }
}
