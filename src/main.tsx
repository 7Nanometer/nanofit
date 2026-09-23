import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

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
