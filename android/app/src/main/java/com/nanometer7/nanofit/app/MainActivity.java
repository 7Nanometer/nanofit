package com.nanometer7.nanofit.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * 安卓外壳。
 *
 * 除了把网页装进去，它还干一件网页干不了的事：
 * 亲手把「组间休息」这个通知渠道建出来。原因见 createRestChannel()。
 */
public class MainActivity extends BridgeActivity {

    // ★ 必须和 src/lib/restnotify.ts 里的 CHANNEL_ID 一字不差。
    //   两边对不上的话，这里建的渠道没人用，而通知会落到插件建的那个上
    //   —— 也就是"没有震动节奏"的那个，问题原样保留。
    private static final String REST_CHANNEL_ID = "rest-timer-v2";

    // 建渠道成功后在这儿留个暗号，App 的「诊断」能读回来。
    //
    // 【为什么需要这个暗号】
    // 渠道建好之后，光看"渠道存在"是分不出是谁建的 —— 插件那边也会建同名渠道
    // （对已存在的渠道是空操作）。万一这段原生代码没跑成，插件就顶上去了，
    // 而插件建出来的正是"没震动节奏"的那个。有了暗号，App 里一眼就能看出
    // 到底是哪条路生效的，不用再猜。
    //
    // ★ 键名故意不用 nanofit:v1: 开头 —— 那个前缀是 App 自己的存档，
    //   由 storage.ts 按固定清单读写，也会进备份。这个只是个调试标记。
    private static final String DIAG_KEY = "nanofit:diag:native-channel";
    private static final String PREF_STORE = "CapacitorStorage"; // 和 Preferences 插件同一个柜子

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createRestChannel();
    }

    /**
     * 亲手建「组间休息」渠道，而且要【指定明确的震动节奏】。
     *
     * 【为什么不能在网页那边建】
     * Capacitor 的 local-notifications 插件只会调 enableVibration(true)，
     * **从来不给渠道指定震动节奏**（整个插件里搜不到一处 setVibrationPattern）。
     * 而"开了震动开关、却没给节奏"在不少机型上就是不震 ——
     * 真机实测 12 次一次都没震过，而且系统设置里那个渠道连"震动"这一项都不显示。
     *
     * 【为什么放在 onCreate 里】
     * createNotificationChannel() 对【已经存在】的渠道是空操作，谁先建谁说了算。
     * MainActivity.onCreate 跑在网页加载之前，所以这里一定赢过插件那边的
     * createChannel()。这也意味着【换渠道编号】是必须的：旧渠道已经存在了，
     * 再怎么建都改不动它。
     *
     * 【为什么整段包在 try/catch 里】
     * 建渠道失败最多是提醒不震，但 App 必须能打开 —— 数据在 App 里。
     * 这里绝不允许抛出去把启动搞挂。
     */
    private void createRestChannel() {
        // 安卓 7 及以下没有"渠道"这东西，直接跳过
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;

            // 已经有了就不动它 —— 渠道是不可改的，重复建没有意义
            if (nm.getNotificationChannel(REST_CHANNEL_ID) != null) {
                markNativeChannel("exists");
                return;
            }

            NotificationChannel ch = new NotificationChannel(
                    REST_CHANNEL_ID,
                    "组间休息",
                    NotificationManager.IMPORTANCE_HIGH);

            ch.setDescription("组间休息结束时提醒你");

            // 锁屏上也看得见内容。组间休息本来就该在锁屏上一眼看到，藏起来没意义。
            ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

            // ★★ 这一对是这次修的核心。只开开关不给节奏 = 不少机型上不震。
            //    节奏的读法：等 0 毫秒 → 震 400 → 停 250 → 震 400。
            //    两下短震比一下长震更像"该下一组了"，也不会太吵。
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[] { 0, 400, 250, 400 });

            // 声音【故意不设】：渠道默认就是系统默认通知音，和网页那边的决定一致。
            // （安卓源码里 NotificationChannel 构造时就把 mSound 设成了系统默认通知音。）

            nm.createNotificationChannel(ch);
            markNativeChannel("created");
        } catch (Throwable t) {
            // 吞掉。建渠道失败不该影响 App 启动。
        }
    }

    /** 在 App 能读到的地方留个暗号，说明这次原生建渠道的结果。 */
    private void markNativeChannel(String result) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREF_STORE, MODE_PRIVATE);
            prefs.edit()
                    .putString(DIAG_KEY, result + "@" + System.currentTimeMillis())
                    .apply();
        } catch (Throwable t) {
            // 记号写不上也无所谓，不影响任何功能
        }
    }
}
