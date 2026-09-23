import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Settings } from '../types'
import { downloadBackup, importBackup } from '../lib/json'
import { readSettings, writeSettings } from '../lib/storage'
import { BodyScreen } from './BodyScreen'
import { LibraryScreen } from './LibraryScreen'
import { TemplateScreen } from './TemplateScreen'

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
type Sub = 'list' | 'library' | 'templates' | 'body'

export function SettingsScreen() {
  const [sub, setSub] = useState<Sub>('list')
  const [settings, setSettings] = useState<Settings>(readSettings)
  const [restPickerOpen, setRestPickerOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)

  // 改设置的统一出口。先写储物柜，再看写成功没有，
  // 失败就亮红字警告 —— 和动作库、训练页用的是同一套处理方式。
  function saveSettings(next: Settings) {
    const ok = writeSettings(next)
    setSettings(next)
    setStorageError(!ok)
  }

  // ---------- 导出 / 导入备份 ----------
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState('')
  const [importOk, setImportOk] = useState(false)

  function handleExport() {
    downloadBackup()
    setImportOk(true)
    setImportMessage(
      '已导出。手机上在「文件」App 里，电脑上在「下载」文件夹里。建议顺手发一份到微信收藏。',
    )
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // 把选择框清空，这样同一个文件连续选两次也能触发
    e.target.value = ''
    if (file === undefined) return

    const confirmed = window.confirm(
      '导入会用备份文件里的数据，覆盖现在手机里的全部记录。\n\n确定要恢复吗？',
    )
    if (!confirmed) return

    const result = await importBackup(file)

    if (result.ok) {
      setImportOk(true)
      setImportMessage(`导入成功：${result.summary}页面稍后会自动刷新。`)
      // 各个页面都是"打开的时候才去读数据"的，
      // 导入完必须刷新一次才能看到新数据
      window.setTimeout(() => window.location.reload(), 1800)
    } else {
      setImportOk(false)
      setImportMessage(result.message)
    }
  }

  // 如果当前在动作库里，就整个换成动作库页面。
  // 点"返回"时把它设回 'list'，就回到设置列表了。
  if (sub === 'library') {
    return <LibraryScreen onBack={() => setSub('list')} />
  }
  if (sub === 'templates') {
    return <TemplateScreen onBack={() => setSub('list')} />
  }
  if (sub === 'body') {
    return <BodyScreen onBack={() => setSub('list')} />
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">设置</h1>

      {storageError && (
        <div className="mb-3 rounded-lg border border-brand bg-brand/10 p-3 text-sm text-brand">
          设置存不进去了，可能是手机存储满了。
        </div>
      )}

      <div className="space-y-2">
        <SettingRow
          label="动作库"
          hint="40 个预置动作 + 自建"
          onClick={() => setSub('library')}
        />
        {/* 休息计时器：点一下展开秒数选项 */}
        <SettingRow
          label="休息计时器"
          hint={`组间休息 ${settings.restSec} 秒`}
          onClick={() => setRestPickerOpen(!restPickerOpen)}
        />
        {restPickerOpen && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-3">
            {[30, 45, 60, 90, 120, 150, 180].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  saveSettings({ ...settings, restSec: sec })
                  setRestPickerOpen(false)
                }}
                className={`min-h-11 rounded-lg border px-3 text-sm ${
                  settings.restSec === sec
                    ? 'border-brand bg-brand font-semibold text-bg'
                    : 'border-line text-ink-2'
                }`}
              >
                {sec} 秒
              </button>
            ))}
          </div>
        )}

        {/* 记录 RPE 的开关 */}
        <button
          type="button"
          onClick={() =>
            saveSettings({ ...settings, rpeEnabled: !settings.rpeEnabled })
          }
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left"
        >
          <div className="flex-1">
            <div className="font-medium text-ink">记录 RPE</div>
            <div className="mt-0.5 text-sm text-muted">
              自感用力程度 1-10。关掉的话，记一组时少填一个框
            </div>
          </div>
          <span
            className={`shrink-0 text-sm font-semibold ${
              settings.rpeEnabled ? 'text-brand' : 'text-muted'
            }`}
          >
            {settings.rpeEnabled ? '开' : '关'}
          </span>
        </button>

        <SettingRow
          label="训练模板"
          hint="推日 / 拉日 / 腿日，一键套用"
          onClick={() => setSub('templates')}
        />
        <SettingRow
          label="身体数据"
          hint="身高、体重、体脂"
          onClick={() => setSub('body')}
        />
        {/* ---------- 备份 ---------- */}
        <div className="rounded-xl border border-line bg-surface p-4">
          <div className="font-medium text-ink">备份</div>
          <p className="mt-0.5 text-sm text-muted">
            数据只存在这台手机里，清缓存或换手机都会丢。
            建议每周导一次，顺手发到微信收藏。
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="min-h-11 flex-1 rounded-lg bg-brand font-semibold text-bg"
            >
              导出备份
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 flex-1 rounded-lg border border-line text-ink-2"
            >
              导入恢复
            </button>
          </div>

          {/* 这个文件选择框是藏起来的，点"导入恢复"按钮才会替你点它 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="hidden"
          />

          {importMessage !== '' && (
            <p
              className={`mt-3 text-xs ${
                importOk ? 'text-ink-2' : 'text-brand'
              }`}
            >
              {importMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// 设置列表里的一行。
// 单独写成一个小零件，是为了几行不用把同样的样式抄好几遍。
function SettingRow({
  label,
  hint,
  onClick,
}: {
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-4 text-left"
    >
      <div className="flex-1">
        <div className="font-medium text-ink">{label}</div>
        <div className="mt-0.5 text-sm text-muted">{hint}</div>
      </div>
      <span className="shrink-0 text-lg text-muted">›</span>
    </button>
  )
}
