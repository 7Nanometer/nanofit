import { useState } from 'react'
import type { Exercise, WorkoutSession } from '../types'
import { mergeExercises } from '../data/exercises'
import { readCustomExercises, readSessions, writeSessions } from '../lib/storage'
import { SessionCard } from '../components/SessionCard'

// ============================================================
// 历史页
// ============================================================
// 按日期从近到远列出所有练过的训练，点开看每一组。
//
// 【数据从哪来】
// 就是你在训练页点"结束训练"时存进去的那些。
// 它们躺在储物柜的 nanofit:v1:sessions 那一格里。
// ============================================================

export function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(readSessions)
  const [customExercises] = useState<Exercise[]>(readCustomExercises)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterExerciseId, setFilterExerciseId] = useState('')
  const [storageError, setStorageError] = useState(false)

  const allExercises = mergeExercises(customExercises)

  // 按日期倒序排（最近的在最上面）。
  // localeCompare 是按文字比较：'2026-09-24' 会排在 '2026-09-23' 前面，
  // 因为日期写成"年-月-日"这个格式，按文字比就等于按时间比。
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  // 按动作筛选：只留下"练过这个动作"的那些训练
  const list =
    filterExerciseId === ''
      ? sorted
      : sorted.filter((s) =>
          s.entries.some((e) => e.exerciseId === filterExerciseId),
        )

  // 找出"历史里真正练过的动作"，用来做筛选下拉。
  // 注意不是把 40 个动作全列出来 —— 没练过的列出来只会碍事。
  const usedIds = new Set<string>()
  for (const s of sessions) {
    for (const e of s.entries) usedIds.add(e.exerciseId)
  }
  const usedExercises = allExercises.filter((e) => usedIds.has(e.id))

  function handleDelete(sessionId: string) {
    const target = sessions.find((s) => s.id === sessionId)
    const confirmed = window.confirm(
      `删掉 ${target?.date ?? ''} 这次训练？\n\n删掉就找不回来了。`,
    )
    if (!confirmed) return

    const next = sessions.filter((s) => s.id !== sessionId)
    const ok = writeSessions(next)
    setSessions(next)
    setStorageError(!ok)
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">历史</h1>
      <p className="mb-4 text-sm text-muted">
        {sessions.length === 0
          ? '还没有记录'
          : `共 ${sessions.length} 次训练`}
      </p>

      {storageError && (
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
          存不进去了，可能是手机存储满了。请先告诉我。
        </div>
      )}

      {/* ---------- 按动作筛选 ---------- */}
      {usedExercises.length > 0 && (
        <select
          value={filterExerciseId}
          onChange={(e) => setFilterExerciseId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
        >
          <option value="">看全部训练</option>
          {usedExercises.map((e) => (
            <option key={e.id} value={e.id}>
              只看练过「{e.name}」的
            </option>
          ))}
        </select>
      )}

      {/* ---------- 记录列表 ---------- */}
      {list.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          allExercises={allExercises}
          expanded={expandedId === session.id}
          onToggle={() =>
            setExpandedId(expandedId === session.id ? null : session.id)
          }
          onDelete={() => handleDelete(session.id)}
        />
      ))}

      {/* ---------- 空状态 ---------- */}
      {sessions.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          还没练过。
          <br />
          去「训练」那一页记一次，结束训练后就会出现在这里。
        </p>
      )}

      {sessions.length > 0 && list.length === 0 && (
        <p className="py-12 text-center text-sm text-muted">
          没有练过这个动作的记录
        </p>
      )}
    </div>
  )
}
