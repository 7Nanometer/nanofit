// ============================================================
// 把一段文字变成一个文件，交给用户决定存到哪
// ============================================================
//
// 【这个文件为什么必须存在：一个查出来的真 bug（2026-09-24）】
//
// 导出的代码原来用的是最普通的网页写法：把数据包成临时文件、造个链接、
// 替你点一下。这在电脑浏览器里好使，在【安卓 App 里一点用都没有】——
//
// 安卓的 WebView 天生不会下载文件，必须由 App 自己接一根"下载管子"
// （安卓里叫 DownloadListener）才能把文件写到硬盘上。
// 而 Capacitor 没接这根管子（我把它的安卓源码整个搜过，一条都没有）。
// 于是那个下载请求被【静默丢掉】：不报错、不弹提示、JS 那边也收不到信号。
//
// 后果特别隐蔽：界面上照样跳出"已导出"，你还以为存好了。
// 最讽刺的一点 —— 导入（选文件）是通的，因为 Capacitor 实现了"选文件"那个
// 对话框，却没实现"存文件"。所以这个 App 一直能【读】备份，却永远【写不出】备份。
//
// 【正确做法，抄的是 Capacitor 官方的推荐路子】
//   1. 把文字写成一个真文件，放在 App 自己的缓存目录里
//   2. 调起系统的"分享"面板，把这个文件递过去
//   3. 用户在面板里自己选：存到文件 / 发到微信收藏 / 发邮件 / ……
//
// 这样文件真的落到手机上了，而且"选哪个 App 存"这件事交给用户，
// 我们不用去猜国内各家的"文件"App 把东西藏哪了。
// ============================================================

import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const isNative = Capacitor.isNativePlatform()

// 存文件的结果。三种要分开，因为界面上说的话完全不一样：
//   ok        —— 分享面板走完了（注意：只是"面板走完"，用户到底存没存我们不知道）
//   cancelled —— 用户自己把面板关了，不是出错，别说"失败"吓人
//   failed    —— 真出问题了（写不进去、分享不了），得让人知道
export type SaveOutcome = 'ok' | 'cancelled' | 'failed'

// 现在是不是装在手机上。
// 界面靠它决定那句"存到哪了"该怎么说 —— 手机上要弹分享面板让人自己选，
// 网页上是浏览器直接下载到"下载"文件夹。两边的说法不一样，
// 说错了就是在骗人（原来那句"手机上在「文件」App 里"就是这么错的）。
export function isOnPhone(): boolean {
  return isNative
}

export async function saveTextFile(
  filename: string,
  text: string,
): Promise<SaveOutcome> {
  // 网页版走老路：那个"造个临时文件点一下"的写法在真浏览器里是好使的，
  // 一个字都不用改。只有装在手机上才需要换路子。
  if (!isNative) {
    webDownload(filename, text)
    return 'ok'
  }

  // ---------- 第一步：把文字写成真文件 ----------
  //
  // 放在 Directory.Cache（App 自己的缓存目录，/data/data/<包名>/cache）。
  // 选它的理由：
  //   · 不用申请任何存储权限（安卓 10 以后往公共目录写东西很麻烦）
  //   · 它正好在 App 的 FileProvider 允许分享的名单里
  //     （见 android/app/src/main/res/xml/file_paths.xml 里的 cache-path）
  // 文件马上就被分享出去了，缓存被系统清掉也无所谓。
  //
  // ★ encoding 必须显式写 UTF8。
  //   备份的 JSON 里有中文动作名（"杠铃卧推"这种），编码搞错的话
  //   导出的会是个乱码文件 —— 而且当场看不出来，等真要恢复时才发现，
  //   那时候就晚了。这个不能靠默认值，要写死。
  let uri: string
  try {
    const written = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    uri = written.uri
  } catch {
    return 'failed'
  }

  // ---------- 第二步：把文件交给系统分享面板 ----------
  //
  // 用 files 而不是 url：files 走的是"把文件作为附件分享出去"，
  // 微信收藏、存到文件、发邮件都能正确拿到文件本身。
  try {
    await Share.share({
      title: filename,
      files: [uri],
      dialogTitle: '把备份存到哪？',
    })
    return 'ok'
  } catch (err) {
    // ★ 用户点了取消，插件是【抛错】的，不是正常返回。
    //   （读过它的安卓源码：resultCode 是 CANCELED 时执行的是 call.reject("Share canceled")。）
    //   不把这种情况挑出来的话，用户自己关掉面板会看到"导出失败"，
    //   然后跑来问我们为什么坏了 —— 而他其实只是改主意了。
    //   插件只给了这一句文字，没有错误码，所以只能按文字认。
    const message = err instanceof Error ? err.message : String(err)
    if (/cancel/i.test(message)) return 'cancelled'
    return 'failed'
  }
}

// 网页版的老路子：造个临时文件 + 替你点一下链接。
// 这段是原来 json.ts 里搬过来的，一个字没改 —— 它在真浏览器里是对的。
function webDownload(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  // ★必须调用，否则这个临时网址会一直占着内存不释放
  URL.revokeObjectURL(url)
}
