import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'
import { initStorage } from './lib/storage'

// ---------- 先把数据读进内存，再画界面 ----------
//
// 【为什么必须等它读完】
// 见 src/lib/storage.ts 顶部的「关键设计：内存快照」。
// 一句话：全项目所有读数据的函数都是同步的（这样 7 个页面一个字都不用改），
// 而"同步"的前提是内存里已经有数据了 —— 那一步是异步的，必须先做完。
//
// 只读 7 个格子，通常几十毫秒，用户察觉不到。
//
// 【为什么用 finally 而不是 then】
// 万一读盘失败，界面也必须照样画出来（不然就是一片白屏，用户更慌）。
// 失败时 storage.ts 会禁止一切写入，界面会因为存不进去而亮红字提示 ——
// 绝不会出现"看起来存好了、其实硬盘上被清空"的情况。
void initStorage().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

// ---------- 请那个"管离线的小工人"上岗 ----------
//
// 【为什么只在正式打包后才请它】
// 开发时（npm run dev）如果也请它上岗，它会把文件存进仓库，
// 结果就是你改了代码、浏览器却还显示老样子 ——
// 白白浪费半天去找"为什么改了没用"。这种坑很多人踩过。
//
// import.meta.env.PROD：正式打包时是 true，开发时是 false。
//
// 【为什么安卓原生壳里也跳过它（2026-09-23 加的）】
// Service Worker 的拿手好戏是"断网也能打开"，靠的是把文件存进浏览器缓存。
// 但在安卓 App 里，网页文件本来就打包在 App 内部，断网照样能打开 ——
// 离线能力是白送的，不需要它。
//
// 而它在原生壳里反而会帮倒忙：
//   · 它是"缓存优先"的 —— 你改了代码重新打包安装，它还把旧文件端出来，
//     结果就是"我明明重装了 App，界面还是老样子"，这种问题极难查
//   · 原生壳里的缓存和网页版互不相干，多这一层只是多一个出错的地方
//
// ★注意：网页版的注册一个字没动 —— GitHub Pages 上的离线能力照旧，
//   那是整个 App 最要紧的特性之一，绝不能顺手删掉。
if (
  !Capacitor.isNativePlatform() &&
  'serviceWorker' in navigator &&
  import.meta.env.PROD
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 注册失败不影响 App 正常使用（只是没有离线功能），忽略即可
    })
  })
}
