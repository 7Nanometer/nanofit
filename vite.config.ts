import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 这个文件管的是"打包和开发服务器"怎么配置。
// plugins 数组里放的是给 Vite 用的"插件"（可以理解成外挂零件）：
//   react()      —— 让 Vite 看得懂 React 和 JSX 语法
//   tailwindcss()—— 把 Tailwind 接进来，负责生成 src/index.css 里定义的颜色和样式
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
