import { useState } from 'react'
import type { StrengthMetLevel } from '../types'
import { STRENGTH_MET_INFO } from '../lib/kcal'

// ============================================================
// 结束训练时问一句"这次练得有多累"
// ============================================================
//
// 【为什么非问不可，不能全自动】
// 强度是热量的一个大变量：同样练 1 小时，轻重量和大重量能差一倍
// （MET 3.0 对 6.0）。系统只能从数据里**猜**：组间休息多长、
// 练了哪些动作。猜得不算差，但它看不见"你今天是不是状态不好
// 所以减了重量"这种事。
//
// 所以做成：**替你猜一个，但你随时能改**。改一次之后记住，
// 下次默认还用它（存在 Settings.lastMetLevel 里）。
//
// 【这个面板顺便代替了原来的"确定要结束吗"弹窗】
// 结束训练本来就要确认一下，多问这一句不增加操作次数。
//
// 【这个组件自己不存数据】
// 和 ExerciseForm、CardioForm 一样，它只负责收集，交出去给训练页存。
// ============================================================

type Props = {
  // 根据训练数据推出来的那一档，界面上会标个"建议"
  recommended: StrengthMetLevel
  // 打开时默认选中的那一档
  // （第一次用 = recommended；之后 = 你上次选的）
  defaultLevel: StrengthMetLevel
  // 这次练了什么，如"共 12 组力量 + 有氧 20 分钟"
  summary: string
  onConfirm: (level: StrengthMetLevel) => void
  onCancel: () => void
}

export function MetPicker({
  recommended,
  defaultLevel,
  summary,
  onConfirm,
  onCancel,
}: Props) {
  const [level, setLevel] = useState<StrengthMetLevel>(defaultLevel)
  // 当前选中那一档的说明文字。理论上一定找得到，兜个底免得显示空白。
  const info = STRENGTH_MET_INFO.find((x) => x.key === level)

  return (
    // 半透明遮罩 + 居中面板，和"新建动作""记一次有氧"同一套写法
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-lg font-semibold text-ink">
          结束今天的训练？
        </h2>
        <p className="mb-4 text-sm text-muted">
          这次练得有多累？
          {/* 注意：这里是 JSX 不是 markdown，写 **粗体** 会原样显示成星号，
              所以加粗要用 span + CSS 类 */}
          <span className="text-ink-2">这一项只影响热量估算</span>
          ，不影响记录本身。
        </p>

        {/* ---------- 四档 ---------- */}
        <div className="mb-2 flex flex-wrap gap-2">
          {STRENGTH_MET_INFO.map((item) => {
            const active = item.key === level
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setLevel(item.key)}
                // min-h-11 = 44 像素，手指点得准的最小尺寸
                className={`min-h-11 rounded-lg border px-3 text-sm ${
                  active
                    ? 'border-brand bg-brand font-semibold text-on-brand'
                    : 'border-line text-ink-2'
                }`}
              >
                {item.label}
                <span className={active ? 'opacity-80' : 'text-muted'}>
                  {' '}
                  {item.met.toFixed(1)}
                </span>
                {/* 系统推的那一档标一下。选中时整块是橙红的，
                    所以那个小字的颜色要跟着变，不然看不见 */}
                {item.key === recommended && (
                  <span className={`ml-1 text-xs ${active ? '' : 'text-brand'}`}>
                    建议
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 选中那一档什么意思。这些说法直接来自 Compendium 的档位定义，
            不是随口写的 —— 主人就是靠这句话判断该点哪个。 */}
        {info !== undefined && (
          <p className="mb-4 text-xs text-muted">{info.hint}</p>
        )}

        {/* ---------- 这次练了什么 ---------- */}
        <div className="mb-4 rounded-lg border border-line bg-bg p-3 text-sm text-ink-2">
          {summary}
        </div>

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
            onClick={() => onConfirm(level)}
            className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-on-brand"
          >
            结束训练
          </button>
        </div>
      </div>
    </div>
  )
}
