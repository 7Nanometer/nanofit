import { useEffect, useState } from 'react'
import type {
  BodyMetric,
  Exercise,
  PlannedItem,
  SetEntry,
  Settings,
  StrengthMetLevel,
  Template,
  WorkoutSession,
} from '../types'
import { cardioIdSet, exerciseKind, mergeExercises } from '../data/exercises'
import { registerBackHandler } from '../lib/backbutton'
import { newId } from '../lib/id'
import { formatDateCN, todayKey } from '../lib/date'
import {
  describeCardio,
  formatDuration,
  sessionVolume,
  textToNumber,
} from '../lib/calc'
import { unlockAudio } from '../lib/beep'
import {
  DEFAULT_MET_LEVEL,
  recommendMetLevel,
  resolveWeightKg,
  sessionSeconds,
} from '../lib/kcal'
import type { MetRecommendation } from '../lib/kcal'
import {
  askRestNotifyFirstTime,
  getRestNotifyStatus,
  requestRestNotify,
  subscribeRestNotify,
  syncRestNotify,
} from '../lib/restnotify'
import {
  clearActiveWorkout,
  readActiveWorkout,
  readBodyMetrics,
  readCustomExercises,
  readSessions,
  readSettings,
  readTemplates,
  writeActiveWorkout,
  writeSessions,
  writeSettings,
} from '../lib/storage'
import { CardioForm } from '../components/CardioForm'
import { MetPicker } from '../components/MetPicker'
import { ExercisePicker } from '../components/ExercisePicker'
import { RestTimer } from '../components/RestTimer'
import { SetRow } from '../components/SetRow'
import { TemplatePicker } from '../components/TemplatePicker'

// ============================================================
// 训练页 —— 整个 App 最核心的一屏
// ============================================================
//
// 【数据是怎么流动的】
// 这个页面只认一个东西：session（当前这次训练）。
// 每次你点 ✓ 记一组，都会：
//   1. 先把新数据写进浏览器储物柜（所以锁屏也不会丢）
//   2. 再更新界面上的显示
// 顺序很重要 —— 先存再显示，万一存失败，界面上能立刻警告你。
//
// 【为什么不用 useState 的初始值直接读】
// useState(函数) 这种写法表示"只在第一次显示这一页时读一次"。
// 如果写成 useState(readActiveWorkout())，每次重画都会白读一遍储物柜。
// ============================================================

export function TrainScreen() {
  // 显示这一页时只读一次储物柜。
  // 【为什么先接在变量里】下面有两个 state 都要用这份数据（当前的训练、
  // 以及正在进行的休息倒计时），在外面接住就不用读两遍。
  const [initialSession] = useState<WorkoutSession | null>(readActiveWorkout)
  const [session, setSession] = useState<WorkoutSession | null>(initialSession)
  const [customExercises] = useState<Exercise[]>(readCustomExercises)
  const [settings] = useState<Settings>(readSettings)
  const [customTemplates] = useState<Template[]>(readTemplates)
  // 体重是给有氧录入面板算热量估算用的。训练页自己不用，只是读出来传下去。
  const [bodyMetrics] = useState<BodyMetric[]>(readBodyMetrics)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)

  // ---------- 有氧录入面板 ----------
  // cardioOpen 管"面板开没开"；cardioPresetId 是"打开时替用户选好了哪个动作"。
  // 分成两个状态，是因为有两种打开方式：
  //   点"+ 记有氧"        → 开，不预选（用户自己挑）
  //   点卡片上的"再记一次" → 开，预选那个动作（省一次点击）
  const [cardioOpen, setCardioOpen] = useState(false)
  const [cardioPresetId, setCardioPresetId] = useState<string | undefined>(
    undefined,
  )

  // 结束训练时的"这次练得有多累"面板开着没有。
  // 它顺便代替了原来的"确定要结束吗"弹窗 —— 反正都要确认一次，
  // 多问这一句不多一次操作。
  const [metPickerOpen, setMetPickerOpen] = useState(false)
  // 休息倒计时"结束的时间点"。null 表示当前没在休息。
  // 注意存的是"结束时刻"而不是"还剩几秒"，原因见 RestTimer.tsx 的注释。
  //
  // 【切走再切回来，倒计时为什么还在】
  // 底部四个 tab 是靠一个变量切换的，切走的时候训练页整个被卸载，
  // 页面内存里的东西全没了 —— 以前倒计时就是这么凭空消失的。
  // 现在它跟着"正在进行的训练"一起存了档（WorkoutSession.restEndsAt），
  // 所以回到这一页时能从存档里接着走。
  //
  // 【只恢复"还没结束"的】
  // 已经过期的直接丢掉。不然你切走两三分钟再回来，会看到一个
  // "休息结束 点一下继续"横在那儿，而且还会补响一声 ——
  // 那声提醒来得莫名其妙（你早就休息完了）。
  const [restEndsAt, setRestEndsAt] = useState<number | null>(() => {
    const saved = initialSession?.restEndsAt
    return saved !== undefined && saved > Date.now() ? saved : null
  })

  // ---------- 后台提醒的状态（2026-09-24 加的）----------
  //
  // 只用来决定倒计时卡片下面那行小字说什么：
  //   "切到别的 App 也会提醒你" / "开启通知权限才能在后台提醒 · 点这里开启"
  //
  // 【为什么不用在挂载时查一次】
  // 用户点那行字会弹系统授权框，也可能跳到系统设置页 ——
  // 回来时这一页并没有卸载（切到别的 App 不会卸载 React 组件）。
  // 不订阅的话那行字会一直停在"未开启"，看着像没生效。
  // restnotify.ts 那边每次回到前台都会重查，查完通知这里重画。
  const [notifyStatus, setNotifyStatus] = useState(getRestNotifyStatus)
  useEffect(() => {
    return subscribeRestNotify(() => setNotifyStatus(getRestNotifyStatus()))
  }, [])

  // 今天。
  // 用 useState 的惰性初始化，让它"显示这一页时只算一次"。
  // 【为什么不直接在显示的地方写 todayKey()】
  // React 有条规矩：渲染过程必须是"纯"的 —— 同样的输入必须给出同样的结果。
  // 而"现在几点"每分每秒都在变，在渲染里读它会破坏这条规矩
  // （检查工具 oxlint 会把它标成警告）。
  //
  // 小提醒：真正创建训练记录时用的是实时的 todayKey()（见下面的 addExercise），
  // 所以哪怕你开着这一页跨过了午夜，记录下来的日期依然是准的。
  const [today] = useState(todayKey)

  // ---------- 安卓的物理返回键 ----------
  // 这次训练还没结束的时候按返回，先问一句再走。
  // 为什么不是直接不许退：记录其实**已经存好了**（每点一次 ✓ 就存一次），
  // 退出 App 并不会丢数据，下次打开还能接着练。所以拦的目的是
  // "别让人手一滑就莫名其妙退出去、吓一跳"，而不是"防丢数据"。
  // 弹窗里也把这句话写清楚了，免得人以为退了就白练了。
  //
  // 没有进行中的训练（session 是 null）时不拦截 —— 那时按返回直接退出，
  // 是符合安卓习惯的，不用多问一句。
  useEffect(() => {
    if (session === null) return
    return registerBackHandler(() => {
      const wantsToQuit = window.confirm(
        '这次训练还在进行中。\n\n记录已经存好了，下次打开还能接着练。\n\n确定要退出 App 吗？',
      )
      // 点"取消" → 返回 true：这事我接了，什么都不做，留在训练页
      // 点"确定" → 返回 false：交回给默认逻辑（在训练页按返回 = 退出 App）
      return !wantsToQuit
    })
  }, [session])

  // 预置 + 自建，合成一个总列表，用来查出动作的中文名
  const allExercises = mergeExercises(customExercises)

  // session 里可能没有 exerciseIds 这个字段（早期版本存的数据），用 ?? [] 兜住
  const exerciseIds = session?.exerciseIds ?? []

  // ---------- 把记录分成"力量"和"有氧"两拨 ----------
  //
  // 【为什么要分】
  // 有氧记录也躺在 entries 里（这样历史页、导出备份、导入恢复全都自动带上，
  // 不用改存储层）。但它的 weightKg 和 reps 都是 0 —— 占着位置但没有意义。
  // 所以凡是按"组数""总容量"说话的地方，都只能数力量那一拨，
  // 否则会显示成"3 组 · 总容量 0 kg"这种莫名其妙的话。
  const cardioIds = cardioIdSet(allExercises)
  const entries = session?.entries ?? []
  const strengthEntries = entries.filter((s) => !cardioIds.has(s.exerciseId))
  const cardioSeconds = entries
    .filter((s) => cardioIds.has(s.exerciseId))
    .reduce((sum, s) => sum + (s.durationSec ?? 0), 0)

  // 顶部那行小结：有几样说几样，没有的那一项整个不出现
  // （只练了有氧时不显示"0 组 · 总容量 0 kg"）
  const summaryParts: string[] = []
  if (strengthEntries.length > 0) {
    summaryParts.push(
      `${strengthEntries.length} 组 · 总容量 ${sessionVolume(
        strengthEntries,
      ).toLocaleString()} kg`,
    )
  }
  if (cardioSeconds > 0) {
    summaryParts.push(`有氧 ${formatDuration(cardioSeconds)}`)
  }
  const hasEntries = entries.length > 0

  // 结束训练那个弹窗里的一句话。
  // 和顶部那行小结不一样 —— 顶部是练的过程中看的（带总容量），
  // 这句是结束时确认用的，只说"练了多少"，不掺别的。
  const finishParts: string[] = []
  if (strengthEntries.length > 0) {
    finishParts.push(`${strengthEntries.length} 组力量`)
  }
  if (cardioSeconds > 0) {
    finishParts.push(`有氧 ${formatDuration(cardioSeconds)}`)
  }
  const finishSummary = `共 ${finishParts.join(' + ')}`

  // 点"结束训练"那一刻算出来的推荐档位。
  //
  // 【为什么存在 state 里，而不是每次渲染现算】
  // 两个原因：
  //   1. 算推荐要用"这场训练一共多久"，而那个时长只有到"点结束"这一刻
  //      才定得下来。在渲染过程里读当前时间会破坏 React 的"纯"规矩
  //      （检查工具 oxlint 会警告，这个项目里别处也是这么绕开的）。
  //   2. ★ 推荐用的时长必须和落盘用的时长是同一个，否则会出现
  //      "建议按 26 分钟算、热量按 31 分钟算"这种自相矛盾 ——
  //      在 30 分钟这个分界线上，差 5 分钟就会推荐错一档。
  // 存的是"档位 + 为什么"，不只是档位 —— 理由要显示在面板上，
  // 让人一眼看出系统是**根据什么**建议的（详见 lib/kcal.ts 的 MetRecommendation）。
  // 初值里的 reason 是空的，但面板只在点过"结束训练"之后才打开，
  // 那时候它一定已经被真正的推荐结果覆盖了，所以那个空串永远不会显示出来。
  const [recommendation, setRecommendation] = useState<MetRecommendation>({
    level: DEFAULT_MET_LEVEL,
    reason: '',
  })

  // 先存进储物柜，再更新界面。所有改动数据的操作都走这一个出口。
  function persist(next: WorkoutSession) {
    const ok = writeActiveWorkout(next)
    setSession(next)
    setStorageError(!ok)
  }

  // ---------- 加一个动作 ----------
  function addExercise(exerciseId: string) {
    const base: WorkoutSession = session ?? {
      id: newId(),
      date: todayKey(),
      entries: [],
      exerciseIds: [],
    }

    setPickerOpen(false)

    // 已经加过这个动作了，就不重复加（再点一次等于"取消"）
    if ((base.exerciseIds ?? []).includes(exerciseId)) return

    persist({
      ...base,
      exerciseIds: [...(base.exerciseIds ?? []), exerciseId],
      // startedAt 记下"这次训练是什么时候开始的"，只在第一次添加动作时写
      startedAt: base.startedAt ?? new Date().toISOString(),
    })
  }

  // ---------- 套用一个模板 ----------
  function applyTemplate(template: Template) {
    const base: WorkoutSession = session ?? {
      id: newId(),
      date: todayKey(),
      entries: [],
      exerciseIds: [],
    }

    setTemplatePickerOpen(false)

    // 模板里的动作，已经在今天训练里的就不再重复加
    const existing = new Set(base.exerciseIds ?? [])
    const added = template.items
      .map((item) => item.exerciseId)
      .filter((id) => !existing.has(id))

    // "目标几组几次"这份计划清单也要合并：
    // 同一个动作已经有目标就换成新的，没有就追加进去。
    // （这样连续套用"推日"和"腿日"时，两边的目标都能保留下来）
    const merged = [...(base.plannedItems ?? [])]
    for (const item of template.items) {
      const index = merged.findIndex((m) => m.exerciseId === item.exerciseId)
      if (index >= 0) merged[index] = item
      else merged.push(item)
    }

    persist({
      ...base,
      name: template.name,
      templateId: template.id,
      plannedItems: merged,
      exerciseIds: [...(base.exerciseIds ?? []), ...added],
      startedAt: base.startedAt ?? new Date().toISOString(),
    })
  }

  // ---------- 移掉一个动作（连同它已经记的组）----------
  function removeExercise(exerciseId: string) {
    if (!session) return
    persist({
      ...session,
      exerciseIds: (session.exerciseIds ?? []).filter((id) => id !== exerciseId),
      entries: session.entries.filter((s) => s.exerciseId !== exerciseId),
    })
  }

  // ---------- 记一组 ----------
  function addSet(
    exerciseId: string,
    weightKg: number,
    reps: number,
    rpe: number | null,
  ) {
    if (!session) return
    const entry: SetEntry = {
      id: newId(),
      exerciseId,
      weightKg,
      reps,
      // 注意这里是 ?? undefined：rpe 是 null（没填）时存成 undefined（字段直接不写），
      // 而不是存成 0 —— 否则统计时会把"没填"当成"RPE 为 0"
      rpe: rpe ?? undefined,
      completedAt: new Date().toISOString(),
    }
    // 记完一组，自动开始休息倒计时。先把"结束的那一刻"算出来 ——
    // 存档和界面都要用它，算两次可能出现几毫秒的差。
    //
    // 下一行的 Date.now() 是安全的：这行代码只有在你点 ✓ 的那一刻才执行，
    // 属于"事件处理"，不是渲染过程。
    // 检查工具 oxlint 分不清这两者，会误报一条 react(purity) 警告，所以这里显式忽略它。
    // oxlint-disable-next-line react/purity
    const restEndsAtNext = Date.now() + settings.restSec * 1000

    // ★ 倒计时和这一组一起写进**同一份存档**，一次写盘搞定两件事。
    //   以前是先写训练、再单独 setRestEndsAt（只改内存不落盘），
    //   结果切个 tab 训练页一卸载，倒计时就没了。
    persist({
      ...session,
      entries: [...session.entries, entry],
      restEndsAt: restEndsAtNext,
    })

    // 解锁音响。放在这里是因为此刻正处在"用户手指点击"的那一瞬间 ——
    // 这是浏览器唯一允许我们把音响打开的时机。
    // 错过这一下，90 秒后想自动响铃就会被浏览器拒绝。
    unlockAudio()
    setRestEndsAt(restEndsAtNext)

    // 通知那边"重新判断一次"。
    //
    // 【这时候人在前台，本该什么都不用做 —— 为什么还要调】
    // 因为"切后台"那个信号（appStateChange）万一没送到（WebView 被系统
    // 暂停过、事件丢了之类），手机上就可能留着一条过期的预约。
    // 每个改动休息状态的地方都重新断言一次，这类残留就自己没了。
    syncRestNotify()

    // 第一次开始休息，顺手问一句要不要开后台提醒。
    // 只问一次 —— 拒绝了就再也不弹，改成倒计时下面那行"点这里开启"。
    // 放在最后，是因为前面记训练、开音响、起倒计时才是正事，绝不能挡在它前面。
    void askRestNotifyFirstTime()
  }

  // 算热量估算用的体重。优先「身体数据」里最近一次，没记过才用设置里那个默认值。
  // 两个都没有就是 undefined —— 那时不显示热量，并提示去哪填。
  const weightKg = resolveWeightKg(bodyMetrics, settings)

  // ---------- 记一次有氧 ----------
  //
  // 【为什么它和上面的 addSet 是分开的两个函数】
  // 力量是"点一次 ✓ 加一组"，有氧是"填完表单加一条"，两者的入口和
  // 要填的东西完全不同。硬凑进一个函数会到处是 if，反而更难读。
  //
  // 【有氧为什么不触发休息倒计时】
  // 那个 90 秒倒计时是给力量组间用的。跑完步不需要"休息 90 秒"。
  function addCardio(
    exerciseId: string,
    durationSec: number,
    distanceM: number | undefined,
    kcal: number | undefined,
  ) {
    const base: WorkoutSession = session ?? {
      id: newId(),
      date: todayKey(),
      entries: [],
      exerciseIds: [],
    }

    const entry: SetEntry = {
      id: newId(),
      exerciseId,
      // 有氧没有重量和次数，填 0。
      // 为什么不干脆不写这两个字段：见 types.ts 里 SetEntry 那段注释 ——
      // 改成可选会让全项目好几处算法算出 NaN，然后污染所有图表。
      weightKg: 0,
      reps: 0,
      completedAt: new Date().toISOString(),
      durationSec,
      // 没填距离时 distanceM 是 undefined，整个字段就不写进去，
      // 而不是写个 0 —— "跑了 0 米"和"没记距离"是两回事。
      // 统计页画"单次距离"那张图时要靠这个区分。
      distanceM,
      // 从器械上抄来的热量。只存手填的，估算值不存 ——
      // 估算值是算出来的，存下来以后改了公式或体重，老记录就不会跟着更新了。
      kcal,
    }

    // 这个有氧动作今天记过没有？记过就不再重复塞进 exerciseIds，
    // 否则卡片列表里会冒出两张一模一样的
    const already = (base.exerciseIds ?? []).includes(exerciseId)

    persist({
      ...base,
      exerciseIds: already
        ? (base.exerciseIds ?? [])
        : [...(base.exerciseIds ?? []), exerciseId],
      entries: [...base.entries, entry],
      startedAt: base.startedAt ?? new Date().toISOString(),
    })

    setCardioOpen(false)
    setCardioPresetId(undefined)
  }

  // ---------- 关掉休息倒计时 ----------
  //
  // 两种情况会走到这里：点"跳过"提前结束，或者休息结束后点"点一下继续"。
  //
  // ★ 两边都要清：内存里的（界面立刻变）和存档里的（切个 tab 再回来
  //   不会又冒出来）。只清内存的话，倒计时会在切回来时"复活"。
  function clearRest() {
    setRestEndsAt(null)
    if (session !== null) {
      persist({ ...session, restEndsAt: undefined })
    }
    // ★ 通知那边也要跟着取消。
    //   少了这一句就会出现最难受的那一幕：你已经跳过休息进了下一组，
    //   手机到点还在响 —— 因为预约还留在系统里没人撤。
    syncRestNotify()
  }

  // ---------- 删掉记错的一组 ----------
  function removeSet(setId: string) {
    if (!session) return
    persist({
      ...session,
      entries: session.entries.filter((s) => s.id !== setId),
    })
  }

  // ---------- 这次训练收摊 ----------
  //
  // 所有"训练结束"的出口都走这一个函数，因为收摊要做的不止一件事。
  //
  // ★ 必须顺手把休息倒计时也清掉。
  //   不然会出这么一幕：你在最后一组点完 ✓（倒计时自动开始），
  //   紧接着点"结束训练"——训练是结束了，可"休息中 1:23"还赖在页面上，
  //   而且到点还会响一声、那段时间屏幕也一直被挂着不让熄灭。
  //   训练都结束了，哪还有"组间休息"这回事。
  //
  // 【为什么抽成一个函数，而不是在两处各写三行】
  //   写两遍的话，哪天再加一个"结束训练"的入口（或者再加一件收摊要做的事），
  //   一定会漏掉其中一处 —— 这次这个 bug 就是这么来的。
  function endSession() {
    clearActiveWorkout()
    setSession(null)
    setRestEndsAt(null)
    // 和 clearRest 同理：训练都结束了，系统里那条预约也必须撤掉，
    // 不然你收拾东西走出健身房，手机还在包里响个不停
    syncRestNotify()
  }

  // ---------- 结束训练 ----------
  function finishWorkout() {
    if (!session) return

    // 一组都没记：直接丢弃，不往历史里塞空记录，也不用问
    if (session.entries.length === 0) {
      endSession()
      return
    }

    // 练了力量 → 弹强度选择面板。它顺便代替了原来的"确定要结束吗"。
    // 为什么要问：同样练 1 小时，轻重量和大重量的热量能差一倍
    // （MET 3.0 对 6.0），而系统只能从数据里猜，看不见"你今天状态不好"。
    if (strengthEntries.length > 0) {
      // ★ 用 completedSession() 补好时长再推荐 —— 这样推荐和落盘
      //   用的是同一个时长，不会在 30 分钟这种分界线上打架
      setRecommendation(recommendMetLevel(completedSession(session), cardioIds))
      setMetPickerOpen(true)
      return
    }

    // 纯有氧 → 用不上力量档位，沿用原来那个确认框
    const confirmed = window.confirm(
      `结束今天的训练吗？\n\n${finishSummary}，会存进历史记录。`,
    )
    if (!confirmed) return
    saveWorkout(undefined)
  }

  // ---------- 把"正在进行的那份"补成"可以存的那份" ----------
  //
  // 【为什么现在才能补时长】
  // 时长只有到"结束"这一刻才知道。存在 active-workout 里的那份每次点 ✓
  // 都会被覆盖重写，所以不能提前写；这里算一次、只写进 sessions。
  //
  // 【为什么是"整场时长"而不是"做组时长"】
  // 热量用的 MET 档位是按整场训练的平均强度定的。只算做组时间的话，
  // 同样的组数时长会短一大截，热量会严重高估。所以必须含组间休息。
  //
  // ★ 推荐档位和落盘都走这一个函数，保证两处用的是同一个时长口径。
  function completedSession(s: WorkoutSession): WorkoutSession {
    return {
      ...s,
      // 传"现在"进去，拿到的是从开始到此刻的整场时长（含组间休息）。
      // 算不出来时保留原值（多半本来是 undefined，界面会显示"—"，不会崩）。
      durationSec:
        sessionSeconds(s, new Date().toISOString()) ?? s.durationSec,
    }
  }

  // ---------- 真正落盘 ----------
  //
  // metLevel 为 undefined 表示"这次没有力量训练"，没有档位可记。
  function saveWorkout(metLevel: StrengthMetLevel | undefined) {
    if (!session) return

    const finished: WorkoutSession = {
      ...completedSession(session),
      // 用展开语法按条件加字段，而不是写 metLevel: metLevel ——
      // 后者会在纯有氧时写出一个 metLevel: undefined 的键，
      // 虽然读出来一样，但存进 json 会多一行没意义的空字段
      ...(metLevel !== undefined ? { metLevel } : {}),
      // 顺手把休息倒计时抹掉：训练都结束了，历史记录里留着
      // "休息到几点结束"没有任何意义。
      // 写成 undefined 而不是 delete —— JSON.stringify 会把值是 undefined
      // 的键自动扔掉，所以存档里不会真的多出这一行。
      restEndsAt: undefined,
    }

    // 【这里的顺序非常关键，是防丢数据最重要的一处】
    //
    // 必须"先确认存进历史成功了"，才能清空"正在进行"那一格。
    // 如果反过来先清空，万一存历史失败（比如手机存储满了），
    // 这次训练就两头都没了 —— 彻底丢失，找不回来。
    const others = readSessions().filter((s) => s.date !== session.date)
    const saved = writeSessions([...others, finished])
    if (!saved) {
      setStorageError(true)
      // 故意不清空：数据还留在"正在进行"里，你稍后存储恢复了还能再点一次
      return
    }

    // 记住这次选的档，下次打开默认就用它。
    // 用 readSettings() 现读，而不是用上面那个 settings state ——
    // 那个是挂载时读一次的，可能已经过时了。
    if (metLevel !== undefined) {
      writeSettings({ ...readSettings(), lastMetLevel: metLevel })
    }

    endSession()
    setMetPickerOpen(false)
  }

  // ---------- 休息倒计时下面那行小字 ----------
  //
  // 分四种情况。分这么细是因为"切走之后到底会不会响"现在真的分好几种，
  // 得说实话 —— 以前那行写的是"切走了就不会提醒你（浏览器的限制）"，
  // 那句话现在是假的了。
  const notifyHint = !notifyStatus.native
    ? '网页版切走就收不到提醒了（装成 App 才行）'
    : !notifyStatus.granted
      ? '开启通知权限才能在后台提醒 · 点这里开启'
      : notifyStatus.exact
        ? '切到别的 App、锁屏，到点都会提醒你'
        : '切到别的 App 也会提醒你（可能晚几秒）'

  // 只有"还没授权"那一档才让这行字可以点。
  // 其它几档要么没事了，要么（精确闹钟）该去设置页慢慢弄 ——
  // 训练中间把人甩到系统设置页里，找不回来更麻烦。
  const notifyAction =
    notifyStatus.native && !notifyStatus.granted
      ? () => void requestRestNotify()
      : undefined

  return (
    <div>
      {/* ---------- 顶部：日期 / 小结 / 结束按钮 ---------- */}
      <div className="mb-4 flex items-start gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {formatDateCN(session?.date ?? today)}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {hasEntries ? summaryParts.join(' · ') : '还没开始记'}
          </p>
        </div>
        {session !== null && (
          <button
            type="button"
            onClick={finishWorkout}
            className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm text-ink-2"
          >
            {hasEntries ? '结束训练' : '清空'}
          </button>
        )}
      </div>

      {/* ---------- 存不进去时的警告 ---------- */}
      {storageError && (
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
          存不进去了，可能是手机存储满了。先别继续记，请告诉我。
        </div>
      )}

      {/* ---------- 休息倒计时 ---------- */}
      {restEndsAt !== null && (
        <RestTimer
          endsAt={restEndsAt}
          onClose={clearRest}
          notifyHint={notifyHint}
          onEnableNotify={notifyAction}
        />
      )}

      {/* ---------- 每个动作一张卡片 ---------- */}
      {exerciseIds.map((id) => {
        const exercise = allExercises.find((e) => e.id === id)
        const sets = (session?.entries ?? []).filter((s) => s.exerciseId === id)
        // 这个动作有没有来自模板的"目标几组几次"
        const planned = (session?.plannedItems ?? []).find(
          (p) => p.exerciseId === id,
        )
        return (
          <ExerciseCard
            key={id}
            name={exercise?.name ?? '（已删除的动作）'}
            equipment={exercise?.equipment ?? ''}
            sets={sets}
            planned={planned}
            showRpe={settings.rpeEnabled}
            isCardio={exerciseKind(exercise) === 'cardio'}
            onAddSet={(w, r, rpe) => addSet(id, w, r, rpe)}
            onRemoveSet={removeSet}
            onRemoveExercise={() => removeExercise(id)}
            onAddMoreCardio={() => {
              setCardioPresetId(id)
              setCardioOpen(true)
            }}
          />
        )
      })}

      {/* ---------- 添加动作 ---------- */}
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={`w-full rounded-xl border border-dashed border-line py-4 text-sm text-ink-2 ${
          exerciseIds.length === 0 ? 'min-h-[120px] text-base' : ''
        }`}
      >
        {exerciseIds.length === 0
          ? '+ 点这里添加动作，开始今天的训练'
          : '+ 添加动作'}
      </button>

      {/* ---------- 记一次有氧 ----------
          和上面的"添加动作"并排，因为它是同一类操作（都是"给这次训练加点内容"）。

          【为什么有氧要单独一个按钮】
          它走的是完全不同的表单：只填时长和距离，不填重量和次数。
          而且在动作库里选动作时，有氧那 11 个是被排除掉的（见 ExercisePicker），
          所以必须有这么一个专门的入口，否则有氧根本记不了。 */}
      <button
        type="button"
        onClick={() => {
          setCardioPresetId(undefined)
          setCardioOpen(true)
        }}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-4 text-sm text-ink-2"
      >
        + 记有氧
      </button>

      {/* 一键套用模板：自动把一整套动作和目标组数次数填进来 */}
      <button
        type="button"
        onClick={() => setTemplatePickerOpen(true)}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-4 text-sm text-ink-2"
      >
        套用模板
      </button>

      {pickerOpen && (
        <ExercisePicker
          customExercises={customExercises}
          onPick={addExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {templatePickerOpen && (
        <TemplatePicker
          customTemplates={customTemplates}
          allExercises={allExercises}
          onPick={applyTemplate}
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}

      {cardioOpen && (
        <CardioForm
          allExercises={allExercises}
          initialExerciseId={cardioPresetId}
          weightKg={weightKg}
          onSave={addCardio}
          onCancel={() => {
            setCardioOpen(false)
            setCardioPresetId(undefined)
          }}
        />
      )}

      {metPickerOpen && session !== null && (
        <MetPicker
          recommended={recommendation.level}
          // 第一次用（没选过）就用推荐值；之后默认用上次选的。
          // 两句话都要满足，所以界面上还会标出"建议"哪一档。
          defaultLevel={settings.lastMetLevel ?? recommendation.level}
          summary={finishSummary}
          onConfirm={saveWorkout}
          onCancel={() => setMetPickerOpen(false)}
        />
      )}
    </div>
  )
}

// ============================================================
// 一个动作的卡片：显示动作名 + 已完成的组 + 输入行
// ============================================================

function ExerciseCard({
  name,
  equipment,
  sets,
  planned,
  showRpe,
  isCardio,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onAddMoreCardio,
}: {
  name: string
  equipment: string
  sets: SetEntry[]
  planned?: PlannedItem // 来自模板的"目标几组几次"。手动加的动作没有这个
  showRpe: boolean
  // 这个动作是不是有氧。力量和有氧只差在"下半截"：
  //   力量 → 列出一组组"80 kg × 8"，下面跟一个输入行
  //   有氧 → 列出"30 分钟 · 5.00 公里 · 配速 6'00"/公里"，下面跟一个"再记一次"
  // 卡片头（动作名、移除按钮）两者共用。
  isCardio: boolean
  onAddSet: (weightKg: number, reps: number, rpe: number | null) => void
  onRemoveSet: (setId: string) => void
  onRemoveExercise: () => void
  onAddMoreCardio: () => void
}) {
  // 输入框里的内容按"文字"存，理由见 NumberField.tsx 的注释
  const [weightText, setWeightText] = useState('')
  const [repsText, setRepsText] = useState('')
  const [rpeText, setRpeText] = useState('')

  const weight = textToNumber(weightText)
  const reps = textToNumber(repsText)

  // 重量和次数都填了才能点 ✓。
  // 注意 0 是合法的（引体向上、平板支撑），所以判断的是"有没有填"而不是"是不是大于 0"。
  const canConfirm = weight !== null && reps !== null

  function handleConfirm() {
    if (weight === null || reps === null) return
    onAddSet(weight, reps, textToNumber(rpeText))

    // 【这是"5 秒记一组"的关键】
    // 点完 ✓ 后故意不清空重量和次数 —— 因为下一组通常还是同样的重量。
    // 你可以直接再点一次 ✓ 就记下第二组，只改需要变的那一项。
    // 只清空 RPE，因为每一组的费力程度通常不一样。
    setRpeText('')
  }

  return (
    <div className="mb-3 rounded-xl border border-line bg-surface p-3">
      {/* ---------- 动作名 ---------- */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1">
          <div className="font-medium text-ink">{name}</div>
          {(equipment !== '' || planned !== undefined) && (
            <div className="mt-0.5 text-xs text-muted">
              {equipment}
              {equipment !== '' && planned !== undefined && ' · '}
              {planned !== undefined && (
                <>
                  目标 {planned.targetSets} 组 × {planned.targetReps} 次 ·{' '}
                  <span
                    className={
                      sets.length >= planned.targetSets
                        ? 'font-semibold text-brand'
                        : undefined
                    }
                  >
                    {sets.length}/{planned.targetSets}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRemoveExercise}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted"
        >
          移除动作
        </button>
      </div>

      {/* ---------- 下半截：有氧和力量在这里分道扬镳 ---------- */}
      {isCardio ? (
        <>
          {/* 有氧每条就是一句话，没有组号也没有 RPE */}
          {sets.map((s) => (
            <div
              key={s.id}
              className="mb-2 flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm"
            >
              <span className="flex-1 text-ink">{describeCardio(s)}</span>
              <button
                type="button"
                onClick={() => onRemoveSet(s.id)}
                className="shrink-0 px-1 text-muted"
              >
                ×
              </button>
            </div>
          ))}

          {/* 再记一次：直接带着这个动作打开录入面板，省掉"重新选一遍" */}
          <button
            type="button"
            onClick={onAddMoreCardio}
            className="mt-3 min-h-11 w-full rounded-lg border border-dashed border-line text-sm text-ink-2"
          >
            + 再记一次
          </button>
        </>
      ) : (
        <>
          {/* ---------- 已经记好的组 ---------- */}
          {sets.map((s, index) => (
            <div
              key={s.id}
              className="mb-2 flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm"
            >
              <span className="w-4 shrink-0 text-muted">{index + 1}</span>
              <span className="flex-1 text-ink">
                {s.weightKg} kg × {s.reps}
              </span>
              {s.rpe !== undefined && (
                <span className="shrink-0 text-xs text-muted">RPE {s.rpe}</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveSet(s.id)}
                className="shrink-0 px-1 text-muted"
              >
                ×
              </button>
            </div>
          ))}

          {/* ---------- 输入行 ---------- */}
          <div className="mt-3">
            <SetRow
              weightText={weightText}
              repsText={repsText}
              rpeText={rpeText}
              showRpe={showRpe}
              onWeightChange={setWeightText}
              onRepsChange={setRepsText}
              onRpeChange={setRpeText}
              onConfirm={handleConfirm}
              canConfirm={canConfirm}
            />
          </div>
        </>
      )}
    </div>
  )
}
