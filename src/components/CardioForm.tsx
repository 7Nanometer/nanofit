import { useState } from 'react'
import type { Exercise } from '../types'
import { OUTDOOR_RUN_ID, cardioExercises } from '../data/exercises'
import { NumberField } from './NumberField'
import {
  formatDistance,
  formatDuration,
  formatPace,
  paceSecPerKm,
  textToNumber,
  trackDistanceM,
} from '../lib/calc'

// ============================================================
// "记一次有氧"的弹窗
// ============================================================
//
// 【为什么有氧要单独一个表单，不复用力量那套】
// 力量是"选动作 → 记多组"，每组填重量×次数。有氧完全不是这个形状：
// 跑一次就是一条记录，只关心"多久"和"多远"。
// 硬套力量的表单会逼你填重量和次数，那两个数对跑步毫无意义。
//
// 【交互为什么做得这么短】
// 手机上刚跑完，人是喘的、手上可能还有汗。每多一次点击都很难受。
// 所以：常用动作直接摆在最上面一排（点一下就选中），
// 时长是唯一必填项，距离能填就填、不填也能存。
//
// 【这个组件自己不存数据】
// 和 ExerciseForm 一样，它只负责收集，填好了交给训练页去存。
// ============================================================

type Props = {
  allExercises: Exercise[] // 全部动作，用来挑出有氧的那几个
  // 从卡片上的"再记一次"进来时，替用户把动作选好
  initialExerciseId?: string
  onSave: (
    exerciseId: string,
    durationSec: number,
    distanceM: number | undefined,
  ) => void
  onCancel: () => void
}

export function CardioForm({
  allExercises,
  initialExerciseId,
  onSave,
  onCancel,
}: Props) {
  // 可选的有氧动作。顺序 = 数据文件里的顺序，最常用的排最前。
  const options = cardioExercises(allExercises)

  const [exerciseId, setExerciseId] = useState(
    initialExerciseId ?? options[0]?.id ?? '',
  )
  const [minutesText, setMinutesText] = useState('')
  const [distanceText, setDistanceText] = useState('')

  // ---------- 操场模式 ----------
  // 默认关着。只有"户外跑"才显示这个开关（室内机器自己会显示距离）。
  const [trackMode, setTrackMode] = useState(false)
  const [laneText, setLaneText] = useState('1') // 第几道
  const [lapsText, setLapsText] = useState('') // 跑了几圈，允许 12.5
  const [lapBaseText, setLapBaseText] = useState('400') // 第 1 道一圈多少米

  const isOutdoorRun = exerciseId === OUTDOOR_RUN_ID

  // ---------- 把界面上的文字换成数字 ----------
  // textToNumber 的规矩：空字符串 → null（没填）、'0' → 0（真的零）。
  // 所以判断"填没填"要用 !== null，不能写 > 0，否则填 0 会被当成没填。
  const minutes = textToNumber(minutesText)
  const distanceKm = textToNumber(distanceText)

  const lane = textToNumber(laneText) ?? 1
  const laps = textToNumber(lapsText)
  const lapBase = textToNumber(lapBaseText) ?? 400

  // ---------- 算出最终要存的时长和距离 ----------
  // 分钟 → 秒。不足一秒的零头四舍五入掉（"30.5 分钟" → 1830 秒）
  const durationSec =
    minutes !== null && minutes > 0 ? Math.round(minutes * 60) : null

  // 距离有两个来源：直接填的公里数，或者操场模式按道次和圈数算出来的。
  // 两个来源只有一个生效 —— 操场模式开着就以算出来的为准。
  let distanceM: number | undefined
  if (isOutdoorRun && trackMode) {
    if (laps !== null && laps > 0 && lapBase > 0 && lane > 0) {
      distanceM = Math.round(trackDistanceM(lane, laps, lapBase))
    }
  } else if (distanceKm !== null && distanceKm > 0) {
    distanceM = Math.round(distanceKm * 1000)
  }

  // 时长是唯一的必填项：跑了多久总知道，跑了多远不一定知道
  const canSave = durationSec !== null

  // 配速能算就算，算不出来（没填距离）就整行不显示 ——
  // 绝不显示一个 0，那会让人以为你一秒跑完一公里
  const pace =
    durationSec !== null && distanceM !== undefined
      ? paceSecPerKm(durationSec, distanceM)
      : null

  function handleSave() {
    if (durationSec === null) return
    onSave(exerciseId, durationSec, distanceM)
  }

  return (
    // 半透明遮罩 + 居中的面板，和"新建动作"那个弹窗同一套写法
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center">
          <h2 className="flex-1 text-lg font-semibold text-ink">记一次有氧</h2>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 min-w-11 text-muted"
          >
            ✕
          </button>
        </div>

        {/* ---------- 练的什么（点一下就选中） ---------- */}
        <label className="mb-1 block text-sm text-ink-2">练的什么？</label>
        {/* overflow-x-auto = 一排放不下时可以左右滑，不会挤成两行占地方 */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {options.map((item) => {
            const active = item.id === exerciseId
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setExerciseId(item.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm ${
                  active
                    ? 'border-brand bg-brand font-semibold text-on-brand'
                    : 'border-line text-ink-2'
                }`}
              >
                {item.name}
              </button>
            )
          })}
        </div>

        {/* ---------- 时长 / 距离 ---------- */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <div className="mb-1 text-xs text-muted">时长 分钟（必填）</div>
            <NumberField
              value={minutesText}
              onChange={setMinutesText}
              placeholder="30"
            />
          </div>

          {/* 操场模式下距离是算出来的，就不用再手填了 —— 填两个反而会打架 */}
          {!(isOutdoorRun && trackMode) && (
            <div className="flex-1">
              <div className="mb-1 text-xs text-muted">距离 公里（可不填）</div>
              <NumberField
                value={distanceText}
                onChange={setDistanceText}
                placeholder="5"
              />
            </div>
          )}
        </div>

        {/* ---------- 操场模式（只有户外跑用得上） ---------- */}
        {isOutdoorRun && (
          <div className="mb-4 rounded-lg border border-line p-3">
            <label className="flex min-h-11 items-center gap-2 text-sm text-ink-2">
              <input
                type="checkbox"
                checked={trackMode}
                onChange={(e) => setTrackMode(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
              操场模式（按道次和圈数算距离）
            </label>

            {trackMode && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <div className="flex-[2]">
                    <div className="mb-1 text-xs text-muted">第几道</div>
                    <select
                      value={laneText}
                      onChange={(e) => setLaneText(e.target.value)}
                      className="min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-ink outline-none focus:border-brand"
                    >
                      {/* 标准田径场最多 8 道 */}
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-[3]">
                    <div className="mb-1 text-xs text-muted">单圈 米</div>
                    <NumberField
                      value={lapBaseText}
                      onChange={setLapBaseText}
                      placeholder="400"
                    />
                  </div>
                  <div className="flex-[3]">
                    <div className="mb-1 text-xs text-muted">跑了 圈</div>
                    <NumberField
                      value={lapsText}
                      onChange={setLapsText}
                      placeholder="12.5"
                    />
                  </div>
                </div>

                {/* 算出来的结果立刻显示，省得人心里没底 */}
                <p className="mt-2 text-sm text-ink-2">
                  {distanceM !== undefined
                    ? `= ${formatDistance(distanceM)}`
                    : '填上圈数就能算出距离'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ---------- 结果预览 ---------- */}
        {durationSec !== null && (
          <div className="mb-4 rounded-lg border border-line bg-bg p-3 text-sm text-ink-2">
            {formatDuration(durationSec)}
            {distanceM !== undefined && ` · ${formatDistance(distanceM)}`}
            {pace !== null && ` · 配速 ${formatPace(pace)}/公里`}
          </div>
        )}

        {/* ---------- 底部两个按钮 ---------- */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-lg border border-line text-ink-2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-on-brand disabled:opacity-40"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
