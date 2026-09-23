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
