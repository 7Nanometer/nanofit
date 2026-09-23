import { useState } from 'react'
import { LibraryScreen } from './LibraryScreen'

// ============================================================
// "设置"页 —— 按你的决定，这里当工具箱用
// ============================================================
// 动作库、训练模板、身体数据、备份，都从这里点第二下进去。
// 训练 tab 只负责记训练，保持干净。
//
// 【现在只有"动作库"是通的】
// 其他几项先显示成灰色并标上阶段号，让你一眼看到全貌和进度。
// ============================================================

// 记住当前显示的是"设置列表"还是某个子页面。
// 这是"不装路由"方案的核心：用一个变量代替网址栏。
type Sub = 'list' | 'library'

export function SettingsScreen() {
  const [sub, setSub] = useState<Sub>('list')

  // 如果当前在动作库里，就整个换成动作库页面。
  // 点"返回"时把它设回 'list'，就回到设置列表了。
  if (sub === 'library') {
    return <LibraryScreen onBack={() => setSub('list')} />
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">设置</h1>

      <div className="space-y-2">
        <SettingRow
          label="动作库"
          hint="40 个预置动作 + 自建"
          onClick={() => setSub('library')}
        />
        <SettingRow label="训练模板" hint="推日 / 拉日 / 腿日" locked="阶段 4" />
        <SettingRow
          label="身体数据"
          hint="身高、体重、体脂"
          locked="阶段 4"
        />
        <SettingRow
          label="休息计时器"
          hint="默认 90 秒，可调"
          locked="阶段 3"
        />
        <SettingRow
          label="导出 / 导入备份"
          hint="导出成文件保存起来"
          locked="阶段 6"
        />
      </div>
    </div>
  )
}

// 设置列表里的一行。
// 单独写成一个小零件，是为了 5 行不用把同样的样式抄 5 遍。
function SettingRow({
  label,
  hint,
  onClick,
  locked,
}: {
  label: string
  hint: string
  onClick?: () => void
  locked?: string // 填了阶段号表示"还没做"，这一行会变灰、点不动
}) {
  const disabled = locked !== undefined

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <div className="flex-1">
        <div className="font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-sm text-muted">{hint}</div>
      </div>
      {disabled ? (
        <span className="shrink-0 text-xs text-muted">{locked}</span>
      ) : (
        <span className="shrink-0 text-lg text-muted">›</span>
      )}
    </button>
  )
}
