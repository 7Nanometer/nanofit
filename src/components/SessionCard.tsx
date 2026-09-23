import type { Exercise, SetEntry, WorkoutSession } from '../types'
import { exerciseName } from '../data/exercises'
import { formatDateCN } from '../lib/date'
import { sessionVolume } from '../lib/calc'

// ============================================================
// 历史记录里的一条
// ============================================================
// 有两种样子：
//   收起来时 —— 只显示一行摘要（几月几号、几个动作、多少组、总容量）
//   点开后   —— 显示每个动作、每一组的重量 × 次数
//
// 【为什么默认收起来】
// 练了半年就有 100 多条记录，全部展开会长得没法看。
// 摘要里放"总容量"这个数字，是因为它最能反映"这次练了多少"，
// 拿来跟以前比进步最直观。
// ============================================================

type Props = {
  session: WorkoutSession
  allExercises: Exercise[] // 用来把动作 id 翻成中文名
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
}

export function SessionCard({
  session,
  allExercises,
  expanded,
  onToggle,
  onDelete,
}: Props) {
  const groups = groupByExercise(session, allExercises)

  return (
    <div className="mb-2 rounded-xl border border-line bg-surface">
      {/* ---------- 收起来时的样子（整个卡片都能点） ---------- */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="flex-1 font-medium text-ink">
            {formatDateCN(session.date)}
            {session.name !== undefined && ` · ${session.name}`}
          </span>
          <span className="shrink-0 text-muted">{expanded ? '收起' : '展开'}</span>
        </div>
        <div className="mt-1 text-sm text-muted">
          {groups.length} 个动作 · {session.entries.length} 组 · 总容量{' '}
          {sessionVolume(session.entries).toLocaleString()} kg
        </div>
      </button>

      {/* ---------- 点开后的样子 ---------- */}
      {expanded && (
        <div className="border-t border-line p-3">
          {groups.map((group) => (
            <div key={group.exerciseId} className="mb-3 last:mb-0">
              <div className="mb-1 text-sm font-medium text-ink-2">
                {group.name}
              </div>
              {group.sets.map((set, index) => (
                <div
                  key={set.id}
                  className="flex items-center gap-3 py-0.5 text-sm text-ink"
                >
                  <span className="w-4 text-muted">{index + 1}</span>
                  <span>
                    {set.weightKg} kg × {set.reps}
                  </span>
                  {set.rpe !== undefined && (
                    <span className="text-xs text-muted">RPE {set.rpe}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          <button
            type="button"
            onClick={onDelete}
            className="mt-2 w-full rounded-lg border border-line py-2 text-sm text-muted"
          >
            删除这次训练
          </button>
        </div>
      )}
    </div>
  )
}

// 把一次训练里那一长串"组"，按动作归拢到一起。
//
// 为什么要归拢：entries 是一条条平铺的组，
// 直接列出来会是"80kg×8、80kg×7、60kg×10、60kg×9……"这样一大串，
// 根本看不出哪个动作是哪个动作。
type Group = {
  exerciseId: string
  name: string
  sets: SetEntry[]
}

function groupByExercise(
  session: WorkoutSession,
  allExercises: Exercise[],
): Group[] {
  // Map 是一个"键值对"容器，这里用"动作 id"当键，把同一个动作的组攒在一起
  const buckets = new Map<string, SetEntry[]>()

  for (const entry of session.entries) {
    const list = buckets.get(entry.exerciseId) ?? []
    list.push(entry)
    buckets.set(entry.exerciseId, list)
  }

  // Map 会按"放进去的先后顺序"取出来，
  // 所以动作的排列顺序正好就是你当时练的顺序
  const groups: Group[] = []
  for (const [exerciseId, sets] of buckets) {
    groups.push({
      exerciseId,
      // 动作可能已经被删掉了（自建动作可以删），exerciseName 会给出提示而不是空白
      name: exerciseName(allExercises, exerciseId),
      sets,
    })
  }
  return groups
}
