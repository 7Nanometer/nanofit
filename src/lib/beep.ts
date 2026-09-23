// ============================================================
// 休息结束时"叮"一声 + 震一下
// ============================================================
//
// 【为什么不用一个 mp3 文件】
// 用代码直接"合成"声音（Web Audio），不需要额外下载任何音频文件，
// 也就不用担心文件丢失、路径写错、加载慢这些问题。
//
// 【浏览器有个硬规矩：不在用户手指点击的那一瞬间，就不许出声】
// 这是为了防止网页一打开就自动放广告声音。
// 所以流程是：
//   1. 用户点 ✓ 记一组时 —— 那正好是一次点击 —— 顺手把音响"解锁"
//   2. 90 秒后要响的时候，音响已经解锁过了，就能正常响
//
// 【震动只有安卓有】
// iPhone 从来不支持网页震动，这是苹果不给，不是代码写错了。
// 所以下面写的是"能震就震，不能震就算了"。
// ============================================================

// 全局只保留一个"音响"。第一次用到时才创建。
let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  try {
    if (audioContext === null) {
      audioContext = new AudioContext()
    }
    return audioContext
  } catch {
    // 极老的浏览器可能没有这个功能，那就静默放弃（最多是没声音，不影响计时）
    return null
  }
}

// 在用户点击的那一刻调用，把音响"解锁"。
export function unlockAudio(): void {
  const ctx = getContext()
  if (ctx === null) return

  try {
    // 切到后台再回来时，音响可能被系统挂起，这里把它唤醒
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    // 【这一步是解锁 iPhone 的关键】
    // 光唤醒还不够，得真的"播一次"才算解锁。
    // 这里播一个音量为 0、时长 0.01 秒的音 —— 你听不见，但浏览器认账。
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.01)
  } catch {
    // 解锁失败不影响主流程
  }
}

// 响三声"叮"
export function beep(): void {
  const ctx = getContext()
  if (ctx === null) return

  try {
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    for (let i = 0; i < 3; i++) {
      // 每声之间隔 0.25 秒
      const startAt = ctx.currentTime + i * 0.25
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine' // 正弦波，听起来是"嘀"的纯净音
      osc.frequency.value = 880 // 880 赫兹，清脆不刺耳

      // 音量不能一上来就是最大，否则会有"啪"的爆音。
      // 所以让它用极短的时间淡入、再淡出。
      gain.gain.setValueAtTime(0, startAt)
      gain.gain.linearRampToValueAtTime(0.3, startAt + 0.01)
      gain.gain.linearRampToValueAtTime(0, startAt + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startAt)
      osc.stop(startAt + 0.16)
    }
  } catch {
    // 没声音也不影响计时器本身
  }
}

// 震一下：震 200 毫秒、停 100 毫秒、再震 200 毫秒
export function vibrate(): void {
  // 先检查这个功能存不存在。iPhone 上没有，直接调用会报错。
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate([200, 100, 200])
  }
}
