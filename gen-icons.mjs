// 把 public/favicon.svg 转成各种尺寸的 PNG 图标。
//
// 【什么时候要跑它】改了 favicon.svg 之后（不然手机上还是旧图标）。
// 具体命令见 README 的「图标怎么改」一节。
//
// 【注意】XML 注释里不能出现连续两个减号，所以 README 里那条
// npm install 带参数的写法，在这个文件里也不能原样抄进 svg 的注释。
import sharp from 'sharp'
import { readFileSync, mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

const svg = readFileSync('public/favicon.svg')

// 普通图标：192 和 512 两个尺寸（PWA 要求至少有这两个）
for (const size of [512, 192]) {
  await sharp(svg, { density: 400 })
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`)
  console.log(`已生成 public/icons/icon-${size}.png`)
}

// 安卓专用图标（maskable）：
// 安卓会把图标裁成圆形或水滴形，所以图形要缩小、背景要铺满，
// 否则四个角会被切掉，图形也会显得太小。
const inner = await sharp(svg, { density: 400 })
  .resize(340, 340)
  .png()
  .toBuffer()

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: '#121212',
  },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('public/icons/icon-maskable-512.png')

console.log('已生成 public/icons/icon-maskable-512.png')
