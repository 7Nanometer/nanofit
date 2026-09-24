import type { Exercise, ExerciseKind } from '../types'

// ============================================================
// 预置动作库
// ============================================================
//
// 【为什么不放进 localStorage】
// 这些是"出厂设置"，直接写在代码里。好处：
//   1. 不占用你手机那点宝贵的存储空间
//   2. 跟着 git 一起存档，改错了能一键还原
//   3. 导出备份时导出的只有"你自己的东西"，文件更干净
//
// 【代价】
// 预置动作不能删、不能改。想改成自己习惯的叫法，就新建一个自建动作。
//
// 【★ 已有动作的 id 一个都不能改】
// 历史记录里的每一条都靠 id 指点名。改了 id，你练过的那条记录就
// 变成"（已删除的动作）"。加新动作可以，改老 id 不行。
//
// 【id 的命名规矩】
// 用"器械缩写-英文动作名"的写法，比如 bb-bench-press：
//   bb     = barbell 杠铃        db     = dumbbell 哑铃
//   mach   = 固定器械            cable  = 绳索
//   bw     = bodyweight 自重     smith  = 史密斯
//   kb     = kettlebell 壶铃     cardio = 有氧器械/有氧动作
// 用英文是因为 id 要长期存在数据里（历史记录会引用它），英文最稳当。
// ============================================================

// "户外跑"的 id，单独提出来当常量。
//
// 【为什么要提出来】
// 录入有氧的那个面板里，只有"户外跑"需要多显示一个"操场模式"
// （室内机器自己会显示距离，用不着按圈数算）。
// 如果直接把 'cardio-outdoor-run' 写死在面板代码里，哪天改了这个 id
// 就会有"改了这边忘了那边"的隐患 —— 提成常量，两处一定同步。
export const OUTDOOR_RUN_ID = 'cardio-outdoor-run'

export const PRESET_EXERCISES: Exercise[] = [
  // ---------------- 胸（20 个）----------------
  //
  // 前 7 个是 2026-09-23 最初那批，id 从那天起就写进了你的历史记录，不许改。
  // 后 13 个是 2026-09-24 扩充的，全部用新 id。
  { id: 'bb-bench-press', name: '杠铃卧推', muscleGroup: 'chest', equipment: '杠铃', isCustom: false, note: '肩胛骨往后往下夹紧，杠铃落到乳头连线，大臂和身体约 75 度' },
  { id: 'db-bench-press', name: '哑铃卧推', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '下放到胸部两侧，推起时别把肘完全锁死' },
  { id: 'db-incline-press', name: '上斜哑铃卧推', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '靠背调到 30-45 度，主要练上胸' },
  { id: 'bw-dip', name: '双杠臂屈伸', muscleGroup: 'chest', equipment: '自重', isCustom: false, note: '身体往前倾、肘往外打开，偏下胸。重量填 0' },
  { id: 'mach-chest-press', name: '器械推胸', muscleGroup: 'chest', equipment: '固定器械', isCustom: false, note: '手柄调到和乳头同高，最适合新手找发力感' },
  { id: 'mach-pec-deck', name: '蝴蝶机夹胸', muscleGroup: 'chest', equipment: '固定器械', isCustom: false, note: '肘保持微屈不变，用大臂往中间夹' },
  { id: 'cable-fly', name: '绳索夹胸', muscleGroup: 'chest', equipment: '绳索', isCustom: false, note: '站弓步，双手在胸前交叉，夹到最紧停 1 秒' },

  // ---- 2026-09-24 扩充（13 个）----
  { id: 'bb-incline-bench-press', name: '上斜杠铃卧推', muscleGroup: 'chest', equipment: '杠铃', isCustom: false, note: '靠背调到 30-45 度，杠铃落到锁骨下方。角度越大越偏肩，别超过 45 度' },
  { id: 'bb-decline-bench-press', name: '下斜杠铃卧推', muscleGroup: 'chest', equipment: '杠铃', isCustom: false, note: '主要练下胸。下斜 20-30 度就够，起身时找人扶一下更稳' },
  { id: 'db-decline-press', name: '下斜哑铃卧推', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '下斜躺着推哑铃，活动范围比杠铃大，注意别让哑铃撞到胸口' },
  { id: 'db-fly', name: '哑铃平板飞鸟', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '肘保持微屈不变，像抱一棵大树那样往中间合。小重量，肩膀有伤慎做' },
  { id: 'db-incline-fly', name: '上斜哑铃飞鸟', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '上斜 30 度左右，主要练上胸。全程控制住，别靠甩' },
  { id: 'db-pullover', name: '哑铃仰卧屈臂上拉', muscleGroup: 'chest', equipment: '哑铃', isCustom: false, note: '躺平，双手托一个哑铃从头后绕到胸口上方。胸和背阔都练，肩活动度差就先用小重量' },
  { id: 'smith-bench-press', name: '史密斯卧推', muscleGroup: 'chest', equipment: '史密斯', isCustom: false, note: '轨道是固定的，不用管平衡，适合一个人练到力竭' },
  { id: 'smith-incline-press', name: '史密斯上斜卧推', muscleGroup: 'chest', equipment: '史密斯', isCustom: false, note: '凳子调到 30 度左右推进史密斯机。角度固定，比自由重量好上手' },
  { id: 'mach-incline-chest-press', name: '上斜器械推胸', muscleGroup: 'chest', equipment: '固定器械', isCustom: false, note: '手柄位置比平推机低，推的方向朝斜上方' },
  { id: 'cable-high-fly', name: '高位绳索夹胸', muscleGroup: 'chest', equipment: '绳索', isCustom: false, note: '滑轮调到最高，两只手从上往下往中间夹。偏下胸' },
  { id: 'cable-low-fly', name: '低位绳索夹胸', muscleGroup: 'chest', equipment: '绳索', isCustom: false, note: '滑轮调到最低，两只手从下往上往中间夹，收到胸口高度。偏上胸' },
  { id: 'bw-pushup', name: '俯卧撑', muscleGroup: 'chest', equipment: '自重', isCustom: false, note: '手比肩略宽，身体从头到脚一条直线，胸口贴近地面。重量填 0' },
  { id: 'bw-decline-pushup', name: '下斜俯卧撑', muscleGroup: 'chest', equipment: '自重', isCustom: false, note: '脚搭在凳子或台阶上，抬高一点偏上胸也更难。重量填 0' },

  // ---------------- 背（22 个）----------------
  //
  // 前 7 个是 2026-09-23 最初那批。其中"硬拉"在 2026-09-24 被移到"全身"
  // 那一类去了（它本来就是全身发力，放"背"里不准确）—— 但 **id 一个字母没改**，
  // 所以你以前练过的硬拉记录还认得出它。
  // 后 16 个是 2026-09-24 扩充的。
  { id: 'bw-pullup', name: '引体向上', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '正握略宽于肩。别想"用手拉"，想"用肘往下压"。重量填 0' },
  { id: 'cable-lat-pulldown', name: '高位下拉', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '胸口主动迎向横杆，不要靠上半身往后倒来借力' },
  { id: 'bb-row', name: '杠铃划船', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '髋往后折、背全程挺直，杠铃拉向肚脐' },
  { id: 'db-one-arm-row', name: '单臂哑铃划船', muscleGroup: 'back', equipment: '哑铃', isCustom: false, note: '一手一膝撑在凳上，肘贴着身体往后拉。只记一侧的重量' },
  { id: 'cable-seated-row', name: '坐姿绳索划船', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '先夹肩胛再拉手，上半身别跟着后仰' },
  { id: 'cable-straight-arm-pulldown', name: '直臂下压', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '手臂基本伸直往下压到大腿侧面，专门练背阔肌' },
  { id: 'bb-deadlift', name: '硬拉', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '背全程挺直，杠铃贴着腿起，臀和腿同时发力' },

  // ---- 2026-09-24 扩充（16 个）----
  { id: 'bb-reverse-grip-row', name: '反握杠铃划船', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '手心朝前握（反握），肘更贴身体，下背压力小，偏背阔下部' },
  { id: 'bb-t-bar-row', name: 'T杠划船', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '杠铃一头固定住，用 V 型把手拉。比杠铃划船好稳，适合上大重量' },
  { id: 'bb-pendlay-row', name: '潘德利划船', muscleGroup: 'back', equipment: '杠铃', isCustom: false, note: '每一组都从地面重新起，爆发拉到腹部再放回地上。偏力量举，重量别贪' },
  { id: 'db-bent-over-row', name: '俯身哑铃划船', muscleGroup: 'back', equipment: '哑铃', isCustom: false, note: '双手各一个哑铃，俯身到接近水平，同时往腰两侧拉' },
  { id: 'db-chest-supported-row', name: '靠凳哑铃划船', muscleGroup: 'back', equipment: '哑铃', isCustom: false, note: '胸口贴住上斜凳，两只手往下拉。腰不吃力，更能练到背本身' },
  { id: 'mach-assisted-pullup', name: '辅助引体向上', muscleGroup: 'back', equipment: '固定器械', isCustom: false, note: '跪在配重垫上，配重越大越省力。还做不了引体时用它过渡' },
  { id: 'mach-seated-row', name: '器械坐姿划船', muscleGroup: 'back', equipment: '固定器械', isCustom: false, note: '胸口顶住靠垫往身后拉，比绳索划船更容易找到背的发力' },
  { id: 'mach-high-row', name: '器械高位划船', muscleGroup: 'back', equipment: '固定器械', isCustom: false, note: '手柄从上往下往身后拉，偏上背和斜方肌中段' },
  { id: 'mach-one-arm-row', name: '器械单臂划船', muscleGroup: 'back', equipment: '固定器械', isCustom: false, note: '一只手拉，能看出两边力量差多少。只记一侧的重量' },
  { id: 'cable-close-grip-pulldown', name: '窄距下拉', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '换 V 型把手，握得窄，肘贴着身体往下压，偏背阔下部' },
  { id: 'cable-reverse-grip-pulldown', name: '反握高位下拉', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '手心朝自己握住横杆下拉，肘会更贴身体，偏背阔下部' },
  { id: 'cable-one-arm-pulldown', name: '单臂绳索下拉', muscleGroup: 'back', equipment: '绳索', isCustom: false, note: '一只手拉单柄，身体可以稍微侧一点，活动范围更大。只记一侧的重量' },
  { id: 'bw-chinup', name: '反握引体向上', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '手心朝自己握（反握），比正握省力，肱二头参与更多。重量填 0' },
  { id: 'bw-neutral-grip-pullup', name: '对握引体向上', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '手心相对握平行把手，对肩膀最友好的一种引体。重量填 0' },
  { id: 'bw-wide-grip-pullup', name: '宽距引体向上', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '握得比肩宽，偏背阔外侧，也是三种引体里最难的。重量填 0' },
  { id: 'bw-inverted-row', name: '反向划船', muscleGroup: 'back', equipment: '自重', isCustom: false, note: '杠铃架在腰高处，身体在杆下仰躺，把胸口拉向杆。越接近水平越难。重量填 0' },

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

  // ---------------- 有氧（11 个）----------------
  //
  // ★ 这一组全部带 kind: 'cardio'，是全库唯一的一批。
  //   它决定了这些动作在训练页走"记时长"的表单，而不是"记重量×次数"；
  //   也决定了它们在统计页会被排除在力量图表之外。
  //
  // 【怎么记】记时长（必填）+ 距离（可选）。重量和次数这两栏对它们没意义。
  //   跳绳/开合跳/高抬腿也是记时长的 —— 按"跳了多少下"记反而不好对比强度。
  // 【这个顺序不是随便排的】
  // 前 5 个是最常用的，录入面板顶部的快选栏就按这个顺序长出来。
  // 后面 6 个排在下面，但不影响搜索和筛选。
  { id: 'cardio-treadmill', name: '跑步机', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '从慢走热身开始，别一上去就冲。速度调到"还能说短句"的强度就够了' },
  { id: 'cardio-elliptical', name: '椭圆机', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '脚掌踩实别踮着，膝盖和脚尖朝前。对膝盖最友好的一种' },
  { id: 'cardio-rower', name: '划船机', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '顺序是"腿蹬 → 身体后仰 → 手拉"，回来时反过来。别只用手臂拽' },
  { id: 'cardio-spin-bike', name: '动感单车', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '先把座椅调到胯骨高度，蹬到底时膝盖别完全伸直' },
  // ★ 这个 id 被 CardioForm 单独认出来，只有它才显示"操场模式"
  { id: OUTDOOR_RUN_ID, name: '户外跑', muscleGroup: 'cardio', equipment: '自重', isCustom: false, kind: 'cardio', note: '落地轻一点、步频快一点。在操场上跑可以用"操场模式"按圈数算距离' },
  { id: 'cardio-recumbent-bike', name: '卧式健身车', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '靠背式坐姿，腰有支撑，适合腰不好或想轻松骑的人' },
  { id: 'cardio-stair-climber', name: '楼梯机', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '踩实整只脚，别只用前脚掌。手扶把手会省力，想练狠点就别扶' },
  { id: 'cardio-air-bike', name: '风阻单车', muscleGroup: 'cardio', equipment: '有氧器械', isCustom: false, kind: 'cardio', note: '手脚一起蹬、一起推，特别累。适合做短时间高强度间歇' },
  { id: 'cardio-jump-rope', name: '跳绳', muscleGroup: 'cardio', equipment: '自重', isCustom: false, kind: 'cardio', note: '手腕摇绳、小幅度起跳，落地前脚掌先着地' },
  { id: 'cardio-jumping-jack', name: '开合跳', muscleGroup: 'cardio', equipment: '自重', isCustom: false, kind: 'cardio', note: '跳起时两脚分开、双手举过头顶。很好的热身动作' },
  { id: 'cardio-high-knees', name: '高抬腿', muscleGroup: 'cardio', equipment: '自重', isCustom: false, kind: 'cardio', note: '原地快速交替抬膝到腰高，上半身别后仰' },
]

// 把"预置的 40 个"和"你自己建的"拼成一个列表。
// 界面上要显示的是这个合并后的列表，而不是两份分开显示。
// 中间的 ... 是"展开"的意思：把数组里的元素一个个摊开放进来，
// 相当于把两个列表头尾接成一条。
export function mergeExercises(custom: Exercise[]): Exercise[] {
  return [...PRESET_EXERCISES, ...custom]
}

// 把动作的 id 翻成中文名，界面上显示用。
//
// 【为什么会找不到】
// 用户把自建动作删掉了，但历史记录里还引用着它。
// 这时返回一句提示，而不是留一片空白让人以为界面坏了。
export function exerciseName(all: Exercise[], id: string): string {
  return all.find((e) => e.id === id)?.name ?? '（已删除的动作）'
}

// 这个动作是力量还是有氧？
//
// 【为什么必须兜底】
// kind 这个字段是 2026-09-24 才加的。在那之前存下来的动作（你手机里
// 已有的自建动作、从旧备份导入的动作）**根本没有这个字段**，读出来是
// undefined。所以这里统一兜底成 'strength' —— 老动作本来就全是力量的。
//
// ★ 兜底写在这里、而不是"导入备份时补上"，是因为老数据不只有导入
//   这一条路：手机盘上那份 nanofit:v1:sessions 是新版第一次打开时
//   直接读的，压根不经过导入。写在消费点才能全覆盖。
export function exerciseKind(exercise: Exercise | undefined): ExerciseKind {
  return exercise?.kind ?? 'strength'
}

// 把"所有有氧动作的 id"收集成一个 Set，给统计页筛数据用。
//
// 【为什么返回 Set 而不是数组】
// 统计页要拿它判断成千上万条记录，Set 的查找是"一步到位"，
// 数组的 includes 是"从头翻到尾"。数据一多差距很明显。
//
// 【为什么要"所有动作"而不是只挑有氧】
// 判断一条记录是不是有氧，只能靠它的 exerciseId 指向哪个动作。
// 所以得先把动作库整个过一遍，把有氧的那几个挑出来。
export function cardioIdSet(all: Exercise[]): Set<string> {
  return new Set(
    all.filter((e) => exerciseKind(e) === 'cardio').map((e) => e.id),
  )
}

// 挑出所有有氧动作，顺序不变（= 写在 PRESET_EXERCISES 里的先后顺序）。
// 录入面板顶部的快选栏就是它长出来的，所以那个顺序是有意义的：
// 最常用的五个排在最前面。
export function cardioExercises(all: Exercise[]): Exercise[] {
  return all.filter((e) => exerciseKind(e) === 'cardio')
}
