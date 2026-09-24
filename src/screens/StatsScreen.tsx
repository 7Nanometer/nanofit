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
import { cardioIdSet, mergeExercises } from '../data/exercises'
import {
  readBodyMetrics,
  readCustomExercises,
  readSessions,
} from '../lib/storage'
import {
  bodySeries,
  cardioDistanceSeries,
  exerciseSeries,
  lastSessionDate,
  lastSessionVolume,
  niceAxis,
  splitSessions,
  thisWeekCardioSec,
  thisWeekCount,
  thisWeekVolume,
  usedExerciseIds,
  weeklyVolumes,
} from '../lib/stats'
import { formatDateCN } from '../lib/date'
import { formatDuration } from '../lib/calc'
import { ChartCard } from '../components/ChartCard'
import { StatTile } from '../components/StatTile'
import { chartColors } from '../lib/theme'

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

// ============================================================
// 图表配色
// ============================================================
// 【为什么图表这里不能像别的页面那样直接写 bg-brand 这种类名】
// recharts 画的是 SVG 图，它要的是**实实在在的颜色值**（#ff4d2e 这种），
// 不认"背景用主色"这种类名。所以颜色必须在这里以值的形式交给它。
//
// 【那怎么让它跟着日间/夜间变】
// chartColors() 现问浏览器："现在 --color-brand 是多少？"
// 问到的永远是当前主题的那套值 —— 颜色的定义仍然只有 src/index.css 一处，
// 这里不会跟它写重复，也就不会写岔。
//
// 外面套一层 useState(chartColors) 是有意为之：
// 读页面样式算"副作用"，包成 useState 的惰性初始化，
// 就能保证每次进入统计页只读一次、读完存住，而不是每次重画都去问一遍。
//
// 【★以后加新图表，颜色都从这里拿，不要写死十六进制】
// 写死的后果：切到日间模式时那条线还是深色模式的颜色，白底上几乎看不见。
// ============================================================

// 纵轴上的长数字加上千分位逗号：5240 → 5,240
function formatAxis(value: number): string {
  return value.toLocaleString()
}

// 手指点在图上时弹出来的那个小框的样式。
// 不写这个的话，recharts 默认给一个白底黑框，在深色界面上非常刺眼。
function tooltipStyle(C: ReturnType<typeof chartColors>) {
  return {
    contentStyle: {
      background: C.surface,
      border: `1px solid ${C.line}`,
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: C.muted },
    itemStyle: { color: C.ink },
  }
}

export function StatsScreen() {
  const [sessions] = useState<WorkoutSession[]>(readSessions)
  const [customExercises] = useState<Exercise[]>(readCustomExercises)
  const [bodyMetrics] = useState<BodyMetric[]>(readBodyMetrics)
  // 当前主题下的图表配色，下面 C.brand 这种写法都来自它
  const [C] = useState(chartColors)

  const allExercises = mergeExercises(customExercises)

  // ---------- 力量和有氧分成两条线 ----------
  //
  // 【为什么必须分】
  // 有氧记录的 weightKg 和 reps 都是 0（见 types.ts 的说明）。混进力量统计
  // 的话，周容量会被拉平、单动作曲线会冒出一串贴在 0 上的点。
  //
  // 【分完之后的规矩】
  //   下面凡是"容量 / 最大重量 / 1RM"的图，一律只吃 lifting 那一份。
  //   有氧的数据在最下面单独有一块。
  const cardioIds = cardioIdSet(allExercises)
  const { lifting, cardio } = splitSessions(sessions, cardioIds)

  // 下拉框里只列"真的练过"的动作。全列出来会很长，而且选到没练过的是一张空图。
  //
  // ★ 有氧动作也要排除：它们的重量永远是 0，选进去就是一条贴着底的直线。
  //   有氧的数据在最下面单独看。
  const usedIds = usedExerciseIds(lifting)
  const usedExercises = allExercises.filter(
    (e) => usedIds.includes(e.id) && !cardioIds.has(e.id),
  )

  // 当前选中的动作，默认选第一个练过的。
  // 注意不能写成 usedIds[0] —— 那个可能是个有氧动作，下拉框里根本没有它，
  // 选中的会是一个不存在的选项，界面上显示成空白。
  const [selectedId, setSelectedId] = useState(usedExercises[0]?.id ?? '')

  const weeks = weeklyVolumes(lifting, 8)
  const points = selectedId === '' ? [] : exerciseSeries(lifting, selectedId)
  const body = bodySeries(bodyMetrics)

  // 有氧那两块（只统计有氧记录，一条力量都不掺）
  const cardioSec = thisWeekCardioSec(cardio)
  const cardioPoints = cardioDistanceSeries(cardio)

  // 柱状图的纵轴刻度。第二个参数 true = 一定要含 0 ——
  // 柱状图里"柱子的高度"直接表示大小，不從 0 起的话比例是骗人的。
  const weeksAxis = niceAxis(
    weeks.map((w) => w.volume),
    true,
  )

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

      {/* ---------- 1. 顶部两个大数字 ----------
          两个都用 lifting（只含力量的那一份），所以数字里一点有氧都不掺。

          "练了 N 次"数的是**全部**训练，包括只跑了步没撸铁的那些天 ——
          跑了步也算练了一次，不该被漏掉。 */}
      <div className="mb-3 flex gap-2">
        <StatTile
          label="本周总容量"
          value={thisWeekVolume(lifting).toLocaleString()}
          hint={`kg · 练了 ${thisWeekCount(sessions)} 次`}
        />
        <StatTile
          label="最近一次"
          value={lastSessionVolume(lifting).toLocaleString()}
          hint={
            lifting.length > 0
              ? `kg · ${formatDateCN(lastSessionDate(lifting))}`
              : 'kg · 还没有力量记录'
          }
        />
      </div>

      {/* ---------- 2. 每周总容量 ----------
          一条力量记录都没有时不画：8 根高度为 0 的柱子配上一条
          从 -1 到 1 的刻度，看着就像 App 坏了，不如什么都不显示。 */}
      {lifting.length > 0 && (
        <ChartCard
          title="每周总容量"
          subtitle="最近 8 周，每周练的总量（kg）。只算力量训练，有氧不算进来。"
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.line}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke={C.muted}
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke={C.muted}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatAxis}
                domain={weeksAxis.domain}
                ticks={weeksAxis.ticks}
                width={52}
              />
              <Tooltip
                {...tooltipStyle(C)}
                formatter={(value) => [
                  `${Number(value).toLocaleString()} kg`,
                  '总容量',
                ]}
                labelFormatter={(label) => `${String(label)} 那一周`}
              />
              <Bar dataKey="volume" fill={C.brand} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ---------- 3. 单个动作的进步 ----------
          一个力量动作都没练过（比如刚装了 App 只跑过步）时，整块不显示 ——
          显示一个没有选项的下拉框只会让人以为坏了。 */}
      {usedExercises.length > 0 && (
        <>
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
                color={C.brand}
              />
              <ProgressChart
                points={points}
                dataKey="volume"
                title="总容量"
                subtitle={`${selectedName} · 每次练的总量（kg）`}
                unit="kg"
                columnLabel="总容量"
                color={C.chart2}
                startFromZero
              />
              <ProgressChart
                points={points}
                dataKey="best1RM"
                title="估算 1RM"
                subtitle={`${selectedName} · 由当天最好的一组反推的一次极限重量（kg）`}
                unit="kg"
                columnLabel="估算 1RM"
                color={C.chart3}
              />
            </>
          )}
        </>
      )}

      {/* ---------- 4. 有氧 ----------
          只有记过有氧才显示这一块。

          【为什么单独一节，不并进上面的图】
          单位不一样：力量那边是 kg，这边是分钟和公里。硬画在一张图上，
          数值差着好几个数量级，会互相压平（这也是这个项目"一张图只画
          一个指标"的由来）。 */}
      {(cardioSec > 0 || cardioPoints.length > 0) && (
        <>
          <h2 className="mb-2 mt-5 text-sm font-medium text-ink-2">有氧</h2>

          <div className="mb-3 flex gap-2">
            <StatTile
              label="本周有氧"
              value={formatDuration(cardioSec)}
              hint="总时长"
            />
          </div>

          {cardioPoints.length > 0 && (
            <ProgressChart
              points={cardioPoints}
              dataKey="km"
              title="单次距离"
              subtitle="每次有氧的距离（公里）。没填距离的那些次不会画上来。"
              unit="公里"
              columnLabel="距离"
              color={C.chart2}
              startFromZero
            />
          )}
        </>
      )}

      {/* ---------- 5. 身体数据 ---------- */}
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

function ProgressChart<T extends { label: string }>({
  points,
  dataKey,
  title,
  subtitle,
  unit,
  columnLabel,
  color,
  startFromZero = false,
}: {
  points: T[]
  // 泛型 T 表示"这一张图画的是哪种数据"。dataKey 必须是 T 里面真的有的字段名，
  // 写错一个字母编译就会报错 —— 比运行时画出一张空图强。
  //
  // 【为什么不用原来写死的 'maxWeight' | 'volume' | 'best1RM'】
  // 加了有氧之后，这张图还要画"单次距离"（字段名是 km），
  // 写死的联合类型装不下它。改成泛型，力量的三个调用点一个字都不用改。
  dataKey: Extract<keyof T, string>
  title: string
  subtitle: string
  unit: string
  columnLabel: string
  color: string
  // 容量这种"从 0 开始才有意义"的指标要传 true；
  // 重量和 1RM 不传，让纵轴自动缩放，否则 80kg 涨到 85kg 这种进步会被压平看不出来
  startFromZero?: boolean
}) {
  const [C] = useState(chartColors)
  // 纵轴刻度：容量那种"从 0 起才有意义"的传 startFromZero=true，
  // 重量和 1RM 不传，让轴贴着数据走（80 涨到 85 这种进步才看得出来）
  //
  // Number(...) 是把值转成数字再交给刻度算法。泛型 T 的字段类型
  // TypeScript 推不出来一定是数字，而这里的字段确实都是数字，转一下最省事。
  const axis = niceAxis(
    points.map((p) => Number(p[dataKey])),
    startFromZero,
  )

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      rows={points.map((p) => ({
        日期: p.label,
        [columnLabel]: `${Number(p[dataKey]).toLocaleString()} ${unit}`,
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
          <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={C.muted}
            fontSize={11}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={C.muted}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxis}
            domain={axis.domain}
            ticks={axis.ticks}
            width={52}
          />
          <Tooltip
            {...tooltipStyle(C)}
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
  const [C] = useState(chartColors)

  // 只保留"这一项真的记了数"的那些日期。
  // 不过滤的话，没记的日期会是个空洞，折线会断开。
  const points = body
    .filter((b) => b[dataKey] !== undefined)
    .map((b) => ({ label: b.label, value: b[dataKey] as number }))

  // 纵轴刻度。体重、体脂、身高都不含 0 —— 从 0 起的话，
  // 72 到 75 公斤这条线会被压成贴着顶边的一条直线，变化全看不出来。
  const axis = niceAxis(points.map((p) => p.value))

  return (
    <ChartCard
      title={title}
      // 体脂这一张要额外说明一句：线上的点未必都是称出来的。
      // 没手填的那些天，App 按公式估算了一个，不写清楚用户会误会。
      subtitle={
        dataKey === 'bodyFat'
          ? `%（没手填体脂的那些天，按身高体重估算）`
          : `每次量的记录（${unit}）`
      }
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
          <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={C.muted}
            fontSize={11}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={C.muted}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={axis.domain}
            ticks={axis.ticks}
            width={52}
          />
          <Tooltip
            {...tooltipStyle(C)}
            formatter={(value) => [`${value} ${unit}`, title]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={C.brand}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
