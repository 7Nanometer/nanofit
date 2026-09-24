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

Exercise { id, name, muscleGroup, equipment, isCustom, kind?, note? }
SetEntry { id, exerciseId, weightKg, reps, rpe?, completedAt, durationSec?, distanceM?, kcal? }
WorkoutSession { id, date, name?, entries: SetEntry[], note?, durationSec?, startedAt?, metLevel?, restEndsAt? }
Template { id, name, items: { exerciseId, targetSets, targetReps }[] }
BodyMetric { date, weightKg, heightCm?, bodyFat?, bodyFatSource? }
Settings { restSec, rpeEnabled, sex?, birthYear?, theme?, defaultWeightKg?, lastMetLevel? }

肌群 8 个：chest / back / legs / shoulders / arms / core / fullbody / cardio
器械 8 种：杠铃 / 哑铃 / 史密斯 / 固定器械 / 绳索 / 自重 / 壶铃 / 有氧器械
力量强度档 4 个：low(3.0) / moderate(3.5) / high(6.0) / circuit(8.0)

2026-09-23 按主人决定：
- BodyMetric 加 heightCm
- 同日加 bodyFatSource：'measured'（自己称的）/ 'formula'（公式算的）。
  这两个数在界面上必须分开显示，绝不混在一起。没有这个字段的老记录一律当 measured。
- Settings 加 sex 和 birthYear（体脂率公式要用）。存出生年份而不是年龄，过生日自动长一岁。
- Settings 加 theme：'light' / 'dark'。没选过（undefined）一律按夜间，和原来的观感一致。

2026-09-24 按主人决定（加有氧）：
- MUSCLE_GROUPS 从 6 个扩到 8 个，新增 fullbody（全身）和 cardio（有氧）。
  MUSCLE_LABELS 是穷尽 Record，漏写中文会编译报错——这是故意的，别绕开。
- 新增 EQUIPMENTS 词表（见上）。`Exercise.equipment` **类型保持 string 不收窄**，
  因为老自建动作里可能有"史密斯机"这种自由文字，收窄后运行时照样是任意字符串，
  查表得 undefined。改为"只在新建表单和筛选按钮里用 EQUIPMENTS 约束新数据"。
- Exercise 加 kind：'strength' / 'cardio'，**可选**。读取一律走
  `exerciseKind(e)`（在 src/data/exercises.ts），内部兜底 `kind ?? 'strength'`。
  ★ 兜底必须写在消费点：手机盘上已有的老数据不经过导入备份，只在导入点补字段会漏。
- SetEntry 加 durationSec? 和 distanceM?（有氧用）。
  ★ weightKg / reps **保持必填**，有氧记录填 0。改成可选会让全项目 6 处算出 NaN
  并污染所有图表，而填 0 时 0×0=0 天然无害，只需在"显示"处按 kind 分支。
- 有氧记录进**现有的 entries 数组**，靠 exerciseId 指向动作 + exerciseKind 区分。
  ★ 不新开存储键：另开键必须同步改 json.ts 的 buildBackup/importBackup/isBackup，
  那才是真会丢数据的地方。塞进 entries 则历史页、导出、导入全自动带上。
- 分流靠 `cardioIdSet(all)` 把 sessions 切成"只有力量"和"只有有氧"两份视图，
  再喂给现有统计函数——**stats.ts 的函数签名一个都不用改**。
- 有氧公式（src/lib/calc.ts）：田径场第 1 道算 400 米，每往外一道 +7 米；
  配速 = 秒 ÷ 公里数。
- **不做 GPS 定位测距**（主人明确否决：耗电、精度、权限链路，且会偏离"记录本"定位）。

2026-09-24 按主人决定（加热量估算）：
- ★★★ **界面上一律写"约 XXX 千卡"，绝不写"消耗 523 千卡"。**
  MET 公式的实测偏差本来就有 10–20%，写成精确数字是在骗人。
  凡是显示热量的地方，附近必须有"这是估算、不含运动后持续燃烧"的说明。
- 公式 `消耗 = (MET − 1) × 体重(kg) × 时长(小时)`，减 1 是为了只算
  "运动额外多消耗的"，不含躺着也要烧的基础代谢。**界面上必须解释这一点**，
  否则主人拿它跟手环对数字（手环常给总消耗）会困惑。
- SetEntry 加 kcal?（有氧器械上显示的数值，填了就用它）；力量动作**不开**
  这个口子 —— 健身房里没哪台器械会告诉你"这次深蹲烧了多少"。
- WorkoutSession 的 durationSec **从这天起真的写上**（之前是纯占位，
  全项目零写入零读取）。在 finishWorkout 里写，取"开始 → 点结束那一刻"，
  ★ 必须含组间休息：MET 档位是按整场平均强度定的，只算做组时间会严重高估。
- Settings 加 defaultWeightKg? 和 lastMetLevel?。体重优先取 BodyMetric
  最近一次，都没有才用 defaultWeightKg，再没有就不显示热量。
- ★ **混合训练的时长要去重**：一次训练里既有力量又有有氧时，
  力量部分 = 整场时长 − 有氧总时长。直接用整场时长会把跑步那段算两遍。
- 力量档位推荐（src/lib/kcal.ts 的 recommendMetLevel）。优先级从高到低：
  ★★ **第一步：记了 RPE 就信 RPE。** 取所有力量组的 RPE **中位数**
    （≥8 高、6–7 中、<6 低；再叠一条"每组之间隔不到 60 秒"→ 循环训练）。
    理由：RPE 是用户**亲口说的"这一组有多难"**，而"休息多久""练了哪些动作"
    都只是间接推测。2026-09-24 之前系统放着 RPE 不用去猜，
    结果"倒蹬机 90kg×8 练到 RPE 10、16 组、42 分钟"被判成低强度，热量差 2.5 倍。
    ★ 取中位数不取最大值：热身组常常只有 5–6 分，取最大值的话
      一组冲到 10 就把整场带偏（和下面休息那里用中位数是同一个道理）。
  没记 RPE 才退回按数据推测（取第一个命中的）：
    ①每组之间隔不到 60 秒→循环 ②含大重量复合动作→高强度 ③时长<30分或组数<8→低强度 ④中等
  ★ 中位数不用平均数：中间接个电话就会把平均数彻底带偏。
  ★ 推荐和落盘必须用**同一个时长**（都走 TrainScreen 的 completedSession()），
    否则会在"不到 30 分钟算低强度"这条分界线上打架。
  ★ 它返回 `{ level, reason }`，理由和档位必须从**同一个函数**里出来。
    另写一个 explain 函数的话两份判断逻辑一定会走偏，
    到时候界面上的理由和实际用的档位对不上，比不说还糟。
- HEAVY_COMPOUND_IDS = "能上大重量的多关节推 / 拉 / 蹲 / 髋铰链"，
  杠铃 + 史密斯 + 固定器械 + 绳索都算（2026-09-24 从 14 个补到 26 个）。
  ★ 有判据地**不加**：单侧单臂变体、辅助引体向上（那是"借力做引体"的机器，
    恰恰是**轻**的信号不是重的）、下拉的握法变体（父类已覆盖）、孤立动作。
- 结束训练时弹 MetPicker（src/components/MetPicker.tsx）让主人确认档位。
  ★★ **打开时默认选中的永远是"本次推荐"，不是"上次选的"。**
    以前是 `settings.lastMetLevel ?? recommended` —— "上次选的"永远赢，
    而 lastMetLevel 一旦写进去，全项目**没有任何地方会作废它**，
    一次选错就永久错下去。这就是 2026-09-24 那次热量偏低的直接原因。
    现在"沿用上次"降级成一个**要自己点**的快捷按钮（出现了但不自动选中）。
  ★ lastMetLevel 读的是"点结束训练那一刻现读"的值，不是页面挂载时的
    settings —— 一次打开 App 里练两场的话，挂载时那个值是过时的。
  ★ 选的和建议不一样时，必须用主色写**一句完整的话**
    （"你选的是 X，和系统建议的 Y 不一样，热量会按你选的算"）。
    只在按钮上挂一个小「建议」标签是不够的：用户根本注意不到，
    出了事也不知道自己选的和系统想的不一样。
- ★ 没有体重时，统计页那一节**整节不显示**，改成一句"填个体重就能看到热量统计"；
  设置页「默认体重」那行的 hint 也是这句。显示一堆 0 只会让人以为坏了。
- 统计页那一节的说明文字（不含运动后持续燃烧、为什么减 1、跟手环对不上是正常的、
  误差 10–20%）**不是客套话，是这个功能的一部分，不许删**。

localStorage 前缀 nanofit:v1:。读写集中在 src/lib/storage.ts。支持导出/导入 JSON。

## 界面

移动优先 375px，桌面居中最大 480px。
点击区最小 44×44px。重量与次数输入用 inputMode="decimal"。
底部 4 tab：训练 / 历史 / 统计 / 设置。

动作库（设置 → 动作库）有**两条筛选条：肌群 + 器械，叠加生效**
（选"胸"+"哑铃" = 哑铃练胸的动作），再叠加搜索框里打的字。

- 器械条上那个"其他"按钮**只在存在非标准器械的自建动作时才出现**。
  老版本允许自由填器械，不兜住的话那些动作在任何器械按钮下都看不见，
  像是数据丢了。
- 训练页的选动作弹层（ExercisePicker）**不加器械条** —— 它在训练中间用，
  少一层操作更重要；想按器械找直接搜"史密斯"就行（器械名也在搜索范围内）。

### 配色：两套，靠 CSS 变量整套切换

夜间（默认）：底 #121212 / 卡片 #1E1E1E / 主色 #FF4D2E / 橙红上的字 #121212
日间：底 #FFFFFF / 卡片 #F5F5F4 / 主色 #D93A1E / 橙红上的字 #FFFFFF

- **颜色只在 src/index.css 的 @theme 里定义一次**，日间那套写在 `:root[data-theme='light']` 里整套覆盖。
  切换时 JS 只做一件事：往 `<html>` 挂 `data-theme="light"`。
- **绝不要**给单个元素写两遍（`bg-white dark:bg-[#121212]`）—— 几百处里漏一处，日间模式下就是白底白字。
- 日间的主色必须比夜间深一档：鲜橙红 #FF4D2E 在白底上当文字只有 3.3:1，达不到 4.5:1。
- 图表颜色不能写死十六进制（recharts 不认 CSS 类名），用 `lib/theme.ts` 的 `chartColors()` 现读。

## 公式

训练时长（2026-09-24 补的显示和修正，算法一直在 src/lib/kcal.ts 的 sessionSeconds）：
  · **开始时刻** = 第一次加动作那一刻（`startedAt`，在 addExercise /
    applyTemplate / addCardio 三处都是 `base.startedAt ?? new Date()`，
    写完就不覆盖）。**有意的**：不做"开始计时"按钮 ——
    手动点的毛病是**会忘**，一忘就是整场没计时；自动开始最多差十几分钟，
    而且随时能改（见下）。
  · **结束时刻** = 点"结束训练"那一刻。★ 所以它包括**组间休息**
    （热量那套 MET 档位是按整场平均强度定的，只算做组时间会严重高估）。
  · ★★ **超过 6 小时（SESSION_STALE_MAX_SEC）就按"最后一组的时间"算结束**，
    不按"现在"。练完忘点结束、隔一夜才打开 App，不保护的话会记成
    20~72 小时、热量上万。
    ★ 这是"换成拿用户自己的最后一组当依据"，**不是**发明一个上限去截断 ——
      截掉的那几个小时是编的，而"最后一组记到几点"是用户记的。
      而且硬砍 6 小时会误伤"昨晚练到 00:30"这种真实情况（最后一组就在 00:20）。
    ★ 判据用**时长**不用"日期是不是今天"：早上 8 点开练、当天晚上 8 点
      才打开，开始日期还是今天，但照样会记成 12 小时。
    ★ 训练页顶部要出横幅说清楚（用户会以为系统擅自改短了他的时长）。
  · ★★ **结束时刻要在点"结束训练"那一刻冻结**（TrainScreen 的 finishEndISO），
    面板显示和最终落盘都用它。面板开着时用户可能磨蹭几分钟，
    两处各读一次表就会"面板写 42 分钟、存进去 44 分钟"。
    ★ 这就是"推荐时长 ≠ 落盘时长"那个坑的同一类，**已经踩过两次了**
      （第一次是推荐档位和热量用了不同的时长）。以后凡是"显示一个数、
      待会儿再存同一个数"的地方，都要先问一句：这两处读的是同一次吗？
    ★ 纯有氧那条路要把 endISO **显式传下去**：同一个事件处理函数里
      setState 还没生效，紧接着读那个 state 拿到的是旧值。
  · **开始时间可以改**（components/StartTimeEditor.tsx，入口在选档面板里）：
    用户几点开始热身 App 猜不到，只能让他自己往回推 ——
    猜不到的事就别猜。快捷档（提前 10/20/30 分钟/1 小时）+ 手填一个时刻。
    · ⚠️ 手填的时间解释成"和当前开始时间**同一天**的那个时刻"，
      日期不变。跨天的歧义说不清楚，而热身要补的也就是几十分钟。
      界面上要把这句写出来。
    · ⚠️ 不能晚于第一组（跑到第一组后面就说不通了），也不能晚于现在，超了夹住。
    · 只改正在进行的这次，**历史记录不跟着变**（和"老记录不重算档位"同一个规矩）。
  · ★ **时长的算法只有一份**：`sessionSeconds()`。stats.ts 里全是汇总
    （thisWeekDurationSec / averageSessionSec / dailyDurations），
    不重算一遍 —— 重算的话历史页的时长和统计页的总和对不上，用户没法核对。
  · ★ 算不出时长的（老记录没记开始时间）**跳过，不拿 0 顶替**：
    0 是"练了 0 秒"，混进"平均每次"的分母里会把数字往下拽。
  · 统计页的时长趋势**按天合并**（一天两次算那天的总时长），
    因为按"次"画会在同一个日期上叠两个点。合并会丢掉"那天几次"这个信息，
    所以「看数字」表多一列标出来（ProgressChart 的 extraLabel/extra，
    可选参数，别的调用点不受影响）。

容量 = Σ(weightKg × reps)
估算 1RM（Epley）= weightKg × (1 + reps / 30)
  ★ 图上画的**不是**"当天最好那一组"，是"截至那天、前 90 天里的最好水平"。
    当天最好的那个数只能反映"今天怎么练的"：今天冲大重量点就高、
    明天小重量多组点就低，同一个人练法一变曲线就抖，看不出进步。
    滚动窗口才反映能力变化。实现在 stats.ts 的 oneRmSeries()。
  ★ 只统计**次数 1~12、且重量 > 0** 的组（ONE_RM_MAX_REPS）：
    · 次数多时 Epley 会明显高估（70kg×20 推出 116kg，但那人举不起 116kg）
    · 重量 0 的自重动作推出来永远是 0，只会画出一条贴底的假线
  ★ PR 线 = 截至那天的历史最高，在循环外累积所以天然是阶梯、只升不降。
  ★ 换了一张图之后才敢删的：ExercisePoint.best1RM 是"当天最好"那个旧口径。
BMI = 体重kg ÷ 身高m²

估算体脂率（Deurenberg）：
  男 = 1.2×BMI + 0.23×年龄 - 16.2
  女 = 1.2×BMI + 0.23×年龄 - 5.4
  ★ 它算的是"这种身高体重年龄性别的人平均多少"，不是测量值。
    误差 ±4～5 个百分点，肌肉多的人会被算高。界面上必须标"估算"。

有氧（2026-09-24 加）：
  田径场单圈 = 第1道长度 + (道次 - 1) × 7 米     （第1道默认 400，可改）
  距离 = 单圈 × 圈数                            （圈数允许小数，如 12.5）
  配速（秒/公里）= 时长秒 ÷ 公里数                （缺任一项返回 null，不显示 0）
  ★ 每道 +7 米是标准场地的近似值（道宽 1.22 米），写在 calc.ts 的
    TRACK_LANE_STEP_M 里。碰上道宽不一样的场地改这一个常量。

消耗热量（2026-09-24 加，全部在 src/lib/kcal.ts）：
  消耗（千卡）= (MET − 1) × 体重(kg) × 时长(小时)
  ★ 减 1 是为了只算"运动额外多消耗的"，不含躺着也要烧的基础代谢。
    界面上必须解释，否则跟手环对数字（手环常给总消耗）会以为算错了。
  力量四档：low 3.0 / moderate 3.5 / high 6.0 / circuit 8.0
  有氧固定值：椭圆机5 动感单车7 划船机7 卧式车5 楼梯机9 风阻车10 跳绳12 开合跳8 高抬腿8
  跑步按速度插值：5km/h=3.5、6.4=6.0、8=8.3、10=9.8、12=11.8（超出按两端算）
    ★ 没填距离也没填配速时按 FALLBACK_RUN_MET=8.3（慢跑）兜底，界面要标出来
  混合训练：力量时长 = 整场时长 − 有氧总时长（不去重会把跑步算两遍）
  ★ 一律显示成"约 520 千卡"（抹到最近 10），绝不显示"523 千卡"
  ★★ **同一个页面上只能有一种精度。** 2026-09-24 出过这么一件事：
    卡片写"约 110 千卡"，下面「每周消耗」图的「看数字」表里写 113 ——
    看着像哪里算错了，用户就是顺着这个 113 反推出"用了 3.0 那一档"的。
    现在 `weeklyKcal()` 里也走 `roundKcal()`，抹在**数据那一层**，
    柱子高度/鼠标提示/看数字表/纵轴刻度一次性全统一。
  ★ 全项目**只有一份热量算法**：`explainSessionKcal()` 算出"用了哪一档、
    MET、体重、整场多久、其中有氧多久、力量按多久算、结果多少"，
    `sessionKcal()` 和 `sessionKcalSplit()` 都只是取它的字段。
    界面要展示算式时**必须**调它，绝不许照着公式在界面里重算一遍 ——
    重算的迟早会和原件走偏，那种"解释"比不解释更糟。
  ★ 统计页有一块可展开的「这些数是怎么算出来的？」，逐次列出本周用到的
    每一样输入。加它的原因就是上面那件事：页面上只有结果、没有过程时，
    用户只能靠反推去猜，猜完还得来问。

## 后台休息提醒（2026-09-24 加）

组间休息到点时，切到别的 App、锁屏也要能提醒。**原理是把"到点叫我"交给安卓系统
预约一个闹钟**，而不是让 App 自己掐表 —— App 一进后台，网页自己的定时器就被降频甚至冻住。

全部在 `src/lib/restnotify.ts`（网页端整条链路空转，一行原生代码都不执行）。

- ★★ **核心是一条不变式，只有一个出口**：
  `预约 ⟺ 在手机上 且 通知权限已给 且 App 不在前台 且 休息没结束`，其余一律取消。
  所有改状态的地方都只调 `syncRestNotify()`，不自己决定约还是取消 ——
  分开写一定会漏出口（切 tab / 点跳过 / 训练结束 / 权限被撤销…）。
- **它不接参数，自己去读存档**（`readActiveWorkout()?.restEndsAt`）：
  切 tab 会把训练页整个卸载，那时只有读存档才拿得到"休息到几点结束"。
- 通知渠道：id `rest-timer`、**重要性 4(HIGH)**、锁屏可见、开震动、**不传 sound**。
  不传 = 用系统默认通知音；传了插件只认塞进 App 的音频文件，反而容易变成没声音。
  ⚠️ **渠道的 importance 建好之后改不了**（安卓的限制，不是 bug），第一次就得对。
  ⚠️ 安卓 7 上 `createChannel` 会直接抛错，要包一层 catch。
- 通知 id **固定 1**，新的顶掉旧的 —— 同一时刻只可能存在一条休息提醒。
  `schedule.at` 必须配 `allowWhileIdle: true`（→ `setExactAndAllowWhileIdle`，
  **会唤醒睡着的手机**）。点"跳过"和结束训练时必须**成套取消**，
  否则会出现"已经进下一组了，通知还在响"。
- **权限**：通知权限在**第一次开始休息时**才申请（安卓上拒绝过之后系统
  就不再弹框了，第一次机会很宝贵）。精确闹钟用 `SCHEDULE_EXACT_ALARM`，
  **故意不用 USE_EXACT_ALARM** —— 那条自动授予、用户撤不掉，用着更舒服，
  但 Google Play 只允许"核心功能就是闹钟/计时器"的 App 用它，上架要过审 + 填声明。
  ⚠️ 安卓 14 起这个权限**默认是拒绝**的，所以引导流程是主路径、不是兜底。
  ⚠️ 撤销它时安卓会**重启 App 并清空所有已预约的精确闹钟**，
  所以每次回到前台都要重查一遍、需要时重新预约。
  没给也不用手写降级 —— 插件自己会退回不精确闹钟（`setExactIfPossible`）。
- ★ 查源码才知道的两件事，别凭印象改：
  · **Capacitor 切后台不冻结 WebView**（`Bridge.onPause()` 只是通知各插件），
    所以 `appStateChange` 里调 `schedule()` 来得及。被冻的是网页自己的定时器 ——
    而倒计时那套本来就只把定时器当"刷新画面"用，判断靠 `endsAt` 时间戳。
  · 插件的 `schedule()` 在没通知权限时**直接 reject**，必须 catch。
- 小图标 `res/drawable/ic_stat_rest.xml` 是自己画的纯白秒表（在 capacitor.config.ts 里配）。
  不配的话插件会退回系统的"ⓘ"灰图标，看着像别人的通知。
- ★ 这个功能**只能在装了 APK 的手机上验**。浏览器里整条链路是空转的 ——
  调试时不会报错，但也测不到任何东西。

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

### 版本号（2026-09-24 定的）

**每次打包前**改 `android/app/build.gradle` 这两行：

```groovy
versionCode 20260924                  // = 打包那天的日期 YYYYMMDD
versionName "2026.09.24 · 18d4d1a"    // = 日期 · 7 位存档号
```

- `versionCode` 是安卓用来比大小的，**只能往大改**；改小了会
  `INSTALL_FAILED_VERSION_DOWNGRADE`（屏幕上只显示"应用未安装"，不说明原因）
- `versionName` 是给人看的。里面那串存档号 = 这份 APK 里代码对应的 git 存档
- ★ **存档号有个先后顺序的讲究**：先把代码提交掉、拿到哈希，再把它写进
  build.gradle 提交。所以 APK 里的代码 = 那个哈希对应的存档（外加一行版本号）
- 设置页底部显示版本号（`src/components/VersionLine.tsx`），走
  `App.getInfo()` 读**手机里那个包**的 versionName，不是写死的字符串。
  浏览器里不调这个接口（AppWeb 里它是 `throw unimplemented`），显示"网页预览"
- 同一天打第二个包号不变没关系，安卓允许同号覆盖
- ★ 中文/特殊字符会不会被 Gradle 弄坏（Windows 上默认编码可能是 GBK）——
  打完后用 `aapt2 dump badging` 验一遍

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
- ★★ **签名变了的后果比想象中重**：debug 包的签名来自这台电脑的
  `~/.android/debug.keystore`（自动生成、**不随仓库走**）。
  签名一变，新版就装不上（`INSTALL_FAILED_UPDATE_INCOMPATIBLE`，
  手机上只显示"应用未安装"），只能先卸载 —— **而卸载 = 手机上的训练数据全没**，
  因为数据只在那台手机里。
  → **换电脑打包之前，先让主人导一份备份**，再动手。
  → 打包后验签名的两句命令见 README「怎么打包 APK」那节。
- Gradle 第一次下载会超时（重定向到 GitHub），要挂代理：
  `GRADLE_OPTS="-Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=7897"`。只影响第一次。

### 这些坑别再踩（都是踩过的）

- ★ **切 tab 会卸载整个页面**（App.tsx 是 `{tab === 'train' && <TrainScreen />}`），
  页面内存里的 state 全没。所以"跨 tab 要留着的东西"必须存进 localStorage。
  休息倒计时就是这么修的（WorkoutSession.restEndsAt）。
  ★ 同一个坑还在等着：**训练页的任何临时状态**（选中的动作、展开的卡片…）
  都不会跨 tab 保留 —— 加新功能时先想一句"切走再回来，这个该不该还在"
- App.tsx 里返回键的监听**必须只挂一次**，当前 tab 用 ref 读。
  改成依赖 [tab] 会让 App 的处理器爬到设置页上面，子页面按返回会跳过设置列表
- 原生壳里**不要**注册 Service Worker（否则"重装了 App 界面还是老的"），
  但网页版的注册一个字都不能动
- 安卓自适应图标的前景层，安全区是个**圆**，判断标准是"离中心最远的笔画 ≤ 50%"，
  不是"图形有多宽"。推导在 gen-android-icons.mjs 里
- `@capacitor/status-bar` 的 Style 枚举名字指的是**背景**不是字：
  夜间模式（深底）传 `Style.Dark`、日间模式（白底）传 `Style.Light`。传反了状态栏看不见
- ★★ **安卓 WebView 不会下载文件**（2026-09-24 查出来的真 bug，藏了很久）：
  网页那套"造个临时文件 + 点一下隐藏链接"的导出写法，在安卓壳里是**静默失效**的
  —— 不报错、不弹提示、JS 那边收不到任何信号，而界面上照样跳出"已导出"。
  安卓要 App 自己接一根 `DownloadListener` 才写得了文件，而 **Capacitor 没接**
  （它的安卓源码里 `DownloadListener` / `onDownloadStart` / `DownloadManager`
  一个都搜不到；官方仓库有开着的问题 #5478）。
  ★ 最能说明问题的旁证：**导入是通的、导出不通** —— Capacitor 实现了"选文件"
    那个对话框（`BridgeWebChromeClient` 的 onShowFileChooser），却没实现"存文件"。
    所以这个 App 一直能**读**备份，却永远**写不出**备份。
  正确做法在 `src/lib/savefile.ts`：手机端写进 App 缓存目录（`Directory.Cache`，
  正好在 FileProvider 允许分享的名单里）再调起系统分享面板，用户自己选存哪；
  网页端还是老路子，一个字没改。
  ★ 用户取消分享时插件是**抛错**的（`"Share canceled"`），不是正常返回 ——
    不把这种情况挑出来，用户自己关掉面板会看到"导出失败"。
  ★ Filesystem 写文件必须**显式写 `Encoding.UTF8`**：备份 JSON 里有中文动作名，
    编码搞错会导出个乱码文件，而且当场看不出来，等真要恢复时才发现。
  ★ 以后凡是"让浏览器干点什么"的写法（下载文件、`window.open`、`target="_blank"`），
    都要先问一句：**WebView 里有人管这件事吗？** 没人管的话是静默失效。
