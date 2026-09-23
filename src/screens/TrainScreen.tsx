import { useEffect, useState } from 'react'
import type {
  Exercise,
  PlannedItem,
  SetEntry,
  Settings,
  Template,
  WorkoutSession,
} from '../types'
import { mergeExercises } from '../data/exercises'
import { registerBackHandler } from '../lib/backbutton'
import { newId } from '../lib/id'
import { formatDateCN, todayKey } from '../lib/date'
import { sessionVolume, textToNumber } from '../lib/calc'
import { unlockAudio } from '../lib/beep'
import {
  clearActiveWorkout,
  readActiveWorkout,
  readCustomExercises,
  readSessions,
  readSettings,
  readTemplates,
  writeActiveWorkout,
  writeSessions,
} from '../lib/storage'
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
  const [session, setSession] = useState<WorkoutSession | null>(
    readActiveWorkout,
  )
  const [customExercises] = useState<Exercise[]>(readCustomExercises)
  const [settings] = useState<Settings>(readSettings)
  const [customTemplates] = useState<Template[]>(readTemplates)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)
  // 休息倒计时"结束的时间点"。null 表示当前没在休息。
  // 注意存的是"结束时刻"而不是"还剩几秒"，原因见 RestTimer.tsx 的注释。
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)

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
    persist({ ...session, entries: [...session.entries, entry] })

    // 记完一组，自动开始休息倒计时。
    //
    // 解锁音响也放在这里，因为此刻正处在"用户手指点击"的那一瞬间 ——
    // 这是浏览器唯一允许我们把音响打开的时机。
    // 错过这一下，90 秒后想自动响铃就会被浏览器拒绝。
    unlockAudio()
    // 下一行的 Date.now() 是安全的：这行代码只有在你点 ✓ 的那一刻才执行，
    // 属于"事件处理"，不是渲染过程。
    // 检查工具 oxlint 分不清这两者，会误报一条 react(purity) 警告，所以这里显式忽略它。
    // oxlint-disable-next-line react/purity
    setRestEndsAt(Date.now() + settings.restSec * 1000)
  }

  // ---------- 删掉记错的一组 ----------
  function removeSet(setId: string) {
    if (!session) return
    persist({
      ...session,
      entries: session.entries.filter((s) => s.id !== setId),
    })
  }

  // ---------- 结束训练 ----------
  function finishWorkout() {
    if (!session) return

    // 一组都没记：直接丢弃，不往历史里塞空记录，也不用问
    if (session.entries.length === 0) {
      clearActiveWorkout()
      setSession(null)
      return
    }

    // 记了东西：先问一句，免得手滑点掉
    const confirmed = window.confirm(
      `结束今天的训练吗？\n\n共 ${session.entries.length} 组，会存进历史记录。`,
    )
    if (!confirmed) return

    // 【这里的顺序非常关键，是防丢数据最重要的一处】
    //
    // 必须"先确认存进历史成功了"，才能清空"正在进行"那一格。
    // 如果反过来先清空，万一存历史失败（比如手机存储满了），
    // 这次训练就两头都没了 —— 彻底丢失，找不回来。
    const others = readSessions().filter((s) => s.date !== session.date)
    const saved = writeSessions([...others, session])
    if (!saved) {
      setStorageError(true)
      // 故意不清空：数据还留在"正在进行"里，你稍后存储恢复了还能再点一次
      return
    }

    clearActiveWorkout()
    setSession(null)
  }

  const hasSets = (session?.entries.length ?? 0) > 0

  return (
    <div>
      {/* ---------- 顶部：日期 / 小结 / 结束按钮 ---------- */}
      <div className="mb-4 flex items-start gap-2">
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {formatDateCN(session?.date ?? today)}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {hasSets
              ? `${session?.entries.length} 组 · 总容量 ${sessionVolume(
                  session?.entries ?? [],
                ).toLocaleString()} kg`
              : '还没开始记'}
          </p>
        </div>
        {session !== null && (
          <button
            type="button"
            onClick={finishWorkout}
            className="min-h-11 shrink-0 rounded-lg border border-line px-3 text-sm text-ink-2"
          >
            {hasSets ? '结束训练' : '清空'}
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
        <RestTimer endsAt={restEndsAt} onClose={() => setRestEndsAt(null)} />
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
            onAddSet={(w, r, rpe) => addSet(id, w, r, rpe)}
            onRemoveSet={removeSet}
            onRemoveExercise={() => removeExercise(id)}
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

      {/* 一键套用模板：自动把一整套动作和目标组数次数填进来 */}
      <button
        type="button"
        onClick={() => setTemplatePickerOpen(true)}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-4 text-sm text-ink-2"
      >
        套用模板（推日 / 拉日 / 腿日）
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
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}: {
  name: string
  equipment: string
  sets: SetEntry[]
  planned?: PlannedItem // 来自模板的"目标几组几次"。手动加的动作没有这个
  showRpe: boolean
  onAddSet: (weightKg: number, reps: number, rpe: number | null) => void
  onRemoveSet: (setId: string) => void
  onRemoveExercise: () => void
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
    </div>
  )
}
