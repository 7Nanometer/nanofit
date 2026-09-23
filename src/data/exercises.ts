import type { Exercise } from '../types'

// ============================================================
// 40 个预置动作
// ============================================================
//
// 【为什么不放进 localStorage】
// 这 40 个是"出厂设置"，直接写在代码里。好处：
//   1. 不占用你手机那点宝贵的存储空间
//   2. 跟着 git 一起存档，改错了能一键还原
//   3. 导出备份时导出的只有"你自己的东西"，文件更干净
//
// 【代价】
// 预置动作不能删、不能改。想改成自己习惯的叫法，就新建一个自建动作。
//
// 【id 的命名规矩】
// 用"器械缩写-英文动作名"的写法，比如 bb-bench-press：
//   bb    = barbell 杠铃        db    = dumbbell 哑铃
//   mach  = 固定器械            cable = 绳索
//   bw    = bodyweight 自重
// 用英文是因为 id 要长期存在数据里（历史记录会引用它），英文最稳当。
// ============================================================

export const PRESET_EXERCISES: Exercise[] = [
  // ---------------- 胸（7 个）----------------
  { id: 'bb-bench-press', name: '杠铃卧推', muscleGroup: 'chest', equipment: '杠铃', isCustom: false, note: '肩胛骨往后往下夹紧，杠铃落到乳头连线，大臂和身体约 75 度' },
  { id: 'db-bench-press', name: '哑铃卧推', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '下放到胸部两侧，推起时别把肘完全锁死' },
  { id: 'db-incline-press', name: '上斜哑铃卧推', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '靠背调到 30-45 度，主要练上胸' },
  { id: 'bw-dip', name: '双杠臂屈伸', muscleGroup: 'chest', equipment: '自重', isCustom: false, note: '身体往前倾、肘往外打开，偏下胸。重量填 0' },
  { id: 'mach-chest-press', name: '器械推胸', muscleGroup: 'chest', equipment: '固定器械', isCustom: false, note: '手柄调到和乳头同高，最适合新手找发力感' },
  { id: 'mach-pec-deck', name: '蝴蝶机夹胸', muscleGroup: 'chest', equipment: '固定器械', isCustom: false, note: '肘保持微屈不变，用大臂往中间夹' },
  { id: 'cable-fly', name: '绳索夹胸', muscleGroup: 'chest', equipment: '绳索', isCustom: false, note: '站弓步，双手在胸前交叉，夹到最紧停 1 秒' },

  // ---------------- 背（7 个）----------------
  { id: 'bw-pullup', name: '引体向上', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '正握略宽于肩。别想"用手拉"，想"用肘往下压"。重量填 0' },
  { id: 'cable-lat-pulldown', name: '高位下拉', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '胸口主动迎向横杆，不要靠上半身往后倒来借力' },
  { id: 'bb-row', name: '杠铃划船', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '髋往后折、背全程挺直，杠铃拉向肚脐' },
  { id: 'db-one-arm-row', name: '单臂哑铃划船', muscleGroup: 'back', equipment: '哑铃', isCustom: false, note: '一手一膝撑在凳上，肘贴着身体往后拉。只记一侧的重量' },
  { id: 'cable-seated-row', name: '坐姿绳索划船', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '先夹肩胛再拉手，上半身别跟着后仰' },
  { id: 'cable-straight-arm-pulldown', name: '直臂下压', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '手臂基本伸直往下压到大腿侧面，专门练背阔肌' },
  { id: 'bb-deadlift', name: '硬拉', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '背全程挺直，杠铃贴着腿起，臀和腿同时发力' },

  // ---------------- 腿（9 个，这一类多给两个）----------------
  { id: 'bb-squat', name: '杠铃深蹲', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '下蹲到大腿和地面平行，膝盖方向跟着脚尖走' },
  { id: 'db-goblet-squat', name: '高脚杯深蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '双手抱一个哑铃在胸前，新手学深蹲的最佳入门动作' },
  { id: 'mach-leg-press', name: '腿举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '脚踩宽一点偏大腿内侧，踩窄一点偏大腿前侧' },
  { id: 'bb-rdl', name: '罗马尼亚硬拉', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '屈髋不屈膝，感觉大腿后侧被拉长' },
  { id: 'db-bulgarian-split-squat', name: '保加利亚分腿蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '后脚搭在凳上，前腿单独发力往下坐。只记一侧的重量' },
  { id: 'db-lunge', name: '箭步蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '前后脚分开站，下沉到前腿大腿平行地面。只记一侧的重量' },
  { id: 'mach-leg-extension', name: '坐姿腿屈伸', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '大腿前侧孤立动作，举到最高停 1 秒' },
  { id: 'mach-leg-curl', name: '俯卧腿弯举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '练大腿后侧，别翘屁股借力' },
  { id: 'mach-calf-raise', name: '站姿提踵', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '练小腿。先落到最低拉长，再顶到最高停 1 秒' },

  // ---------------- 肩（6 个）----------------
  { id: 'bb-overhead-press', name: '杠铃肩上推举', muscleGroup: 'shoulders', equipment: '杠铃', isCustom: false, note: '推到头顶耳侧，全程别塌腰' },
  { id: 'db-shoulder-press', name: '哑铃肩上推举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '手心相对或朝前，肘略在身体前方' },
  { id: 'db-lateral-raise', name: '哑铃侧平举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '小重量，肘微屈，抬到和肩同高就停' },
  { id: 'db-rear-delt-fly', name: '俯身哑铃飞鸟', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '练三角肌后束。俯身背部平直，手往两侧打开' },
  { id: 'cable-face-pull', name: '绳索面拉', muscleGroup: 'shoulders', equipment: '绳索', isCustom: false, note: '拉到脸前方，肘比手高，练后束还能改善圆肩' },
  { id: 'db-arnold-press', name: '阿诺德推举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '推起过程中手腕由朝内旋到朝外' },

  // ---------------- 手臂（6 个）----------------
  { id: 'bb-curl', name: '杠铃弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '肘夹紧身体两侧，别用腰晃着甩上去' },
  { id: 'db-alt-curl', name: '哑铃交替弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '弯起时手心往外转，顶峰用力挤一下' },
  { id: 'db-hammer-curl', name: '锤式弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '手心始终相对，练肱肌，让手臂看起来更厚' },
  { id: 'cable-pushdown', name: '绳索下压', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '肘固定不动，前臂往下压到伸直' },
  { id: 'bb-skull-crusher', name: '仰卧臂屈伸', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '躺平，杠铃下放到额头上方，练肱三头肌' },
  { id: 'bb-close-grip-bench', name: '窄距卧推', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '握距与肩同宽，肘贴身，练肱三头肌' },

  // ---------------- 核心（5 个）----------------
  { id: 'bw-plank', name: '平板支撑', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '肘在肩正下方，屁股别塌也别翘。重量填 0，次数填坚持的秒数' },
  { id: 'bw-crunch', name: '卷腹', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '下巴别压胸口，靠腹部把肩胛卷离地面。重量填 0' },
  { id: 'bw-hanging-leg-raise', name: '悬垂举腿', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '吊在单杠上，腿抬到和地面平行。重量填 0' },
  { id: 'cable-crunch', name: '绳索卷腹', muscleGroup: 'core', equipment: '绳索', isCustom: false, note: '跪姿，用腹肌把上半身往下卷，不是用手臂拉' },
  { id: 'bw-russian-twist', name: '俄罗斯转体', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '坐姿上半身略微后仰，左右转动躯干。重量填 0' },
]

// 把"预置的 40 个"和"你自己建的"拼成一个列表。
// 界面上要显示的是这个合并后的列表，而不是两份分开显示。
// 中间的 ... 是"展开"的意思：把数组里的元素一个个摊开放进来，
// 相当于把两个列表头尾接成一条。
export function mergeExercises(custom: Exercise[]): Exercise[] {
  return [...PRESET_EXERCISES, ...custom]
}
