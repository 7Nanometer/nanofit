# NanoFIT

个人健身记录 App。项目主人是编程新手，代码与沟通要让他能看懂、能自己排查。

## 铁律

1. 纯前端：不接后端、不接数据库、不做登录注册、不碰需 API Key 或付费的服务。
2. 技术栈：Vite + React + TypeScript + Tailwind CSS + recharts。状态管理只用 useState / useContext。数据存 localStorage。
3. 不写测试框架。
4. 不擅自扩范围：社交、排行、云同步、AI 教练、动作识别都不做。
5. 改代码前先 git commit。

## 沟通

中文、简短、一次一件事。不堆术语，用类比解释。需求有冲突直接说，别照着错的做。

## 这台电脑的环境（2026-09-23 记）

- **网络**：国内，`github.com` 常被卡住，`api.github.com` 通。
  机器上跑着 Clash Verge（`clash-verge.exe` + `verge-mihomo.exe`，监听 `127.0.0.1:7897`）。
  **git 不读 Windows 的系统代理设置**，所以本项目已在 `.git/config` 里配了 `http.proxy`。
  代理没开时 `git push` 会失败（提示连不上 7897）——开起来，或 `git config --local --unset http.proxy`。
  详细步骤写在 README 的「代码推不上去怎么办」。
- **`gh` 命令行**在 `/c/Program Files/GitHub CLI/gh.exe`，账号 7Nanometer。
  它连的是 `api.github.com`，**不需要代理**。但令牌只有 gist / read:org / repo 三个权限，
  动账户设置（比如加 SSH 密钥）会报 404 并要求 `admin:public_key`。
- **开发服务器**：`npm run dev`，端口 5173。真机测试用 `npm run dev -- --host` + 局域网 IP（192.168.3.21）。

## 节奏

一次只推进一个阶段，做完停下告诉主人浏览器能看到什么。
每阶段结束必须 npm run dev 无报错，并 git commit 一次。
不一次性生成十几个文件，逐个创建，每个附一句说明。

## 数据模型

Exercise { id, name, muscleGroup, equipment, isCustom, note? }
SetEntry { id, exerciseId, weightKg, reps, rpe?, completedAt }
WorkoutSession { id, date, name?, entries: SetEntry[], note?, durationSec? }
Template { id, name, items: { exerciseId, targetSets, targetReps }[] }
BodyMetric { date, weightKg, heightCm?, bodyFat?, bodyFatSource? }
Settings { restSec, rpeEnabled, sex?, birthYear?, theme? }

2026-09-23 按主人决定：
- BodyMetric 加 heightCm
- 同日加 bodyFatSource：'measured'（自己称的）/ 'formula'（公式算的）。
  这两个数在界面上必须分开显示，绝不混在一起。没有这个字段的老记录一律当 measured。
- Settings 加 sex 和 birthYear（体脂率公式要用）。存出生年份而不是年龄，过生日自动长一岁。
- Settings 加 theme：'light' / 'dark'。没选过（undefined）一律按夜间，和原来的观感一致。

localStorage 前缀 nanofit:v1:。读写集中在 src/lib/storage.ts。支持导出/导入 JSON。

## 界面

移动优先 375px，桌面居中最大 480px。
点击区最小 44×44px。重量与次数输入用 inputMode="decimal"。
底部 4 tab：训练 / 历史 / 统计 / 设置。

### 配色：两套，靠 CSS 变量整套切换

夜间（默认）：底 #121212 / 卡片 #1E1E1E / 主色 #FF4D2E / 橙红上的字 #121212
日间：底 #FFFFFF / 卡片 #F5F5F4 / 主色 #D93A1E / 橙红上的字 #FFFFFF

- **颜色只在 src/index.css 的 @theme 里定义一次**，日间那套写在 `:root[data-theme='light']` 里整套覆盖。
  切换时 JS 只做一件事：往 `<html>` 挂 `data-theme="light"`。
- **绝不要**给单个元素写两遍（`bg-white dark:bg-[#121212]`）—— 几百处里漏一处，日间模式下就是白底白字。
- 日间的主色必须比夜间深一档：鲜橙红 #FF4D2E 在白底上当文字只有 3.3:1，达不到 4.5:1。
- 图表颜色不能写死十六进制（recharts 不认 CSS 类名），用 `lib/theme.ts` 的 `chartColors()` 现读。

## 公式

容量 = Σ(weightKg × reps)
估算 1RM（Epley）= weightKg × (1 + reps / 30)
BMI = 体重kg ÷ 身高m²

估算体脂率（Deurenberg）：
  男 = 1.2×BMI + 0.23×年龄 - 16.2
  女 = 1.2×BMI + 0.23×年龄 - 5.4
  ★ 它算的是"这种身高体重年龄性别的人平均多少"，不是测量值。
    误差 ±4～5 个百分点，肌肉多的人会被算高。界面上必须标"估算"。

## 安卓打包（2026-09-23 加的）

Capacitor 套壳。**网页版和安卓端共用同一份 src/ 代码**，靠 `Capacitor.isNativePlatform()` 分流。
铁律"纯前端"依然成立 —— 壳里跑的还是一个纯前端网页，没有任何后端。

- appId `com.nanometer7.nanofit.app`（主人拍板，上架后一辈子不能改）
- appName `NanoFIT`，webDir `dist`
- 5 个插件：preferences、haptics、app、status-bar、keep-awake（社区版）。
  都只在原生端生效
- 存储：网页端仍是 localStorage、安卓端走 preferences。
  **内存快照**的设计和理由见 src/lib/storage.ts 顶部那段（改存储前必须读）
- 桌面图标链路：public/favicon.svg → gen-android-icons.mjs → assets/ → @capacitor/assets
- 物理返回键：src/lib/backbutton.ts 的返回栈

改完代码同步到安卓：`npm run build && npx cap sync android`
打包 APK：`cd android && ./gradlew assembleDebug`
详见 README 的「安卓 App」一节。

### 打包环境（2026-09-23 装好并验证过）

- **Android Studio**：`C:\Program Files\Android\Android Studio`（自带 JBR **25**）
- **安卓 SDK**：`C:\Users\Administrator\AppData\Local\Android\Sdk`
  （platforms 有 android-36 / android-37.0，build-tools 35.0.0 / 36.0.0）
- **★ 但打包不用它自带的 Java 25**：Gradle 8.14.3 只认到 Java 24，
  用 25 会报 `Unsupported class file major version 69`。
  所以另装了 **Microsoft OpenJDK 21**（`C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`），
  并在**用户级**配置 `C:\Users\Administrator\.gradle\gradle.properties` 里写
  `org.gradle.java.home=...` 指向它。那个文件不属于仓库。
- **项目路径含中文**（`Nanofit工程`）会让安卓构建工具直接拒绝干活，
  已在 `android/gradle.properties` 加 `android.overridePathCheck=true` 跳过。
  ★ 以后打包报奇怪的错，第一个怀疑这里。
- `android/local.properties` 里是 SDK 路径（已 gitignore，不进仓库）。
- Gradle 第一次下载会超时（重定向到 GitHub），要挂代理：
  `GRADLE_OPTS="-Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=7897"`。只影响第一次。

### 这些坑别再踩（都是踩过的）

- App.tsx 里返回键的监听**必须只挂一次**，当前 tab 用 ref 读。
  改成依赖 [tab] 会让 App 的处理器爬到设置页上面，子页面按返回会跳过设置列表
- 原生壳里**不要**注册 Service Worker（否则"重装了 App 界面还是老的"），
  但网页版的注册一个字都不能动
- 安卓自适应图标的前景层，安全区是个**圆**，判断标准是"离中心最远的笔画 ≤ 50%"，
  不是"图形有多宽"。推导在 gen-android-icons.mjs 里
- `@capacitor/status-bar` 的 Style 枚举名字指的是**背景**不是字：
  夜间模式（深底）传 `Style.Dark`、日间模式（白底）传 `Style.Light`。传反了状态栏看不见
