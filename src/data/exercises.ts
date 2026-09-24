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

  // ---------------- 腿（35 个）----------------
  //
  // 前 9 个是 2026-09-23 最初那批，id 不许改。后 26 个是 2026-09-24 扩充的。
  // 这一类动作最多（腿的机器本来就多），分几个小段排：
  //   深蹲类 → 单腿/箭步类 → 腿举 → 腿屈伸/弯举 → 臀 → 小腿
  { id: 'bb-squat', name: '杠铃深蹲', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '下蹲到大腿和地面平行，膝盖方向跟着脚尖走' },
  { id: 'db-goblet-squat', name: '高脚杯深蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '双手抱一个哑铃在胸前，新手学深蹲的最佳入门动作' },
  { id: 'mach-leg-press', name: '腿举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '脚踩宽一点偏大腿内侧，踩窄一点偏大腿前侧' },
  { id: 'bb-rdl', name: '罗马尼亚硬拉', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '屈髋不屈膝，感觉大腿后侧被拉长' },
  { id: 'db-bulgarian-split-squat', name: '保加利亚分腿蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '后脚搭在凳上，前腿单独发力往下坐。只记一侧的重量' },
  { id: 'db-lunge', name: '箭步蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '前后脚分开站，下沉到前腿大腿平行地面。只记一侧的重量' },
  { id: 'mach-leg-extension', name: '坐姿腿屈伸', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '大腿前侧孤立动作，举到最高停 1 秒' },
  { id: 'mach-leg-curl', name: '俯卧腿弯举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '练大腿后侧，别翘屁股借力' },
  { id: 'mach-calf-raise', name: '站姿提踵', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '练小腿。先落到最低拉长，再顶到最高停 1 秒' },

  // ---- 2026-09-24 扩充（26 个）----
  // 深蹲类
  { id: 'bb-front-squat', name: '前蹲', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '杠铃架在锁骨前，肘朝前抬平。比后蹲更练大腿前侧，也更要求背挺直' },
  { id: 'smith-squat', name: '史密斯深蹲', muscleGroup: 'legs', equipment: '史密斯', isCustom: false, note: '轨道固定不用管平衡，适合最后几组冲力竭。脚往前站一点更练臀' },
  { id: 'mach-hack-squat', name: '哈克深蹲', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '背靠住滑板、肩膀顶住肩垫往下蹲。腰几乎不吃力' },
  { id: 'db-sumo-squat', name: '相扑深蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '站得很宽、脚尖朝外，主要练大腿内侧。往下坐，别往后坐' },
  { id: 'bw-wall-sit', name: '靠墙静蹲', muscleGroup: 'legs', equipment: '自重', isCustom: false, note: '背贴墙蹲到大腿平行地面，坚持住。重量填 0，次数填坚持的秒数' },
  // 单腿 / 箭步类
  { id: 'db-reverse-lunge', name: '反向箭步蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '往后撤一步再下蹲。比往前迈的箭步蹲对膝盖友好。只记一侧的重量' },
  { id: 'db-walking-lunge', name: '走步箭步蹲', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '一边往前迈一边交替下蹲，走完一段。很喘。只记一侧的重量' },
  { id: 'db-step-up', name: '登凳', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '单脚踩稳箱子或凳子，用那条腿把身体撑上去。只记一侧的重量' },
  { id: 'db-single-leg-rdl', name: '单腿罗马尼亚硬拉', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '单脚站，另一条腿往后伸，俯身再起来。练臀也练平衡。只记一侧的重量' },
  { id: 'mach-single-leg-press', name: '单腿腿举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '一条腿蹬，活动范围更大，也更容易看出两边差多少。只记一侧的重量' },
  // 腿屈伸 / 弯举
  { id: 'mach-seated-leg-curl', name: '坐姿腿弯举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '坐着做，练大腿后侧。和"俯卧腿弯举"是两台机器，感受也不一样' },
  { id: 'mach-single-leg-curl', name: '单腿腿弯举', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '一条腿做，能纠正两边力量差。只记一侧的重量' },
  // 臀
  { id: 'bb-hip-thrust', name: '臀推', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '上背靠凳、杠铃压在胯上，用屁股把重量顶起来，顶点停 1 秒' },
  { id: 'mach-hip-thrust', name: '器械臀推', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '专门的臀推机，比杠铃好上重量，也不用自己摆姿势' },
  { id: 'mach-single-leg-hip-thrust', name: '单腿臀推', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '一条腿做臀推，屁股更吃力。只记一侧的重量' },
  { id: 'db-glute-bridge', name: '臀桥', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '躺地上屈膝，用屁股把胯顶起来。想加重量就在胯上放个哑铃' },
  { id: 'db-single-leg-glute-bridge', name: '单腿臀桥', muscleGroup: 'legs', equipment: '哑铃', isCustom: false, note: '一条腿撑地、另一条伸直抬起做臀桥。更吃力也更练单侧。只记一侧的重量' },
  { id: 'mach-hip-abduction', name: '髋外展', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '坐着把两条腿往外撑开。练臀中肌，屁股两侧的线条靠它' },
  { id: 'mach-hip-adduction', name: '髋内收', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '坐着把两条腿往中间夹。练大腿内侧' },
  { id: 'cable-hip-abduction', name: '绳索髋外展', muscleGroup: 'legs', equipment: '绳索', isCustom: false, note: '脚踝绑在低位滑轮上，把腿往外打开。角度和器械不同。只记一侧的重量' },
  // 小腿
  { id: 'mach-seated-calf-raise', name: '坐姿提踵', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '坐着屈膝做提踵，更偏小腿深层那块（比目鱼肌）' },
  { id: 'smith-calf-raise', name: '史密斯提踵', muscleGroup: 'legs', equipment: '史密斯', isCustom: false, note: '脚掌前半段踩在杠下方，用史密斯机的轨道做提踵。稳，能上大重量' },
  { id: 'mach-leg-press-calf-raise', name: '腿举提踵', muscleGroup: 'legs', equipment: '固定器械', isCustom: false, note: '脚掌踩在腿举机踏板的边缘做提踵，能上很大重量' },
  { id: 'bw-single-leg-calf-raise', name: '单腿提踵', muscleGroup: 'legs', equipment: '自重', isCustom: false, note: '单脚站，扶住东西保持平衡，把脚跟提起来。只记一侧的重量' },
  // 大腿后侧 / 下背
  { id: 'bb-stiff-leg-deadlift', name: '直腿硬拉', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '膝盖基本不屈，主要拉大腿后侧。背必须全程挺直，腰不好就别做' },
  { id: 'bb-good-morning', name: '早安式体前屈', muscleGroup: 'legs', equipment: '杠铃', isCustom: false, note: '杠铃扛在斜方肌上，屈髋往前俯身再起来。练大腿后侧和下背，务必小重量' },

  // ---------------- 肩（19 个）----------------
  //
  // 前 6 个是 2026-09-23 最初那批，id 不许改。后 13 个是 2026-09-24 扩充的。
  // 排法：先推举（前束/整体）→ 侧平举（中束）→ 反向飞鸟（后束）→ 耸肩（斜方肌）
  { id: 'bb-overhead-press', name: '杠铃肩上推举', muscleGroup: 'shoulders', equipment: '杠铃', isCustom: false, note: '推到头顶耳侧，全程别塌腰' },
  { id: 'db-shoulder-press', name: '哑铃肩上推举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '手心相对或朝前，肘略在身体前方' },
  { id: 'db-lateral-raise', name: '哑铃侧平举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '小重量，肘微屈，抬到和肩同高就停' },
  { id: 'db-rear-delt-fly', name: '俯身哑铃飞鸟', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '练三角肌后束。俯身背部平直，手往两侧打开' },
  { id: 'cable-face-pull', name: '绳索面拉', muscleGroup: 'shoulders', equipment: '绳索', isCustom: false, note: '拉到脸前方，肘比手高，练后束还能改善圆肩' },
  { id: 'db-arnold-press', name: '阿诺德推举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '推起过程中手腕由朝内旋到朝外' },

  // ---- 2026-09-24 扩充（13 个）----
  // 推举
  { id: 'mach-shoulder-press', name: '坐姿推肩机', muscleGroup: 'shoulders', equipment: '固定器械', isCustom: false, note: '坐着推，背后有靠垫腰不吃力，适合专门练肩' },
  { id: 'smith-shoulder-press', name: '史密斯肩上推举', muscleGroup: 'shoulders', equipment: '史密斯', isCustom: false, note: '在史密斯机里做肩上推举。轨道固定，冲重量时更安全' },
  { id: 'bb-landmine-press', name: '地雷管推举', muscleGroup: 'shoulders', equipment: '杠铃', isCustom: false, note: '杠铃一头固定在墙角，另一头扛在肩前往上推。肩不容易疼' },
  // 前束
  { id: 'db-front-raise', name: '哑铃前平举', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '两手轮流或同时往前平举到肩高。练三角肌前束。别甩上去' },
  // 中束
  { id: 'cable-lateral-raise', name: '绳索侧平举', muscleGroup: 'shoulders', equipment: '绳索', isCustom: false, note: '低位滑轮的单柄，一只手拉着往侧面平举。全程都有张力' },
  { id: 'mach-lateral-raise', name: '器械侧平举', muscleGroup: 'shoulders', equipment: '固定器械', isCustom: false, note: '专门的侧平举机，手臂有靠垫，不容易靠甩借力。只记一侧的重量' },
  // 后束
  { id: 'mach-reverse-pec-deck', name: '反向蝴蝶机', muscleGroup: 'shoulders', equipment: '固定器械', isCustom: false, note: '反过来坐，胸口贴住靠垫，两只手往两侧打开。练三角肌后束' },
  { id: 'cable-rear-delt-fly', name: '绳索反向飞鸟', muscleGroup: 'shoulders', equipment: '绳索', isCustom: false, note: '两只手拉着绳索往两侧打开，练后束。滑轮高度可调，换角度换感觉' },
  // 斜方肌
  { id: 'bb-shrug', name: '杠铃耸肩', muscleGroup: 'shoulders', equipment: '杠铃', isCustom: false, note: '杠铃拎在身前，肩膀往耳朵方向耸起来再放下。练斜方肌，别转肩' },
  { id: 'db-shrug', name: '哑铃耸肩', muscleGroup: 'shoulders', equipment: '哑铃', isCustom: false, note: '两只哑铃拎在身体两侧往上耸。比杠铃活动范围更大' },
  { id: 'mach-shrug', name: '器械耸肩', muscleGroup: 'shoulders', equipment: '固定器械', isCustom: false, note: '专门的耸肩机，能上大重量而且不用管平衡' },
  // 其他
  { id: 'bb-upright-row', name: '直立划船', muscleGroup: 'shoulders', equipment: '杠铃', isCustom: false, note: '杠铃贴着身体往上提到下巴高度，肘比手高。肩夹挤感明显就换窄握或少做' },
  { id: 'bw-handstand-pushup', name: '倒立撑', muscleGroup: 'shoulders', equipment: '自重', isCustom: false, note: '靠墙倒立着往下推。很硬核，肩力量不够别硬上。重量填 0' },

  // ---------------- 手臂（25 个）----------------
  //
  // 前 6 个是 2026-09-23 最初那批，id 不许改。后 19 个是 2026-09-24 扩充的。
  // 排法：先肱二头（各种弯举），再肱三头（各种下压/臂屈伸），最后前臂
  { id: 'bb-curl', name: '杠铃弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '肘夹紧身体两侧，别用腰晃着甩上去' },
  { id: 'db-alt-curl', name: '哑铃交替弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '弯起时手心往外转，顶峰用力挤一下' },
  { id: 'db-hammer-curl', name: '锤式弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '手心始终相对，练肱肌，让手臂看起来更厚' },
  { id: 'cable-pushdown', name: '绳索下压', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '肘固定不动，前臂往下压到伸直' },
  { id: 'bb-skull-crusher', name: '仰卧臂屈伸', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '躺平，杠铃下放到额头上方，练肱三头肌' },
  { id: 'bb-close-grip-bench', name: '窄距卧推', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '握距与肩同宽，肘贴身，练肱三头肌' },

  // ---- 2026-09-24 扩充（19 个）----
  // 肱二头
  { id: 'bb-preacher-curl', name: '牧师凳弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '大臂固定在斜板上，只有前臂动。所有弯举里最不容易借力的' },
  { id: 'db-concentration-curl', name: '集中弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '坐着，手肘顶在大腿内侧，慢慢弯起来。练肱二头的顶峰' },
  { id: 'db-incline-curl', name: '上斜哑铃弯举', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '躺在上斜凳上，手臂自然垂下再弯起。肱二头被拉长，感觉更明显' },
  { id: 'cable-curl', name: '绳索弯举', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '用绳索把手做弯举，全程都有张力，最底下那段也不松劲' },
  { id: 'mach-curl', name: '器械弯举', muscleGroup: 'arms', equipment: '固定器械', isCustom: false, note: '专门的弯举机，大臂有托垫，不容易靠身体晃起来' },
  { id: 'cable-hammer-curl', name: '绳索锤式弯举', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '用绳索把手、手心相对做弯举，练肱肌，让手臂看起来更厚' },
  { id: 'cable-one-arm-curl', name: '单臂绳索弯举', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '一只手拉单柄弯举，可以稍微转一下手腕。只记一侧的重量' },
  // 肱三头
  { id: 'cable-overhead-extension', name: '绳索过顶臂屈伸', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '背对滑轮，绳索从头顶往前上方伸直。重点练肱三头长头' },
  { id: 'db-overhead-extension', name: '哑铃颈后臂屈伸', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '两手托一个哑铃放到脑后，伸直手臂举起来。练肱三头肌' },
  { id: 'db-lying-extension', name: '哑铃仰卧臂屈伸', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '躺平，两只哑铃从额头往上方推直。比杠铃版活动范围更大' },
  { id: 'mach-triceps-extension', name: '器械臂屈伸', muscleGroup: 'arms', equipment: '固定器械', isCustom: false, note: '专门的臂屈伸机，坐着往下压或往后伸，练肱三头肌' },
  { id: 'cable-one-arm-pushdown', name: '单臂绳索下压', muscleGroup: 'arms', equipment: '绳索', isCustom: false, note: '一只手往下压，能看出两边差多少。只记一侧的重量' },
  { id: 'db-kickback', name: '哑铃俯身臂屈伸', muscleGroup: 'arms', equipment: '哑铃', isCustom: false, note: '俯身，大臂贴着身体不动，只把前臂往后伸直。小重量就够' },
  { id: 'smith-close-grip-bench', name: '史密斯窄距卧推', muscleGroup: 'arms', equipment: '史密斯', isCustom: false, note: '在史密斯机里做窄距卧推。轨道固定，练肱三头肌更稳' },
  { id: 'bw-bench-dip', name: '凳上反屈伸', muscleGroup: 'arms', equipment: '自重', isCustom: false, note: '背对凳子，双手撑在凳子边，屈肘下沉再撑起来。重量填 0' },
  { id: 'bw-diamond-pushup', name: '钻石俯卧撑', muscleGroup: 'arms', equipment: '自重', isCustom: false, note: '两手拇指和食指拼成一个三角形，肘贴着身体。很吃肱三头。重量填 0' },
  // 前臂
  { id: 'bb-reverse-curl', name: '反握杠铃弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '手心朝下握（反握），练前臂和肱肌。重量比正常弯举轻不少' },
  { id: 'bb-wrist-curl', name: '腕弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '前臂架在腿上，手心朝上，只动手腕往上卷。练前臂内侧' },
  { id: 'bb-reverse-wrist-curl', name: '反握腕弯举', muscleGroup: 'arms', equipment: '杠铃', isCustom: false, note: '手心朝下，只动手腕往上抬。练前臂外侧' },

  // ---------------- 核心（20 个）----------------
  //
  // 前 5 个是 2026-09-23 最初那批，id 不许改。后 15 个是 2026-09-24 扩充的。
  // 排法：先机器（好加重量）→ 绳索（能调角度）→ 徒手（按难度递增）
  { id: 'bw-plank', name: '平板支撑', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '肘在肩正下方，屁股别塌也别翘。重量填 0，次数填坚持的秒数' },
  { id: 'bw-crunch', name: '卷腹', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '下巴别压胸口，靠腹部把肩胛卷离地面。重量填 0' },
  { id: 'bw-hanging-leg-raise', name: '悬垂举腿', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '吊在单杠上，腿抬到和地面平行。重量填 0' },
  { id: 'cable-crunch', name: '绳索卷腹', muscleGroup: 'core', equipment: '绳索', isCustom: false, note: '跪姿，用腹肌把上半身往下卷，不是用手臂拉' },
  { id: 'bw-russian-twist', name: '俄罗斯转体', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '坐姿上半身略微后仰，左右转动躯干。重量填 0' },

  // ---- 2026-09-24 扩充（15 个）----
  // 器械
  { id: 'mach-ab-crunch', name: '卷腹机', muscleGroup: 'core', equipment: '固定器械', isCustom: false, note: '坐进机器，胸口顶着垫子往下卷。比徒手卷腹好加重量' },
  { id: 'mach-torso-rotation', name: '躯干旋转机', muscleGroup: 'core', equipment: '固定器械', isCustom: false, note: '坐着，上半身左右转。练腹斜肌' },
  { id: 'mach-side-bend', name: '器械侧屈', muscleGroup: 'core', equipment: '固定器械', isCustom: false, note: '身体往一侧弯下去再起来，练腹斜肌。只记一侧的重量' },
  // 绳索
  { id: 'cable-woodchop', name: '绳索伐木', muscleGroup: 'core', equipment: '绳索', isCustom: false, note: '滑轮调高，双手拉着绳索从斜上往斜下劈。练腹斜肌' },
  { id: 'cable-pallof-press', name: '帕洛夫推', muscleGroup: 'core', equipment: '绳索', isCustom: false, note: '侧对滑轮，双手把绳索往前推出去，抗住身体被带着转。练核心抗旋转' },
  // 徒手（大致从易到难）
  { id: 'bw-side-plank', name: '侧平板支撑', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '侧躺用手肘撑地，身体撑成一条直线。重量填 0，次数填坚持的秒数' },
  { id: 'bw-lying-leg-raise', name: '仰卧举腿', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '躺平，双腿并拢抬到垂直再慢慢放下。重量填 0' },
  { id: 'bw-reverse-crunch', name: '反向卷腹', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '躺平，用腹部把屁股卷离地面、膝盖往胸口收。重量填 0' },
  { id: 'bw-side-crunch', name: '侧腹卷腹', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '侧躺，用一侧的腹斜肌把身体卷起来。只记一侧。重量填 0' },
  { id: 'bw-bicycle-crunch', name: '自行车卷腹', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '躺着，对侧手肘去碰对侧膝盖，像蹬自行车。重量填 0' },
  { id: 'bw-dead-bug', name: '死虫', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '躺着四肢朝上，对侧的手和脚同时伸出去再收回。练核心稳定。重量填 0' },
  { id: 'bw-hanging-knee-raise', name: '悬垂屈膝抬腿', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '吊在单杠上，膝盖往胸口收。比直腿版容易，是悬垂举腿的前置。重量填 0' },
  { id: 'bw-back-extension', name: '山羊挺身', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '罗马椅上脚固定住，上半身往下再起来。练下背和臀。重量填 0' },
  { id: 'bw-ab-wheel', name: '健腹轮', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '跪着双手握住健腹轮往前推出去再收回来。腰别塌。重量填 0' },
  { id: 'bw-dragon-flag', name: '龙旗', muscleGroup: 'core', equipment: '自重', isCustom: false, note: '躺着抓住固定物，身体像旗子一样笔直抬起放下。非常硬核，先练慢慢放下那半程' },

  // ---------------- 全身（11 个）----------------
  //
  // 【这一类是 2026-09-24 新开的】
  // 原来只有 6 个肌群，硬拉被塞在"背"里 —— 其实它臀、腿、背、握力全在使劲，
  // 归到任何一个单一肌群都是骗人。所以新开"全身"这一类，把这类动作归到这儿。
  //
  // ★ 硬拉的 id（bb-deadlift）一个字母都没改，只是 muscleGroup 从 back
  //   变成了 fullbody。你以前练过的硬拉记录照样认得它，一天都不会丢。
  //   这就是"改分类安全、改 id 要命"的意思。
  { id: 'bb-deadlift', name: '硬拉', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '背全程挺直，杠铃贴着腿起，臀和腿同时发力' },
  { id: 'bb-sumo-deadlift', name: '相扑硬拉', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '站得很宽、双手在两腿之间握杠。行程比传统硬拉短，腰的压力也小一些' },
  { id: 'bb-trap-bar-deadlift', name: '六角杠硬拉', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '用六角形的杠铃，人站在杠中间。对腰最友好的硬拉，新手可以从它开始' },
  { id: 'bb-rack-pull', name: '架上拉', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '杠铃架在膝盖高度附近，只做上半程。专门练锁定那一下，力量举常用' },
  { id: 'bb-power-clean', name: '高翻', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '爆发把杠铃从地面翻到肩膀前。举重动作，先用空杆学，最好有人教' },
  { id: 'bb-clean-and-jerk', name: '挺举', muscleGroup: 'fullbody', equipment: '杠铃', isCustom: false, note: '先高翻到肩，再借力举过头顶。技术性最强的动作，别自己瞎练' },
  { id: 'db-farmers-walk', name: '农夫行走', muscleGroup: 'fullbody', equipment: '哑铃', isCustom: false, note: '两手拎着很重的哑铃走一段。全身都在使劲，通常握力先撑不住。只记一侧的重量' },
  { id: 'kb-swing', name: '壶铃摆动', muscleGroup: 'fullbody', equipment: '壶铃', isCustom: false, note: '靠髋部往前顶把壶铃甩到胸口高度。发力在屁股，不是用手抬' },
  { id: 'kb-clean', name: '壶铃高翻', muscleGroup: 'fullbody', equipment: '壶铃', isCustom: false, note: '把壶铃从下方翻到肩膀外侧靠稳。手腕别硬接，让壶铃自然转过来' },
  { id: 'kb-turkish-getup', name: '土耳其起立', muscleGroup: 'fullbody', equipment: '壶铃', isCustom: false, note: '躺着单手举着壶铃，一步步站起来再一步步躺回去。很考验肩的稳定性' },
  { id: 'bw-burpee', name: '波比跳', muscleGroup: 'fullbody', equipment: '自重', isCustom: false, note: '下蹲撑地 → 跳成平板 → 收腿 → 跳起。很喘。重量填 0' },

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
