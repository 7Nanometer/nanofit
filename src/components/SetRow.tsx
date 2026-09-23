import type { ReactNode } from 'react'
import { NumberField } from './NumberField'

// ============================================================
// 记一组的那一行：重量 / 次数 / RPE / ✓
// ============================================================
//
// 【布局上的一个讲究】
// ✓ 按钮必须紧挨着输入框，不能放到屏幕底部去。
// 因为 iPhone 的数字键盘没有"完成"键，弹起来之后收不回去，
// 会一直挡着屏幕下半部分。
// 把 ✓ 放在键盘上方够得着的位置，才能做到"记一组到下一组不超过 5 秒"。
// ============================================================

type Props = {
  weightText: string
  repsText: string
  rpeText: string
  showRpe: boolean // 设置里关掉 RPE 时，这一栏整个不显示
  onWeightChange: (v: string) => void
  onRepsChange: (v: string) => void
  onRpeChange: (v: string) => void
  onConfirm: () => void
  canConfirm: boolean
}

export function SetRow({
  weightText,
  repsText,
  rpeText,
  showRpe,
  onWeightChange,
  onRepsChange,
  onRpeChange,
  onConfirm,
  canConfirm,
}: Props) {
  return (
    // items-end 让所有东西底部对齐（因为输入框上面有标签，高度不一样）
    <div className="flex items-end gap-2">
      <Field label="kg" flex="flex-[3]">
        <NumberField
          value={weightText}
          onChange={onWeightChange}
          placeholder="80"
        />
      </Field>

      <Field label="次" flex="flex-[2]">
        <NumberField value={repsText} onChange={onRepsChange} placeholder="8" />
      </Field>

      {showRpe && (
        <Field label="RPE" flex="flex-[2]">
          <NumberField value={rpeText} onChange={onRpeChange} placeholder="—" />
        </Field>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        // min-h-11 min-w-11 = 44×44 像素，手指点得准的最小尺寸
        className="min-h-11 min-w-11 shrink-0 rounded-lg bg-brand text-xl font-bold text-bg disabled:opacity-30"
      >
        ✓
      </button>
    </div>
  )
}

// 输入框上面那行小标签。抽出来是为了不用把同样的结构写 3 遍。
function Field({
  label,
  flex,
  children,
}: {
  label: string
  flex: string
  children: ReactNode
}) {
  return (
    <div className={flex}>
      <div className="mb-1 text-center text-xs text-muted">{label}</div>
      {children}
    </div>
  )
}
