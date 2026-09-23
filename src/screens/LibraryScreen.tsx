import { useState } from 'react'
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../types'
import type { Exercise, MuscleGroup } from '../types'
import { mergeExercises } from '../data/exercises'
import { readCustomExercises, writeCustomExercises } from '../lib/storage'
import { ExerciseForm } from '../components/ExerciseForm'

// ============================================================
// 动作库页面
// ============================================================
// 显示 40 个预置动作 + 你自己建的动作，可以搜索、按肌群筛选、点开看要领。
//
// 【数据从哪来】
//   预置的 40 个：写在 src/data/exercises.ts 的代码里，永远都在
//   自建的：存在浏览器储物柜里，打开这个页面时读出来
// ============================================================

// 筛选条上的选项。除了 6 个肌群，还多一个 'all'（全部）
type Filter = MuscleGroup | 'all'

export function LibraryScreen({ onBack }: { onBack: () => void }) {
  // useState(函数) 这种写法表示："只在第一次显示这个页面时读一次储物柜"。
  // 如果写成 useState(readCustomExercises())，每次重画都会白读一遍。
  const [custom, setCustom] = useState<Exercise[]>(readCustomExercises)

  const [keyword, setKeyword] = useState('') // 搜索框里打的字
  const [filter, setFilter] = useState<Filter>('all') // 当前选中的肌群
  const [expandedId, setExpandedId] = useState<string | null>(null) // 哪个动作被点开了
  const [isCreating, setIsCreating] = useState(false) // 新建弹窗要不要显示
  const [storageError, setStorageError] = useState(false) // 存不进去时的红色提示

  // 预置的 + 自建的，合成一个总列表
  const all = mergeExercises(custom)

  // 按搜索词和肌群过一遍，得到最终要显示的列表
  const kw = keyword.trim()
  const list = all.filter((item) => {
    if (filter !== 'all' && item.muscleGroup !== filter) return false
    if (kw === '') return true
    // includes 的意思是"包含"。搜"卧推"能命中"杠铃卧推"和"上斜哑铃卧推"
    return item.name.includes(kw) || item.equipment.includes(kw)
  })

  function handleSave(exercise: Exercise) {
    const next = [...custom, exercise]
    const ok = writeCustomExercises(next) // 先存进储物柜
    setCustom(next) // 再更新界面上的列表
    setIsCreating(false)
    setStorageError(!ok)
  }

  return (
    <div>
      {/* ---------- 顶部：返回 / 标题 / 新建 ---------- */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink-2"
        >
          ‹ 返回
        </button>
        <h1 className="flex-1 text-lg font-semibold">动作库</h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand"
        >
          + 新建
        </button>
      </div>

      {/* ---------- 存不进去时的警告 ---------- */}
      {storageError && (
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
          存不进去了，可能是手机存储满了。请先导出备份再清理（导出功能在阶段 6 做）。
        </div>
      )}

      {/* ---------- 搜索框 ---------- */}
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索动作名或器械…"
        className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
      />

      {/* ---------- 肌群筛选条 ---------- */}
      {/* overflow-x-auto = 选项太多时可以左右滑动，不会挤成两行 */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip
          label="全部"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        {MUSCLE_GROUPS.map((group) => (
          <FilterChip
            key={group}
            label={MUSCLE_LABELS[group]}
            active={filter === group}
            onClick={() => setFilter(group)}
          />
        ))}
      </div>

      {/* ---------- 数量提示 ---------- */}
      <p className="mb-2 text-sm text-muted">
        共 {list.length} 个动作
        {filter === 'all' && kw === '' && `（预置 40 个 + 自建 ${custom.length} 个）`}
      </p>

      {/* ---------- 动作列表 ---------- */}
      {list.map((item) => {
        const expanded = expandedId === item.id
        return (
          <button
            key={item.id}
            type="button"
            // 再点一次就收起来
            onClick={() => setExpandedId(expanded ? null : item.id)}
            className="mb-2 w-full rounded-xl border border-line bg-surface p-3 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink">{item.name}</span>
              {item.isCustom && (
                <span className="rounded bg-brand/20 px-1.5 py-0.5 text-xs text-brand">
                  自建
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-muted">
              {MUSCLE_LABELS[item.muscleGroup]}
              {/* 器械留空时就不显示"·"，免得出现一个孤零零的圆点 */}
              {item.equipment !== '' && ` · ${item.equipment}`}
            </div>
            {expanded && item.note && (
              <p className="mt-2 border-t border-line pt-2 text-sm text-ink-2">
                {item.note}
              </p>
            )}
          </button>
        )
      })}

      {/* ---------- 什么都没搜到 ---------- */}
      {list.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          没找到符合条件的动作
          <br />
          换个词试试，或者点右上角"+ 新建"自己加一个
        </p>
      )}

      {/* ---------- 新建弹窗 ---------- */}
      {isCreating && (
        <ExerciseForm
          onSave={handleSave}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  )
}

// 筛选条上的一个小圆角按钮。单独写出来是为了不用把同样的样式抄 7 遍。
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
        active
          ? 'border-brand bg-brand font-semibold text-on-brand'
          : 'border-line text-ink-2'
      }`}
    >
      {label}
    </button>
  )
}
