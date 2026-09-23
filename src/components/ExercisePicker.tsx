import { useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../types'
import type { Exercise, MuscleGroup } from '../types'
import { mergeExercises } from '../data/exercises'

// ============================================================
// 选动作的弹层
// ============================================================
// 记训练时点"+ 添加动作"弹出它。
// 里面的"搜索 + 筛选"逻辑和动作库页面是一样的 ——
// 是的，有一点重复。故意这么做的：
// 动作库页面点一条是"展开看要领"，这里点一条是"选中它"，
// 两边的行为不一样，硬凑成一个组件反而更难懂。
//
// 如果以后搜索的规矩要改（比如也搜要领），记得两个文件都要改：
//   src/screens/LibraryScreen.tsx
//   src/components/ExercisePicker.tsx
// ============================================================

type Filter = MuscleGroup | 'all'

type Props = {
  customExercises: Exercise[] // 你自己建的动作
  onPick: (exerciseId: string) => void
  onClose: () => void
}

export function ExercisePicker({ customExercises, onPick, onClose }: Props) {
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const all = mergeExercises(customExercises)
  const kw = keyword.trim()
  const list = all.filter((item) => {
    if (filter !== 'all' && item.muscleGroup !== filter) return false
    if (kw === '') return true
    return item.name.includes(kw) || item.equipment.includes(kw)
  })

  return (
    // 盖住整个屏幕。flex-col 让下面的列表能自己滚动，搜索框和筛选条固定不动。
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col overflow-hidden p-4">
        {/* ---------- 标题栏 ---------- */}
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">选一个动作</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg border border-line px-4 text-sm text-ink-2"
          >
            取消
          </button>
        </div>

        {/* ---------- 搜索框 ---------- */}
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索动作名或器械…"
          className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
        />

        {/* ---------- 肌群筛选条 ---------- */}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
              filter === 'all'
                ? 'border-brand bg-brand font-semibold text-bg'
                : 'border-line text-ink-2'
            }`}
          >
            全部
          </button>
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              type="button"
              onClick={() => setFilter(group)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
                filter === group
                  ? 'border-brand bg-brand font-semibold text-bg'
                  : 'border-line text-ink-2'
              }`}
            >
              {MUSCLE_LABELS[group]}
            </button>
          ))}
        </div>

        {/* ---------- 动作列表（可滚动）---------- */}
        <div className="flex-1 overflow-y-auto">
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick(item.id)}
              className="mb-2 flex w-full items-center gap-2 rounded-xl border border-line bg-surface p-3 text-left"
            >
              <div className="flex-1">
                <div className="font-medium text-ink">{item.name}</div>
                <div className="mt-0.5 text-sm text-muted">
                  {MUSCLE_LABELS[item.muscleGroup]}
                  {item.equipment !== '' && ` · ${item.equipment}`}
                </div>
              </div>
              {item.isCustom && (
                <span className="shrink-0 rounded bg-brand/20 px-1.5 py-0.5 text-xs text-brand">
                  自建
                </span>
              )}
            </button>
          ))}

          {list.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">
              没找到符合条件的动作
              <br />
              想新建的话，去「设置 → 动作库」
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
