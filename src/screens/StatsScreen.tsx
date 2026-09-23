import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BodyMetric, Exercise, WorkoutSession } from '../types'
import { mergeExercises } from '../data/exercises'
import {
  readBodyMetrics,
  readCustomExercises,
  readSessions,
} from '../lib/storage'
import {
  bodySeries,
  exerciseSeries,
  lastSessionDate,
  lastSessionVolume,
  thisWeekCount,
  thisWeekVolume,
  usedExerciseIds,
  weeklyVolumes,
} from '../lib/stats'
import type { ExercisePoint } from '../lib/stats'
import { formatDateCN } from '../lib/date'
import { ChartCard } from '../components/ChartCard'
import { StatTile } from '../components/StatTile'

// ============================================================
// 统计页
// ============================================================
// 四组内容：
//   1. 顶部两个大数字：本周练了多少、最近一次练了多少
//   2. 柱状图：最近 8 周每周的总容量
//   3. 三张折线图：选定的那个动作，重量 / 容量 / 估算 1RM 的变化
//   4. 身体数据趋势
//
// 【有一条设计原则，改的时候请守住】
// 一张图只画一个指标，绝不在同一张图里放两个纵轴。
// 比如"重量"和"容量"数值差了上百倍，硬画在一起，
// 其中一条会被压成贴着底边的一条直线，什么也看不出来。
// ============================================================

// 图表配色，来自 CLAUDE.md 里定的主色
const BRAND = '#FF4D2E'
const MUTED = '#898781'
const GRID = '#2E2E2E'

// 手指点在图上时弹出来的那个小框的样式。
// 不写这个的话，recharts 默认给一个白底黑框，在深色界面上非常刺眼。
const TOOLTIP = {
  contentStyle: {
    background: '#1E1E1E',
    border: '1px solid #2E2E2E',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: MUTED },
  itemStyle: { color: '#FFFFFF' },
} as const

// 纵轴上的长数字加上千分位逗号：5240 → 5,240
function formatAxis(value: number): string {
  return value.toLocaleString()
}

export function StatsScreen() {
  const [sessions] = useState<WorkoutSession[]>(readSessions)
  const [customExercises] = useState<Exercise[]>(readCustomExercises)
  const [bodyMetrics] = useState<BodyMetric[]>(readBodyMetrics)

  const allExercises = mergeExercises(customExercises)

  // 下拉框里只列"真的练过"的动作。40 个全列出来，选到没练过的会是一张空图。
  const usedIds = usedExerciseIds(sessions)
  const usedExercises = allExercises.filter((e) => usedIds.includes(e.id))

  // 当前选中的动作，默认选第一个练过的
  const [selectedId, setSelectedId] = useState(usedIds[0] ?? '')

  const weeks = weeklyVolumes(sessions, 8)
  const points = selectedId === '' ? [] : exerciseSeries(sessions, selectedId)
  const body = bodySeries(bodyMetrics)

  const selectedName =
    usedExercises.find((e) => e.id === selectedId)?.name ?? ''

  // ---------- 一条记录都没有时，直接给提示，不画一堆空图 ----------
  if (sessions.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">统计</h1>
        <p className="py-12 text-center text-sm text-muted">
          还没有任何数据。
          <br />
          去「训练」那一页记几次，这里就会长出图表来。
        </p>
      </div>
    )
  }

  const hasWeight = body.some((b) => b.weight !== undefined)
  const hasFat = body.some((b) => b.bodyFat !== undefined)
  const hasHeight = body.some((b) => b.height !== undefined)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">统计</h1>

      {/* ---------- 1. 顶部两个大数字 ---------- */}
      <div className="mb-3 flex gap-2">
        <StatTile
          label="本周总容量"
          value={thisWeekVolume(sessions).toLocaleString()}
          hint={`kg · 练了 ${thisWeekCount(sessions)} 次`}
        />
        <StatTile
          label="最近一次"
          value={lastSessionVolume(sessions).toLocaleString()}
          hint={`kg · ${formatDateCN(lastSessionDate(sessions))}`}
        />
      </div>

      {/* ---------- 2. 每周总容量 ---------- */}
      <ChartCard
        title="每周总容量"
        subtitle="最近 8 周，每周练的总量（kg）"
        rows={weeks.map((w) => ({
          周: w.label,
          容量: w.volume.toLocaleString(),
        }))}
        columns={[
          { key: '周', label: '那一周（周一的日期）' },
          { key: '容量', label: '总容量 kg' },
        ]}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={weeks}
            // 【这个 left 不能是负数】留不出空间的话，纵轴上「12,000」这种
            // 五位数的标签会被切掉左边一位，显示成「2,000」——
            // 数字看着没毛病，但整整少了一位，很难发现。
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" stroke={MUTED} fontSize={11} tickLine={false} />
            <YAxis
              stroke={MUTED}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxis}
              width={52}
            />
            <Tooltip
              {...TOOLTIP}
              formatter={(value) => [
                `${Number(value).toLocaleString()} kg`,
                '总容量',
              ]}
              labelFormatter={(label) => `${String(label)} 那一周`}
            />
            <Bar dataKey="volume" fill={BRAND} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ---------- 3. 单个动作的进步 ---------- */}
      <h2 className="mb-2 mt-5 text-sm font-medium text-ink-2">
        单个动作的进步
      </h2>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
      >
        {usedExercises.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          这个动作还没有记录
        </p>
      ) : (
        <>
          <ProgressChart
            points={points}
            dataKey="maxWeight"
            title="最大重量"
            subtitle={`${selectedName} · 每次练到的最重那一下（kg）`}
            unit="kg"
            columnLabel="最大重量"
            color={BRAND}
          />
          <ProgressChart
            points={points}
            dataKey="volume"
            title="总容量"
            subtitle={`${selectedName} · 每次练的总量（kg）`}
            unit="kg"
            columnLabel="总容量"
            color="#4DA3FF"
            startFromZero
          />
          <ProgressChart
            points={points}
            dataKey="best1RM"
            title="估算 1RM"
            subtitle={`${selectedName} · 由当天最好的一组反推的一次极限重量（kg）`}
            unit="kg"
            columnLabel="估算 1RM"
            color="#5FD38A"
          />
        </>
      )}

      {/* ---------- 4. 身体数据 ---------- */}
      {(hasWeight || hasFat || hasHeight) && (
        <>
          <h2 className="mb-2 mt-5 text-sm font-medium text-ink-2">
            身体数据
          </h2>

          {hasWeight && (
            <BodyTrendChart
              body={body}
              dataKey="weight"
              title="体重"
              unit="kg"
            />
          )}
          {hasFat && (
            <BodyTrendChart
              body={body}
              dataKey="bodyFat"
              title="体脂"
              unit="%"
            />
          )}
          {hasHeight && (
            <BodyTrendChart
              body={body}
              dataKey="height"
              title="身高"
              unit="cm"
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// 一张"跟着时间进步"的折线图
// ============================================================
// 三张（重量 / 容量 / 1RM）长得一模一样，只是数据列不同，
// 所以抽成一个组件，不用把同样的配置抄三遍。

function ProgressChart({
  points,
  dataKey,
  title,
  subtitle,
  unit,
  columnLabel,
  color,
  startFromZero = false,
}: {
  points: ExercisePoint[]
  dataKey: 'maxWeight' | 'volume' | 'best1RM'
  title: string
  subtitle: string
  unit: string
  columnLabel: string
  color: string
  // 容量这种"从 0 开始才有意义"的指标要传 true；
  // 重量和 1RM 不传，让纵轴自动缩放，否则 80kg 涨到 85kg 这种进步会被压平看不出来
  startFromZero?: boolean
}) {
  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      rows={points.map((p) => ({
        日期: p.label,
        [columnLabel]: `${p[dataKey].toLocaleString()} ${unit}`,
      }))}
      columns={[
        { key: '日期', label: '日期' },
        { key: columnLabel, label: columnLabel },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxis}
            domain={startFromZero ? [0, 'auto'] : ['auto', 'auto']}
            width={52}
          />
          <Tooltip
            {...TOOLTIP}
            formatter={(value) => [
              `${Number(value).toLocaleString()} ${unit}`,
              columnLabel,
            ]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ============================================================
// 身体数据的一张折线图
// ============================================================

function BodyTrendChart({
  body,
  dataKey,
  title,
  unit,
}: {
  body: { label: string; weight?: number; height?: number; bodyFat?: number }[]
  dataKey: 'weight' | 'height' | 'bodyFat'
  title: string
  unit: string
}) {
  // 只保留"这一项真的记了数"的那些日期。
  // 不过滤的话，没记的日期会是个空洞，折线会断开。
  const points = body
    .filter((b) => b[dataKey] !== undefined)
    .map((b) => ({ label: b.label, value: b[dataKey] as number }))

  return (
    <ChartCard
      title={title}
      subtitle={`每次量的记录（${unit}）`}
      rows={points.map((p) => ({ 日期: p.label, [title]: `${p.value} ${unit}` }))}
      columns={[
        { key: '日期', label: '日期' },
        { key: title, label: title },
      ]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={MUTED}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
            width={52}
          />
          <Tooltip
            {...TOOLTIP}
            formatter={(value) => [`${value} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={BRAND}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
