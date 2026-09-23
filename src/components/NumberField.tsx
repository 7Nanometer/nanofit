// ============================================================
// 数字输入框
// ============================================================
//
// 【为什么不用现成的 <input type="number">】
// 它在手机上有三个毛病，而且只在真机上出现，电脑上看不出来：
//   1. iPhone 上弹不出正确的数字键盘
//   2. 部分输入法下小数点会变成逗号，数字就读不出来了
//   3. 会冒出上下两个小箭头，手机上一戳就串
//
// 所以改用 <input type="text" inputMode="decimal">：
//   type="text"         —— 就是个普通文本输入框，没有上面那些毛病
//   inputMode="decimal" —— 但告诉手机"请弹数字键盘"（带小数点那种）
//
// 【为什么传进来、传出去的都是文字，不是数字】
// 用户打字过程中会出现 "1." 这种还不完整的中间状态。
// 如果内部直接存成数字，"1." 会被当场吃掉小数点，用户就永远打不出 1.5。
// 所以这里一律按文字处理，真正需要数字时用 calc.ts 里的 textToNumber() 转换。
// ============================================================

type Props = {
  value: string
  onChange: (text: string) => void
  placeholder?: string
  className?: string
}

export function NumberField({
  value,
  onChange,
  placeholder,
  className = '',
}: Props) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        const next = e.target.value
        // 只允许"数字 + 最多一个小数点"。
        // 这个正则读法：一串数字，可以跟一个小数点，再跟一串数字。
        if (!/^\d*\.?\d*$/.test(next)) return
        onChange(next)
      }}
      placeholder={placeholder}
      // text-center 让数字居中，看着整齐
      className={`w-full rounded-lg border border-line bg-bg px-2 py-2.5 text-center text-ink outline-none focus:border-brand ${className}`}
    />
  )
}
