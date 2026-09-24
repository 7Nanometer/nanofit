import { useState } from 'react'
import type { StrengthMetLevel } from '../types'
import { STRENGTH_MET_INFO, metLabel } from '../lib/kcal'

// ============================================================
// 结束训练时问一句"这次练得有多累"
// ============================================================
//
// 【为什么非问不可，不能全自动】
// 强度是热量的一个大变量：同样练 1 小时，轻重量和大重量的能差一倍
// （MET 3.0 对 6.0）。系统只能从数据里**猜**：你记的 RPE、组间休息多长、
// 练了哪些动作。猜得不算差，但它看不见"你今天是不是状态不好
// 所以减了重量"这种事。
//
// 所以做成：**替你猜一个，但你随时能改**。
//
// 【这个面板顺便代替了原来的"确定要结束吗"弹窗】
// 结束训练本来就要确认一下，多问这一句不增加操作次数。
//
// 【这个组件自己不存数据】
// 和 ExerciseForm、CardioForm 一样，它只负责收集，交出去给训练页存。
//
// ============================================================
// ★ 2026-09-24 重写过，改的原因值得记着（这是出过事的）
// ============================================================
//
// 原来这个面板打开时，默认选中的是**你上次选的那一档**，
// 而不是系统本次推荐的。系统的建议只在按钮上挂一个很小的「建议」标签。
//
// 后果：有人第一次在一个很短的训练上确认了"低强度"，
// 那个选择被记进了 Settings.lastMetLevel，从此**每一场都默认低强度** ——
// 包括 16 组、42 分钟、RPE 8-10 的训练，热量被算了 112 而不是 280。
// 而他完全不知道：面板上那个小标签，是唯一提示"你选的和建议不一样"的东西。
//
// 改了三处：
//   1. **默认永远选中系统本次推荐的那一档**（要沿用上次，得自己点）
//   2. 系统建议从"小标签"升级成**一整块：建议哪档 + 为什么**
//   3. 你选的和建议不一样时，用主色写一句完整的话 —— 不是靠颜色深浅区分
//
// 【为什么理由必须显示出来】
// 用户要能自己判断"系统这条建议合不合理"。只给一个结论，
// 数字不对时他只能来问；给了依据，他自己一眼就能看出是不是错了。
// 依据文字由 lib/kcal.ts 的 recommendMetLevel **连档位一起返回** ——
// 不许在界面这边另写一套判断，两份逻辑一定会走偏。
// ============================================================

type Props = {
  // 系统根据这次训练推荐的那一档。面板打开时默认选中它
  recommended: StrengthMetLevel
  // 为什么推荐它（"你记的 RPE 中位数是 9"这种）。空串表示没有理由可讲
  reason: string
  // 上次"结束训练"时选的那一档。
  // 只用来做一个"沿用上次"的快捷按钮 —— 点了才选中，绝不自作主张。
  lastLevel?: StrengthMetLevel | undefined
  // 这次练了什么，如"共 12 组力量 + 有氧 20 分钟"
  summary: string
  onConfirm: (level: StrengthMetLevel) => void
  onCancel: () => void
}

export function MetPicker({
  recommended,
  reason,
  lastLevel,
  summary,
  onConfirm,
  onCancel,
}: Props) {
  // ★ 初值就是"系统推荐"，不再是"上次选的"
  const [level, setLevel] = useState<StrengthMetLevel>(recommended)

  // 当前选中那一档的说明文字。理论上一定找得到，兜个底免得显示空白。
  const info = STRENGTH_MET_INFO.find((x) => x.key === level)

  // 选的和建议的不一样。要显眼地说出来，不能靠一个标签的颜色深浅。
  const deviated = level !== recommended

  // "沿用上次"按钮：只有"上次"存在、且和本次建议不是同一档时才出现。
  // 两者相同时它没有任何意义（那一档本来就默认选中了）。
  const canReuseLast = lastLevel !== undefined && lastLevel !== recommended

  return (
    // 半透明遮罩 + 居中面板，和"新建动作""记一次有氧"同一套写法
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-full w-full max-w-[440px] overflow-y-auto rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-1 text-lg font-semibold text-ink">
          结束今天的训练？
        </h2>
        <p className="mb-3 text-sm text-muted">
          这次练得有多累？
          {/* 注意：这里是 JSX 不是 markdown，写 **粗体** 会原样显示成星号，
              所以加粗要用 span + CSS 类 */}
          <span className="text-ink-2">这一项只影响热量估算</span>
          ，不影响记录本身。
        </p>

        {/* ---------- 系统建议（整块，不是小标签）---------- */}
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3">
          <div className="text-sm font-medium text-ink">
            系统建议：{metLabel(recommended)}
          </div>
          {reason !== '' && (
            <div className="mt-0.5 text-xs text-ink-2">依据：{reason}</div>
          )}
        </div>

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

        {/* ---------- 选的和建议不一样（★ 这行是这次加的重点）---------- */}
        {deviated && (
          <p className="mb-2 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
            {/* 整句拼成一个字符串再渲染，是为了不让 JSX 在换行处
                自作主张地塞空格或吃掉空格（引号「」里多一个空格很扎眼）。
                强调"你选的"要用 span + CSS —— 这里写 markdown 的星号
                会被原样显示出来，因为这个面板是 JSX 不是 markdown */}
            {`你选的是「${metLabel(level)}」，和系统建议的「${metLabel(recommended)}」不一样。热量会按`}
            <span className="font-semibold">你选的</span>
            这一档算。
          </p>
        )}

        {/* 选中那一档什么意思。这些说法直接来自 Compendium 的档位定义，
            不是随口写的 —— 主人就是靠这句话判断该点哪个。 */}
        {info !== undefined && (
          <p className="mb-3 text-xs text-muted">{info.hint}</p>
        )}

        {/* ---------- 沿用上次（要自己点，不自动选中）---------- */}
        {canReuseLast && (
          <button
            type="button"
            onClick={() => setLevel(lastLevel)}
            className="mb-3 min-h-11 w-full rounded-lg border border-line px-3 text-sm text-ink-2"
          >
            沿用上次：{metLabel(lastLevel)}
          </button>
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
