import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 注册失败不影响 App 正常使用（只是没有离线功能），忽略即可
    })
  })
}
