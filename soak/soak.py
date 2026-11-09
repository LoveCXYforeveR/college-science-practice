# -*- coding: utf-8 -*-
"""真机压测：10 轮冷启动 + 主流程回归。

坐标是按 1080x2340（Android 15 手势条）校准的，换设备需要重新量：
  今日卡 (540,1580) / 选项 (540,853) / 返回 (69,217)
  底部标签 y：Android 15 ≈ 2184，Android 11 ≈ 2070（用 SOAK_TAG_Y 覆盖）

用法：
  python soak/soak.py 10
  SOAK_TAG_Y=2070 python soak/soak.py 10          # Android 11
  SOAK_BACK_MARKER=0 python soak/soak.py 10       # 返回时不打 VIEW:home 的机型

判定确定性版。

要点：
  · 每一步点击前清空日志，再等页面自报的目标标记，杜绝缓冲区里旧标记造成假阳性
  · 清空前先把 ANR / JS 错误累计下来，避免清日志丢统计
  · 检查 BANK_JSON_OK（题库走 JSON.parse）与 BANK_FALLBACK_SCRIPT（退回老 script 路径）
  · 用 BOOT_READY / VIEW:xxx / PROFILE_OPEN 打点判定，不靠像素
"""
import os
import subprocess
import sys
import time

# adb 路径：优先环境变量 ADB，其次 PATH 里的 adb
ADB = os.environ.get("ADB") or "adb"
PKG = os.environ.get("SOAK_PKG", "com.zuopin.app")
ACT = PKG + "/" + PKG + ".MainActivity"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_out")
os.makedirs(OUT, exist_ok=True)

# 不同 Android 版本的手势条高度不同：Android 11 标签在 y≈2070，
# Android 15 在 y≈2184。用环境变量覆盖，避免维护两套脚本。
TAG_Y = int(os.environ.get("SOAK_TAG_Y", "2070"))
# 某些版本从答题页返回不会打 VIEW:home，此时关掉严格判定，
# 靠下一步「能否切到错题本」间接验证返回是否成功。
BACK_MARKER = os.environ.get("SOAK_BACK_MARKER", "1") != "0"


def sh(args, timeout=90):
    p = subprocess.run([ADB] + args, capture_output=True, text=True,
                       encoding="utf-8", errors="ignore", timeout=timeout)
    return (p.stdout or "") + (p.stderr or "")


def logs():
    return sh(["logcat", "-d"])


def clear_log():
    sh(["logcat", "-b", "all", "-c"])
    sh(["logcat", "-c"])


def tap(x, y):
    sh(["shell", "input", "tap", str(x), str(y)])


class Collector:
    """清日志之前先把这一段的异常收进来"""

    def __init__(self):
        self.anrs = 0
        self.errs = []

    @staticmethod
    def _parse(buf):
        errs = []
        for line in buf.splitlines():
            if " E ZPJS" in line:
                errs.append(line.split("ZPJS", 1)[-1].strip()[:110])
            elif "FATAL EXCEPTION" in line:
                errs.append("FATAL " + line.strip()[:90])
        return buf.count("ANR in " + PKG), errs

    def harvest(self):
        a, e = self._parse(logs())
        self.anrs += a
        self.errs.extend(e)

    def reset(self):
        self.harvest()
        clear_log()


def wait_marker(marker, timeout=8.0):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if marker in logs():
            return True
        time.sleep(0.6)
    return False


def tap_until(col, x, y, marker, tries=3, wait=8.0):
    col.reset()                       # 只在本步开始前清一次，重试不清
    for _ in range(tries):
        tap(x, y)
        if wait_marker(marker, wait):
            return True
        time.sleep(0.8)
    return False


def anr_dialog():
    out = sh(["shell", "dumpsys", "window", "windows"])
    return "Application Not Responding" in out or "isn't responding" in out


def dismiss_anr():
    for _ in range(2):
        if not anr_dialog():
            return
        tap(540, 1298)                # 「等待」
        time.sleep(2.0)
        if anr_dialog():
            tap(540, 1400)
            time.sleep(2.0)


def run(rounds=10):
    fails, boots, parses = [], [], []

    for i in range(1, rounds + 1):
        notes = []
        sh(["shell", "input", "keyevent", "KEYCODE_WAKEUP"])
        sh(["shell", "wm", "dismiss-keyguard"])
        dismiss_anr()
        sh(["shell", "am", "force-stop", PKG])
        time.sleep(1.5)

        col = Collector()
        clear_log()
        t0 = time.time()
        sh(["shell", "am", "start", "-n", ACT])
        ok = wait_marker("BOOT_READY", 90)
        ms = round((time.time() - t0) * 1000)
        boots.append(ms)
        if not ok:
            notes.append("90s 未就绪")
            col.harvest()
            fails.append((i, notes, col.errs[:3], ms))
            print("第 %2d 轮: %6dms 失败 %s" % (i, ms, notes), flush=True)
            continue

        # 题库预取是首屏后 2.6s 触发，等它自己上报，别用固定秒数猜
        import re
        bank_ok = wait_marker("BANK_JSON_OK", 12)
        bootlog = logs()
        if not bank_ok:
            notes.append("题库 12s 未就绪")
        else:
            m = re.search(r"parse_ms=(\d+)", bootlog)
            if m:
                parses.append(int(m.group(1)))
        if "BANK_FALLBACK_SCRIPT" in bootlog:
            notes.append("题库回落到 script")
        if "VIEW:home" not in bootlog:
            notes.append("启动后非 home")

        # ① 今日推荐：点整张卡片
        if not tap_until(col, 540, 1580, "VIEW:practice"):
            notes.append("今日推荐未进入")
        else:
            # ② 答一题（只点选项，不点「下一题」：那个按钮位置随题干长度浮动，
            #    误触会把页面带到别的子页，让后续标签坐标失效）
            tap(540, 853)
            time.sleep(1.2)
            if BACK_MARKER:
                if not tap_until(col, 69, 217, "VIEW:home"):
                    notes.append("返回未回首页")
            else:
                tap(69, 217)
                time.sleep(2.5)

        # ③ 错题本
        if not tap_until(col, 676, TAG_Y, "VIEW:wrong"):
            notes.append("错题本未打开")

        # ④ 我的
        if not tap_until(col, 944, TAG_Y, "PROFILE_OPEN"):
            notes.append("「我的」未打开")

        col.harvest()
        if col.anrs:
            notes.append("ANR×%d" % col.anrs)
            dismiss_anr()

        errs = col.errs
        if notes or errs or col.anrs:
            fails.append((i, notes, errs[:3], ms))
            print("第 %2d 轮: %6dms 问题 %s%s" % (
                i, ms, notes, (" errs=%d" % len(errs)) if errs else ""), flush=True)
        else:
            print("第 %2d 轮: %6dms OK" % (i, ms), flush=True)

        sh(["shell", "screencap", "-p", "/sdcard/s%d.png" % i])
        sh(["pull", "/sdcard/s%d.png" % i, os.path.join(OUT, "r%02d_end.png" % i)])

    print("\n=== 汇总 ===", flush=True)
    print("轮数 %d | 通过 %d | 有问题 %d" % (len(boots), len(boots) - len(fails), len(fails)), flush=True)
    if boots:
        b = sorted(boots)
        print("启动到首屏: min=%dms 中位=%dms max=%dms" % (b[0], b[len(b) // 2], b[-1]), flush=True)
    if parses:
        p = sorted(parses)
        print("题库 JSON.parse: min=%dms 中位=%dms max=%dms（共 %d 次）" % (
            p[0], p[len(p) // 2], p[-1], len(p)), flush=True)
    for i, notes, errs, ms in fails:
        print("  第 %d 轮(%dms): %s" % (i, ms, " / ".join(notes) if notes else "仅 JS 报错"), flush=True)
        for e in errs:
            print("     " + e, flush=True)


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else 10)
