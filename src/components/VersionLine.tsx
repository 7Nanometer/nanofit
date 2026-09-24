import { useEffect, useState } from 'react'
import { App } from '@capacitor/app'
import type { AppInfo } from '@capacitor/app'
import { isOnPhone } from '../lib/savefile'

// ============================================================
// 设置页最底下那一行版本号
// ============================================================
//
// 【为什么不写死一个字符串】
// 写死的话，代码里写着"2026.09.24"、手机上装的却可能是上个月打的包，
// 界面上照样显示新号 —— 那就成了自己骗自己。
// 这里问的是【这台手机里装着的那个包本身】：安卓系统记着每个 App 的
// 版本号，直接问它要，读出来的永远是装在这台手机上的那个包的真身。
// （依据：插件源码 AppPlugin.java 的 getInfo()，取的是 pinfo.versionName）
//
// 【浏览器里怎么办】
// 网页版没有"包版本"这个概念 —— 它就是一堆网页文件，没有编号。
// 而且这个能力在浏览器里一调用就抛错（AppWeb.getInfo 直接
// throw unimplemented），所以干脆不调。
// 显示一句"网页预览"，免得你在电脑上把网页版的数字当成手机上的版本。
//
// 【读不到就整行不显示】
// 这只是一行说明文字，不值得为它让整页出错。

export function VersionLine() {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const onPhone = isOnPhone()

  useEffect(() => {
    if (!onPhone) return
    // 切到别的 tab 会把整个设置页卸载，请求回来时这一页可能已经没了。
    // 用一个标记挡住，免得对已经卸载的页面写状态。
    let alive = true
    App.getInfo()
      .then((next) => {
        if (alive) setInfo(next)
      })
      .catch(() => {
        // 读不到就当没这行字，不打扰主人
      })
    return () => {
      alive = false
    }
  }, [onPhone])

  // 网页版：说清楚这不是手机上的版本
  if (!onPhone) {
    return (
      <p className="mt-5 text-center text-xs text-muted">
        网页预览 · 不是手机上那个包
      </p>
    )
  }

  // 手机上但还没读到（就一瞬间）：先不显示，免得闪一下空白
  if (info === null) return null

  return (
    <p className="mt-5 text-center text-xs text-muted">
      NanoFIT {info.version}
    </p>
  )
}
