import { useState } from 'react'
import type { BodyMetric } from '../types'
import {
  readBodyMetrics,
  upsertBodyMetric,
  writeBodyMetrics,
} from '../lib/storage'
import { formatDateCN, todayKey } from '../lib/date'
import { textToNumber } from '../lib/calc'
import { NumberField } from '../components/NumberField'

// ============================================================
// 身体数据页（在"设置"里面）
// ============================================================
// 记录身高、体重、体脂。一天只留一条 —— 同一天再记一次是覆盖，不是新增。
//
// 趋势图在阶段 5 做，这一页只管"记下来"和"看列表"。
// ============================================================

export function BodyScreen({ onBack }: { onBack: () => void }) {
  const [metrics, setMetrics] = useState<BodyMetric[]>(readBodyMetrics)
  const [dateText, setDateText] = useState(todayKey)
  const [weightText, setWeightText] = useState('')
  const [fatText, setFatText] = useState('')
  const [storageError, setStorageError] = useState(false)

  // 身高预填成"上一次记的那个"。
  // 因为身高成年后基本不变，每次都要重新输一遍太烦。
  const [heightText, setHeightText] = useState(() => {
    const latest = latestOne(readBodyMetrics())
    return latest?.heightCm !== undefined ? String(latest.heightCm) : ''
  })

  const sorted = [...metrics].sort((a, b) => b.date.localeCompare(a.date))

  const weight = textToNumber(weightText)
  const height = textToNumber(heightText)
  const fat = textToNumber(fatText)
  // 三个都没填就不让存，免得记下一堆空记录
  const canSave = weight !== null || height !== null || fat !== null

  function handleSave() {
    if (!canSave) return

    const ok = upsertBodyMetric({
      date: dateText,
      weightKg: weight ?? undefined,
      heightCm: height ?? undefined,
      bodyFat: fat ?? undefined,
    })

    setMetrics(readBodyMetrics())
    setStorageError(!ok)
    // 清空体重和体脂（下次量的数字肯定不一样），保留身高（基本不变）
    setWeightText('')
    setFatText('')
  }

  function handleDelete(date: string) {
    if (!window.confirm(`删掉 ${formatDateCN(date)} 这条记录？`)) return
    const next = metrics.filter((m) => m.date !== date)
    const ok = writeBodyMetrics(next)
    setMetrics(next)
    setStorageError(!ok)
  }

  return (
    <div>
      {/* ---------- 顶部 ---------- */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink-2"
        >
          ‹ 返回
        </button>
        <h1 className="flex-1 text-lg font-semibold">身体数据</h1>
      </div>

      {storageError && (
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
          存不进去了，可能是手机存储满了。请先告诉我。
        </div>
      )}

      {/* ---------- 录入 ---------- */}
      <div className="mb-5 rounded-xl border border-line bg-surface p-3">
        <label className="mb-1 block text-sm text-ink-2">量的是哪一天</label>
        <input
          type="date"
          value={dateText}
          onChange={(e) => setDateText(e.target.value)}
          className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-ink outline-none focus:border-brand"
        />

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted">身高 cm</div>
            <NumberField
              value={heightText}
              onChange={setHeightText}
              placeholder="175"
            />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted">体重 kg</div>
            <NumberField
              value={weightText}
              onChange={setWeightText}
              placeholder="70.5"
            />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted">体脂 %</div>
            <NumberField
              value={fatText}
              onChange={setFatText}
              placeholder="18"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="min-h-11 w-full rounded-lg bg-brand font-semibold text-bg disabled:opacity-40"
        >
          保存
        </button>

        <p className="mt-2 text-xs text-muted">
          三个格子填哪个都行，不用全填。同一天再存一次会覆盖上一条。
        </p>
      </div>

      {/* ---------- 历史列表 ---------- */}
      <h2 className="mb-2 text-sm font-medium text-ink-2">
        记录（{sorted.length} 条）
      </h2>

      {sorted.map((m) => (
        <div
          key={m.date}
          className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
        >
          <div className="flex-1">
            <div className="text-sm text-ink">{formatDateCN(m.date)}</div>
            <div className="mt-0.5 text-sm text-muted">
              {describe(m)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(m.date)}
            className="shrink-0 px-2 py-1 text-xs text-muted"
          >
            删除
          </button>
        </div>
      ))}

      {sorted.length === 0 && (
        <p className="py-10 text-center text-sm text-muted">
          还没记过。上面填一个数，点保存就开始了。
        </p>
      )}
    </div>
  )
}

// 把一条记录写成"70.5 kg · 175 cm · 18%"这样
function describe(m: BodyMetric): string {
  const parts: string[] = []
  if (m.weightKg !== undefined) parts.push(`${m.weightKg} kg`)
  if (m.heightCm !== undefined) parts.push(`${m.heightCm} cm`)
  if (m.bodyFat !== undefined) parts.push(`${m.bodyFat}%`)
  return parts.length > 0 ? parts.join(' · ') : '（空）'
}

// 找出日期最靠后的那一条
function latestOne(list: BodyMetric[]): BodyMetric | undefined {
  return [...list].sort((a, b) => b.date.localeCompare(a.date))[0]
}
