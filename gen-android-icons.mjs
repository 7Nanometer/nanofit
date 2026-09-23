// ============================================================
// 生成安卓 App 的桌面图标和启动画面
// ============================================================
//
// 【它做什么】
// 从 public/favicon.svg（那唯一的图标源文件）生成 5 张源图，放进 assets/ 目录：
//   icon-only.png        完整图标（深色圆角方块 + 橙红 N）
//   icon-foreground.png  只有橙红 N，背景透明  ← 安卓"自适应图标"的前景层
//   icon-background.png  纯深色 #121212        ← 安卓"自适应图标"的背景层
//   splash.png           启动画面（深底 + 居中图标）
//   splash-dark.png      同上，深色模式用
//
// 然后由 Capacitor 官方的 @capacitor/assets 把这 5 张源图
// 铺成安卓要的十几个尺寸（5 种屏幕密度 × 方形/圆形/前景，加自适应图标定义）。
//
// 【什么是"自适应图标"】
// 安卓 8 起，桌面图标不再是一张死图片，而是分成两层：
//   背景层（铺满）+ 前景层（图形）
// 系统拿这两层自己裁 —— 有的手机裁成圆角方块，有的裁成圆形，有的裁成水滴形。
// 好处是同一个图标在所有手机上看着都合适。
//
// 【★前景层要不要缩小？这里有个容易算错的地方，把推导过程留下】
//
// 安卓自适应图标的画布是 108dp，但**只有中间 72dp 是"可见区"**，
// 再往里那个直径 66dp 的圆才是"保证不会被裁"的安全区。
//
// 关键在 @capacitor/assets 生成的 XML 长这样：
//     <foreground><inset android:inset="16.7%" android:drawable="..."/></foreground>
// 它给两层都套了 16.7% 的缩进 —— 也就是说，
// **它把下面这两张 1024×1024 的源图当成"72dp 可见区"来用**，
// 而不是当成 108dp 的整块画布。判断安全不安全必须以这个为前提。
//
// 在这个前提下算：源图 = 72dp 可见区，那么
//   · 最狠的情况是桌面把它裁成圆形 —— 圆的直径就是 72dp，半径 = 源图的 50%
//   · 我们 favicon.svg 里那个 N，最远的笔画端点离中心是 42%（实测算过）
//   · 42% < 50% → **不缩也安全**，而且不缩才和网页版 PWA 图标的大小比例一致
//
// （我一开始按"源图 = 108dp 画布"算，得出要缩到 70% —— 那是错的，
//   等于缩了两次，N 会变得只有该有的大小的 47%。）
//
// 所以这里保持 1。留成常量是因为：万一以后 favicon.svg 换了个占满画布的图形，
// 就得回来调这个数 —— 判断标准是"离中心最远的笔画 ≤ 50%"。
const FOREGROUND_SCALE = 1

// 【什么时候要跑它】改了 favicon.svg 之后。
// 【怎么跑】见 README 的「安卓图标怎么改」一节。
// ============================================================

import sharp from 'sharp'
import { readFileSync, mkdirSync, rmSync } from 'node:fs'

const ICON_BG = '#121212' // 和 App 底色、网页版 PWA 图标保持一致
const OUT = 'assets'

// 源文件就一个：public/favicon.svg
const svg = readFileSync('public/favicon.svg', 'utf8')

// 把里面那层深色圆角方块去掉，只剩橙红的 N（用来做自适应图标的前景层）。
// 这样"图形长什么样"永远只有 favicon.svg 一个出处，不会两处写重复、以后改岔。
const nOnly = svg.replace(
  /<rect width="512" height="512" rx="115"[^>]*\/>/,
  '<!-- 背景层由安卓那边单独提供，这里故意不要底色 -->',
)

if (nOnly === svg) {
  // 替换没生效说明 favicon.svg 里的背景那行被改过了，早点报错比默默生成错图强
  throw new Error(
    '没能从 favicon.svg 里剥掉背景方块 —— 是不是那行 <rect width="512" ...> 改过了？',
  )
}

mkdirSync(OUT, { recursive: true })

const SIZE = 1024
const SPLASH = 2732

// 用 favicon.svg 的原始尺寸（512）算出渲染倍率，保证边缘清晰
const toPng = (source, size) =>
  sharp(Buffer.from(source), { density: 400 }).resize(size, size).png()

// ---------- 1. 完整图标（老安卓系统没有自适应图标，用这张）----------
await toPng(svg, SIZE).toFile(`${OUT}/icon-only.png`)
console.log(`已生成 ${OUT}/icon-only.png  ${SIZE}x${SIZE}`)

// ---------- 2. 前景层：只有 N，背景透明，而且要缩小（原因见上面那段）----------
const fgSize = Math.round(SIZE * FOREGROUND_SCALE)
const fgSmall = await toPng(nOnly, fgSize).toBuffer()

await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: fgSmall, gravity: 'center' }])
  .png()
  .toFile(`${OUT}/icon-foreground.png`)
console.log(
  `已生成 ${OUT}/icon-foreground.png  ${SIZE}x${SIZE}（图形缩到 ${FOREGROUND_SCALE * 100}%）`,
)

// ---------- 3. 背景层：纯深色 ----------
await sharp({
  create: { width: SIZE, height: SIZE, channels: 4, background: ICON_BG },
})
  .png()
  .toFile(`${OUT}/icon-background.png`)
console.log(`已生成 ${OUT}/icon-background.png  ${SIZE}x${SIZE}`)

// ---------- 4 & 5. 启动画面 ----------
//
// 【为什么要有它】
// 不加的话，App 冷启动那一两秒会显示 Capacitor 自带的模板画面 ——
// 一个跟自己无关的图案，看着像没做完。
//
// 做法：一整块深色底 + 正中间放一个图标。
// 图标只占画面 25%，这是启动画面的惯例大小 ——
// 太大像张海报，太小看不见。
const logoSize = Math.round(SPLASH * 0.25)
const logo = await toPng(svg, logoSize).toBuffer()

for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({
    create: {
      width: SPLASH,
      height: SPLASH,
      channels: 4,
      background: ICON_BG,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`${OUT}/${name}`)
  console.log(`已生成 ${OUT}/${name}  ${SPLASH}x${SPLASH}`)
}

// 只留需要的文件，免得 assets/ 里混进别的东西被工具误认
try {
  rmSync(`${OUT}/.gitkeep`, { force: true })
} catch {
  // 没有就算了
}

console.log('')
console.log('5 张源图都好了。下一步执行：')
console.log('  npx capacitor-assets generate --android')
