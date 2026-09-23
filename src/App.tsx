import { useState } from 'react'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { TrainScreen } from './screens/TrainScreen'

// ============================================================
// 这个文件是整个 App 的"外壳"
// ============================================================
// 它现在只干一件事：决定当前显示 4 个页面中的哪一个，
// 并把底部那排 tab 按钮画出来。
//
// 真正的页面内容，从阶段 2 开始会一个个搬进 src/screens/ 文件夹。
// 现在 4 个页面都还只是占位文字，先让你看到"能切换"。
// ============================================================

// 4 个 tab 的中文名和它们的"内部代号"。
// 末尾的 as const 是 TypeScript 的一个小技巧：告诉它这 4 个字符串永远不会变，
// 这样以后不小心把 'train' 打成 'trian' 时，编辑器会立刻标红。
const TABS = [
  { key: 'train', label: '训练' },
  { key: 'history', label: '历史' },
  { key: 'stats', label: '统计' },
  { key: 'settings', label: '设置' },
] as const

// 从上面那张表里自动"提取"出代号有哪几种，得到：
// 'train' | 'history' | 'stats' | 'settings'
type TabKey = (typeof TABS)[number]['key']

function App() {
  // useState 是 React 用来"记住一个值"的工具。
  // 这里记住的是"当前选中哪个 tab"，初值是「训练」。
  // setTab 是修改它的唯一方法，改完 React 会自动重画界面。
  const [tab, setTab] = useState<TabKey>('train')

  return (
    // 最外层：深黑底、至少占满一屏高、内容从上往下竖着排
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      {/* 上半部分：当前 tab 的内容。
          flex-1 的意思是"把除底部栏之外剩下的高度全部占满"。 */}
      <main className="flex-1 px-4 pt-6">
        {/* 下面这行的 mx-auto + max-w 就是"电脑上居中一条、最宽 480px"的实现：
            mx-auto 让左右两边自动平分剩余空间，效果就是居中。 */}
        <div className="mx-auto w-full max-w-[480px]">
          {/* 训练页已经是真的了（阶段 3 第 1 小步做的），不再是占位文字 */}
          {tab === 'train' && <TrainScreen />}
          {/* 历史页已经是真的了（阶段 4 做的） */}
          {tab === 'history' && <HistoryScreen />}
          {/* 统计页已经是真的了（阶段 5 做的） */}
          {tab === 'stats' && <StatsScreen />}
          {/* 设置页已经是真的了（阶段 2 做的），不再是占位文字 */}
          {tab === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {/* 底部那排 tab 按钮。
          sticky bottom-0 = 页面滚动时吸在屏幕底部不动。
          pb-[env(safe-area-inset-bottom)] = 给 iPhone 底部那条横条留出空位，
          否则最下面的按钮会被横条压住。非 iPhone 上这个留白是 0，等于没加。 */}
      <nav className="sticky bottom-0 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex w-full max-w-[480px]">
          {TABS.map((item) => {
            const isActive = item.key === tab
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                // min-h-11 = 44 像素，这是手指能点准的最小尺寸
                className={`min-h-11 flex-1 py-3 text-sm transition-colors ${
                  isActive ? 'font-semibold text-brand' : 'text-muted'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default App
