import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nanometer7.nanofit.app',
  appName: 'NanoFIT',
  webDir: 'dist',

  plugins: {
    // ============================================================
    // 本地通知（2026-09-24 加，用来做"组间休息到点提醒"）
    // ============================================================
    //
    // smallIcon 是通知栏上左边那个小白图标。
    //
    // 【为什么必须自己指定一个】
    // 不指定的话，插件会退回安卓系统自带的 android.R.drawable.ic_dialog_info
    // —— 就是一个灰色的"ⓘ"圆圈，看着像别人的通知，不像这个 App 发的。
    // （依据：插件源码 LocalNotificationManager.java 里 resId 找不到时的那句兜底）
    //
    // 【这个值怎么填】
    // 填"文件名去掉扩展名"。下面这个 'ic_stat_rest' 对应的是
    // android/app/src/main/res/drawable/ic_stat_rest.xml。
    // 图标必须是【纯白单色】的：安卓只取它的"轮廓"再染成白色，
    // 彩色图会变成一团糊住的白色色块。
    //
    // 【找不到会怎样】
    // 不会崩，只是退回上面那个系统"ⓘ"图标。
    LocalNotifications: {
      smallIcon: 'ic_stat_rest',
    },
  },
};

export default config;
