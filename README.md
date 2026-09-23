# NanoFIT

一个**完全离线的健身记录本**。装到手机桌面上，用起来和真 App 一样。

**没有账号，没有服务器，不做任何联网请求。** 你的训练数据自始至终只存在你自己手机的浏览器里，不会上传到任何地方。

---

## 长什么样

三张都是**真机上直接截的**，没有美化。

<p align="center">
  <img src="screenshots/train.png" width="600" alt="训练页" />
  <br />
  <em>训练页 —— 填好重量和次数，按那个橙红色的 ✓ 就记下了一组。<br />
  按下去的那一瞬间数据就已经存进手机了，练到一半锁屏、关浏览器都不会丢。</em>
</p>

<p align="center">
  <img src="screenshots/history.png" width="600" alt="历史页" />
  <br />
  <em>历史页 —— 按日期倒着排，点「展开」看那天的每一组。<br />
  上面那个下拉框可以只看某一个动作的历史，用来跟自己三个月前的重量对比。</em>
</p>

<p align="center">
  <img src="screenshots/stats.png" width="600" alt="统计页" />
  <br />
  <em>统计页 —— 每周总容量的柱状图（截这张时只练过一次，所以只有一根柱子）。<br />
  往下还有单个动作的最大重量、总容量、估算 1RM 三条曲线。</em>
</p>

---

## 它能做什么

- **动作库**：40 个健身房常见动作（胸 / 背 / 腿 / 肩 / 手臂 / 核心），每个都有一句话动作要领；可以自己加动作
- **记训练**：选动作 → 记重量、次数、可选的 RPE（自感用力程度）。**每按一次 ✓ 立刻存盘**，练到一半锁屏、关浏览器、手机没电，回来还在
- **组间休息计时器**：默认 90 秒可调，结束有三声提示音
- **历史记录**：按日期倒序，可以只看某个动作的历史（对比自己三个月前的重量）
- **统计图表**：每周总容量、单个动作的最大重量 / 总容量 / 估算 1RM 趋势、体重体脂变化
- **训练模板**：内置"推日 / 拉日 / 腿日"，一键套用；也能自己建
- **身体数据**：身高、体重、体脂。**没有体脂秤也能看**——填一次性别和出生年份，App 就按身高体重自动估一个体脂率；它和你自己称出来的分开标记（`≈18.4% 估算` / `21% 实测`），绝不混在一起
- **导出 / 导入**：整份数据导出成一个 JSON 文件
- **日间 / 夜间**：设置里点一下切换。日间是白底，夜间是原来的深色；选了记得住，下次打开还是它

---

## ⚠️ 请先读这一段：数据安全

这个 App **没有云端备份**（这是设计如此，不是缺陷）。这意味着：

> **清一次浏览器缓存，或者换一台手机，你的全部训练记录就没了。**

所以有两件事**务必**做：

1. **把它"添加到主屏幕"**（iPhone 用 Safari、安卓用 Chrome，菜单里都有这一项）。
   装成 App 之后，iPhone 有一条"7 天没打开就清掉网站数据"的规矩**不适用**于它；不装的话，隔一周没练就真可能被清空。
2. **每周导出一次备份**：设置 → 导出备份 → 把文件发到微信收藏。

---

## 本地跑起来

需要电脑上装有 [Node.js](https://nodejs.org/)（20.19 以上版本）。

```bash
npm install      # 第一次跑之前执行一次，下载依赖
npm run dev      # 启动开发服务器
```

然后打开终端里显示的 `http://localhost:5173`。

**想用手机试**：

```bash
npm run dev -- --host
```

手机连**同一个 WiFi**，浏览器打开终端里显示的那个 `http://192.168.x.x:5173` 地址。
（注意：手机上不能用 `localhost`，那个地址指的是手机自己。）

---

## 打包和部署

```bash
npm run build    # 打包，产物在 dist/ 目录
npm run preview  # 本地预览打包后的效果
```

打包产物是一堆纯静态文件，**任何静态网站托管都能放**。部署到 GitHub Pages 的话：

1. 把代码推到 GitHub 仓库
2. 仓库的 Settings → Pages → Source 选 `Deploy from a branch`，分支选 `main`、目录选 `/root`
3. 等一两分钟，访问 `https://你的用户名.github.io/仓库名/`

> 项目里 `vite.config.ts` 已经把 `base` 设成了 `'./'`（相对路径），所以放在带子目录的地址下（比如 `/nanofit/`）也能正常工作，不用改配置。

---

## 📱 安卓 App（Capacitor 套壳）

网页版之外还套了一个安卓壳 —— 壳里跑的是**同一份代码**，所以功能完全一样，不是两个项目。

```bash
npm run build          # 先打包网页
npx cap sync android   # 再把网页产物和插件同步进安卓工程
```

改完代码要更新到安卓，就是这两句。**注意 `npm run dev` 不会影响安卓** —— 它动的是开发服务器，安卓读的是 `dist/`。

### 打包成 APK 需要先装两样东西

本机目前**两个都没有**：

- **Java 21** —— 不是随便哪个版本都行。依据：`android/app/capacitor.build.gradle` 里写死了 `sourceCompatibility JavaVersion.VERSION_21`
- **安卓 SDK**

最省事的是装 [Android Studio](https://developer.android.com/studio)（约 1.5 GB），一次把这两样都装好，还带图形界面能点。

### 安卓端和网页版不一样的地方

| 地方 | 网页版 | 安卓端 |
|---|---|---|
| 数据存哪 | 浏览器 localStorage | 原生 SharedPreferences（`/data/data/<包名>/shared_prefs/`） |
| 屏幕常亮 | 浏览器 Wake Lock（**必须 https 才生效**） | 原生 KeepAwake 插件 |
| 震动 | `navigator.vibrate`（iPhone 不支持） | 原生 Haptics 插件，力度可调 |
| 地址栏／状态栏颜色 | `theme-color` 那个 meta | `@capacitor/status-bar` 插件 |
| 物理返回键 | 没有这个概念 | 分层返回（见下） |
| Service Worker | **要**，离线能力全靠它 | **不要**，见下 |

分流全靠 `Capacitor.isNativePlatform()`。**浏览器里它永远是 false**，所以网页版走的还是老路，一点没变。

### 物理返回键（返回栈）

`src/lib/backbutton.ts` 是个很小的"返回栈"。按返回键时，从**最后登记的**往前问：

1. 在「设置」的子页面（动作库／模板／身体数据）→ 退回设置列表
2. 训练进行中 → 弹窗确认（记录其实已经存好了，只是别让人手滑退出去吓一跳）
3. 不在训练页 → 切回训练页
4. 已经在训练页 → 退出 App

> ⚠️ **改的时候注意**：`App.tsx` 里那个监听**必须只挂一次**（依赖数组留空），当前在哪个 tab 用 ref 现读。
> 如果改成依赖 `[tab]`，每次切 tab 都会重新挂监听，而返回栈的规矩是**后登记的优先** ——
> App 的处理器会爬到设置页上面，结果在身体数据页按返回时会直接跳到训练页，把设置列表那层跳过去。

### 为什么原生壳里不要 Service Worker

Service Worker 的拿手好戏是"断网也能打开"，靠的是把文件存进浏览器缓存。
但安卓 App 的网页文件本来就打包在 App 内部，**断网照样能打开**，离线是白送的。

而它在原生壳里反而会帮倒忙：

- 它是"缓存优先"的 —— 你改了代码重新打包安装，它还把旧文件端出来，
  结果就是"我明明重装了 App，界面还是老样子"，这种问题极难查
- 原生壳里的缓存和网页版的互不相干，多这一层只是多一个出错的地方

所以原生壳里直接跳过注册。**网页版的注册一个字没动** —— GitHub Pages 上的离线能力照旧。

### 安卓图标怎么改

源图只有一个：`public/favicon.svg`。改完之后跑两步：

```bash
node gen-android-icons.mjs   # 生成 5 张源图到 assets/
npx capacitor-assets generate --android \
  --iconBackgroundColor '#121212' --iconBackgroundColorDark '#121212' \
  --splashBackgroundColor '#121212' --splashBackgroundColorDark '#121212'
```

> ⚠️ **前景层不能随便放大**。安卓自适应图标的"安全区"是画布正中间的一个**圆**，
> 所以判断标准跟"图形有多宽"**无关**，要看**离中心最远的那个笔画有多远**（要 ≤ 50%）。
> 完整推导写在 `gen-android-icons.mjs` 里 `FOREGROUND_SCALE` 那个常量的注释里 —— 改之前先读它。

---

## 🔧 出问题了怎么办（急救三步）

### 1. 界面看着不对，或者"我改了代码但打开还是老样子"

这是 **Service Worker（负责离线的小工人）把旧版本缓存住了**。按顺序试：

- **手机上**：浏览器设置 → 找到这个网站 → 清除网站数据。（⚠️ 先确认你的数据已经导出备份过！）
- **电脑上**：按 `F12` → `Application` 面板 → 左边 `Service Workers` → 点 `Unregister`；再到 `Storage` → 点 `Clear site data`

如果这招反复出现，把 `public/sw.js` 里的 `nanofit-v1` 改成 `nanofit-v2`，重新部署一次 —— 新工人上任时会把旧仓库整个删掉。

### 2. 数据好像不见了

**先别清缓存、先别做任何操作。**

打开 设置 → 点"导出备份"。**如果能导出并且文件里有内容，数据就还在**，只是某个页面显示出了问题，把现象告诉开发者即可。

### 3. 装到手机桌面后打不开 / 图标不对

- 确认是通过 `https://` 访问的（本地的 `http://192.168.x.x` 装不成 PWA，浏览器不允许）
- iPhone 上必须用 **Safari** 打开才能"添加到主屏幕"，Chrome 不行

---

## 开发说明

### 技术栈

Vite + React + TypeScript + Tailwind CSS v4 + recharts。
没有后端、没有数据库、没有登录。状态管理只用 `useState`，**没有引入路由库** —— 四个页面靠一个变量切换。数据全部存在 `localStorage`。

### 目录结构

```
src/
  types.ts              所有数据的"形状"定义（改数据结构只改这一个文件）
  data/
    exercises.ts        40 个预置动作
    templates.ts        3 个预置模板
  lib/
    storage.ts          ★ 唯一碰 localStorage 的地方
    date.ts             本地日期处理（避开时区坑）
    calc.ts             容量、1RM 等公式
    stats.ts            把训练记录汇总成图表数据
    json.ts             导出 / 导入备份
    beep.ts             提示音合成
    wakelock.ts         休息期间保持屏幕常亮
    id.ts               生成不重复编号
  components/           可复用的小零件
  screens/              整页的界面
CLAUDE.md               本项目的开发约定
PLAN.md                 施工图（功能、数据模型、阶段划分）
```

### 几处"看起来奇怪但故意这么写"的地方

改代码前建议先看一眼，以免"优化"掉它们：

| 位置 | 为什么这么写 |
|---|---|
| `lib/date.ts` | **不能**用 `toISOString()` 取日期。它给的是格林威治时间，北京时间**凌晨 0 点到 8 点**之间会得到"昨天"，晨练记录会记错日子 |
| `lib/id.ts` | `crypto.randomUUID()` 在手机用局域网地址（`http://192.168.x.x`）访问时是 `undefined`，必须降级 |
| `lib/beep.ts` | 从后台切回前台时，`AudioContext` 是挂起状态，`resume()` 是**异步**的 —— 不等它完成就播放，声音会被丢掉 |
| `components/RestTimer.tsx` | 只存"休息到几点结束"，**不存**"还剩几秒"。手机后台会把定时器降频到一分钟一次，按秒递减的写法会走不准 |
| `components/ChartCard.tsx` | 图表外面那层 `div` 的**固定高度不能删**。recharts 靠它算高度，没有高度会画出一片空白且不报错 |
| `screens/TrainScreen.tsx` | "结束训练"必须**先确认存进历史成功**再清空"正在进行"，顺序反了会在存储满时丢掉整次训练 |
| `screens/StatsScreen.tsx` | 一张图只画一个指标，**不做双纵轴**（重量和容量数值差上百倍，画在一起会互相压平） |
| `lib/calc.ts` 的体脂公式 | 算的是"这个身高体重年龄性别的**人群平均**"，误差有 ±4～5 个百分点，**肌肉多的人会被算高**。所以界面上永远标着"估算"，绝不假装是称出来的 |
| `screens/BodyScreen.tsx` 保存时"补齐不替换" | 同一天再存一次，只覆盖你这次填了的格子。整条替换的话，先记体重、再补记身高时会把体重弄丢 |
| `src/index.css` 的颜色变量 | 全站颜色只在 `@theme` 里定义一次，日间那套在 `:root[data-theme='light']` 里整套覆盖。**不要**改成给单个元素写两遍（`bg-white dark:bg-[#121212]`）—— 几百处里漏一处，日间模式下就是白底白字 |
| `screens/StatsScreen.tsx` 的 `chartColors()` | recharts 要的是实际色值，不认 `bg-brand` 这种类名。写死十六进制的话，切到日间模式线还是深色那套，白底上几乎看不见 |
| `lib/theme.ts` 的 `applyTheme()` | 它顺手改 `<meta name="theme-color">`。不改的话，日间模式页面是白的、手机顶上却压着一条黑边 |
| `index.html` 里那段小脚本 | 必须在样式表之前跑。删掉它，夜间模式每次打开会先闪一下白光 |
| `public/sw.js` 的缓存版本号 | 改了 favicon.svg、icons/、manifest 这些**文件名不变**的文件，必须把 `CACHE_VERSION` 升一位，否则手机上永远是旧的 |
| `public/manifest.webmanifest` 的 `background_color` | 写死是深色。它是**启动开屏那一下**的颜色，改不了（清单文件是静态的，跟不上主题切换）。所以日间模式下点开 App 会先闪一下深色再变白 —— 已知的小瑕疵，不影响使用 |
| `lib/theme.ts` 改 iPhone 状态栏那一段 | 没法在电脑上验证，需要真 iPhone 装成 PWA 才看得出。安卓不看这个 meta |
| `main.tsx` | Service Worker **只在正式打包后注册**。开发时也注册的话，改了代码浏览器会一直显示旧版本 |

### 代码推不上去怎么办（国内网络的常态）

`git push` 报 `Connection was reset` 或者 `Could not connect to server`，八成不是你的错，是 `github.com` 被卡了。先判断是哪个域名不通：

```bash
curl -s -o /dev/null -w "%{http_code}\n" -m 8 https://github.com      # 000 = 不通
curl -s -o /dev/null -w "%{http_code}\n" -m 8 https://api.github.com  # 200 = 通
```

**只要 `api.github.com` 通、`github.com` 不通**，就是典型的域名级封锁。本项目已经配好了走代理（写在 `.git/config` 里，**只影响这一个项目**，不动你的全局设置）：

```bash
git config --local http.proxy http://127.0.0.1:7897   # 这台机器上的 Clash Verge 监听这个端口
git config --local --unset http.proxy                 # 想去掉就执行这句
```

> ⚠️ **代理软件没开着的时候，`git push` 同样会失败**（会提示连不上 7897）。
> 要么把代理开起来，要么执行上面那句 `--unset`。

**另一条路：SSH。** 走 22 端口，实测**不开代理也能连**，比 HTTPS 稳。本机已经生成好密钥了（`~/.ssh/id_ed25519`），只差登记到 GitHub：

1. 打开 https://github.com/settings/ssh/new ，把 `~/.ssh/id_ed25519.pub` 的**整行内容**粘进去
2. `git remote set-url origin git@github.com:7Nanometer/nanofit.git`

---

### 图标怎么改

图标源文件是 `public/favicon.svg`，改完执行：

```bash
npm install --no-save sharp   # 转换工具，只在生成图标时需要
node gen-icons.mjs            # 生成各种尺寸的 PNG
```

---

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run dev -- --host` | 启动并允许手机通过局域网访问 |
| `npm run build` | 打包（会先做 TypeScript 类型检查） |
| `npm run preview` | 本地预览打包结果 |
| `npm run lint` | 代码检查 |
