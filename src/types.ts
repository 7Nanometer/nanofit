// ============================================================
// 全项目的"字典"
// ============================================================
// 所有数据的"形状"都定义在这一个文件里。
// 其他文件都从这里取用，好处是：想改数据结构，只改这一处，全项目跟着变。
//
// 【为什么这里不用 enum】
// 你装的 TypeScript 6.0 默认开了一个叫 erasableSyntaxOnly 的检查，
// 它不允许用 enum（一种老式的"枚举"写法，用来表示"只能从几个固定选项里选一个"）。
// 所以这里用 "as const 数组 + 派生类型" 这种更现代的替代写法，效果完全一样。
// ============================================================

// ---------- 肌群 ----------

// 八个肌群的"代号"。用英文是因为代号要写进数据里，英文更稳、不会有编码问题。
//
// 【2026-09-24 从 6 个扩到 8 个】
//   原来的 6 个是纯力量肌群。加了有氧功能之后，多出来两类放不进去：
//     fullbody（全身）—— 硬拉、农夫行走这种"哪都练"的，塞进任何一个单肌群都是骗人
//     cardio（有氧）  —— 跑步机这种根本不是练肌肉的
//   加值本身是安全的：老数据里只可能出现前 6 个，加新的不会让它们变得不合法。
export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'fullbody',
  'cardio',
] as const

// 从上面那个数组自动推导出类型：只有这 8 个值之一才算合法。
// 有了它，以后把 'chest' 打成 'cheast' 时编辑器会立刻标红。
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

// 代号 → 中文。界面上给用户看的永远是中文。
//
// ★ 这是个"穷尽"的 Record：MuscleGroup 里有的，这里必须有。
//   哪天再加一个肌群却忘了写中文，编译时就会直接报错 ——
//   让编译器替人检查，比靠人记住靠谱。这不是巧合，是故意选的写法。
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  arms: '手臂',
  core: '核心',
  fullbody: '全身',
  cardio: '有氧',
}

// ---------- 动作 ----------

// 标准器械词表（2026-09-24 定）。
//
// 【为什么要有这张表】
// 原来 equipment 是自由文字，想填什么填什么。想按器械筛选就不行了 ——
// 一个人写"杠铃"，另一个人写"barbell"，还有写"奥运杠"的，筛"杠铃"全漏掉。
// 所以定八个标准词，界面上的筛选按钮就是从这张表长出来的。
//
// 【史密斯为什么要单列】
// 它其实是"固定器械"，但在健身房它就是单独一档。跟固定器械合并的话，
// 点"固定器械"会出来几十条，里面既有推胸机也有史密斯深蹲，筛选就废了。
export const EQUIPMENTS = [
  '杠铃',
  '哑铃',
  '史密斯',
  '固定器械',
  '绳索',
  '自重',
  '壶铃',
  '有氧器械',
] as const

export type Equipment = (typeof EQUIPMENTS)[number]

// 判断"某个器械是不是标准词表里的"。
//
// 【为什么要单独做一份 Set】
// 数组的 includes 得从头翻到尾，而且 EQUIPMENTS 是字面量元组，
// 拿一个普通的 string 去 includes 会因类型不匹配而报错。
// 用 Set<string> 查找快，也顺手绕开了那个类型问题。
export const EQUIPMENT_SET: ReadonlySet<string> = new Set(EQUIPMENTS)

// 动作的两大类。
//
// ★ 这个字段是**可选**的，老数据里根本没有（那时只有力量动作）。
//   读取时必须兜底 `kind ?? 'strength'`，绝不能不判断就当成有氧。
//   兜底要写在"用它的地方"，不能只写在导入备份的地方 ——
//   因为手机里已经存着的老数据不会经过导入，它是直接躺在盘上的。
export type ExerciseKind = 'strength' | 'cardio'

// 一个动作 = 动作库里的一行，比如"杠铃卧推"
export type Exercise = {
  id: string // 身份证号，不重复
  name: string // 中文名，如"杠铃卧推"
  muscleGroup: MuscleGroup // 属于哪个肌群
  // 用什么器械。新数据一定是上面 EQUIPMENTS 里那八个之一。
  //
  // ★ 类型故意保持宽泛的 string、不收紧成 Equipment —— 因为：
  //   老版本允许自由填写，你手机上已有的自建动作里可能存着"史密斯机"
  //   "龙门架"这类词。类型收紧后 TypeScript 编译能过，但**运行时的值
  //   仍然是任意字符串**，查表会得到 undefined，界面上就渲染出一个
  //   光秃秃的 "undefined"。保持 string，显示时原样渲染，永不崩。
  equipment: string
  isCustom: boolean // true = 你自己建的，false = 系统预置的
  kind?: ExerciseKind // 力量还是有氧。没写 = 力量（老数据都走这条）
  note?: string // 问号表示"可以没有"。一句话动作要领
}

// ---------- 一组 ----------

// 一条记录。绝大多数时候是"你做的一组"：多重、几次、累不累。
// 有氧也是用这个形状存的（见下面 durationSec / distanceM）。
export type SetEntry = {
  id: string
  exerciseId: string // 做的是哪个动作
  // 重量。注意：0 是合法的（引体向上、平板支撑就是 0），不代表"没填"
  //
  // ★ 有氧记录也填 0，而不是把这个字段改成"可选"。为什么？
  //   全项目有 6 处会拿它做乘法（容量、1RM、周柱状图…），
  //   一旦是 undefined，算出来就是 NaN，然后这个 NaN 会顺着图表一路
  //   污染下去 —— 而且界面上只是显示成 "NaN"，不会崩，极难查。
  //   填 0 的话：0 × 0 = 0，容量统计天然不受影响，一行都不用改。
  //   代价只是"显示"那几处要按 kind 分开渲染，那是小改动。
  weightKg: number
  reps: number // 次数。有氧填 0，原因同上
  rpe?: number // 自感用力程度 1-10，可以有 7.5 这种小数。可以没有
  completedAt: string // 完成时间。存成文字（localStorage 只能存文字）

  // ---------- 以下两个只有有氧记录会填 ----------
  // 有氧用时（秒）。跑步机跑了 30 分钟就是 1800。
  //
  // 注意别和 WorkoutSession.durationSec 搞混 —— 那个是"整场训练练了多久"，
  // 这个是"这一条有氧做了多久"。名字一样是因为含义确实一样，只是层级不同。
  durationSec?: number
  // 距离（米）。填 5000 就是 5 公里。
  // 可选 —— 跑步机上只看时间不看距离的人可以不填。
  distanceM?: number
}

// ---------- 计划项（模板里的一行）----------

// "这次训练打算做：卧推 4 组、每组 8 次"
export type PlannedItem = {
  exerciseId: string
  targetSets: number // 目标组数
  targetReps: number // 目标次数
  targetWeightKg?: number // 可选的预填重量
}

// ---------- 一次训练 ----------

export type WorkoutSession = {
  id: string
  date: string // 形如 '2026-09-23'。★必须是本地日期，不能是国际时间，原因见 lib/date.ts
  name?: string // 名字，通常来自模板，如"推日"
  entries: SetEntry[] // 这次训练做的所有组
  note?: string
  durationSec?: number // 练了多久（秒）
  startedAt?: string // 开始时间，用来算 durationSec
  templateId?: string // 套用的是哪个模板
  plannedItems?: PlannedItem[] // 套用模板后生成的计划清单
  exerciseIds?: string[] // 这次训练包含哪些动作。★数组的先后顺序 = 界面上从上到下的顺序
}

// ---------- 训练模板 ----------

export type Template = {
  id: string
  name: string // 如"推日"
  items: PlannedItem[] // 数组的先后顺序就是动作的先后顺序
}

// ---------- 性别 ----------

// 体脂率公式里，"男"和"女"用的常数不一样，算出来能差 10.8 个百分点，
// 所以这个必须问一次，不能瞎猜一个。
export const SEXES = ['male', 'female'] as const

export type Sex = (typeof SEXES)[number]

// 代号 → 中文。跟在肌群那边是同一套写法。
export const SEX_LABELS: Record<Sex, string> = {
  male: '男',
  female: '女',
}

// ---------- 身体数据 ----------

// 体脂率是从哪来的。这两个绝不能混在一起分不清：
//   'measured' —— 你用体脂秤/体测仪量出来的、手填进去的
//   'formula'  —— App 按身高体重年龄性别，用公式估算的
// 2026-09-23 之前的旧记录没有这个字段，一律当成 'measured'（那时候只能手填）。
export type BodyFatSource = 'measured' | 'formula'

// 某一天量的一次数据。date 当身份证号用：一天只有一条
export type BodyMetric = {
  date: string // '2026-09-23'
  weightKg?: number
  heightCm?: number // 2026-09-23 按你的决定加入
  bodyFat?: number // 体脂率，如 18 表示 18%
  bodyFatSource?: BodyFatSource // 这个体脂率是"称的"还是"算的"
}

// ---------- 设置 ----------

// 外观：日间（白底）还是夜间（原来的深色）。
// 注意这个类型定义在这里、而不是在 lib/theme.ts —— 因为它是一份**要存进储物柜的数据**，
// 而 types.ts 是全项目数据形状的唯一出处。theme.ts 反而要从这里引用它。
export type Theme = 'light' | 'dark'

export type Settings = {
  restSec: number // 组间休息默认多少秒
  rpeEnabled: boolean // 要不要在界面显示 RPE 那一栏
  sex?: Sex // 体脂率公式要用。没填过就是 undefined
  // 存"出生年份"而不是"年龄"：过生日的时候年龄会自己长一岁，你永远不用管它。
  // 存年龄的话，忘了改就会一直用一个偏小的数，算出来的体脂率悄悄偏掉。
  birthYear?: number
  theme?: Theme // 没选过就是 undefined，一律按夜间显示
}

// 第一次打开 App 时用的默认设置
export const DEFAULT_SETTINGS: Settings = {
  restSec: 90,
  rpeEnabled: true,
}
