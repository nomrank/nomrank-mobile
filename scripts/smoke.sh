#!/usr/bin/env bash
# Installs the release APK on the running emulator, opens it as a made-up signed-in person, and taps through the bottom bar the
# way a hand does. A crash is reported with the tab that caused it.
mkdir -p smoke
adb install android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb shell monkey -p in.nomrank.app -c android.intent.category.LAUNCHER 1
sleep 45
adb exec-out screencap -p > smoke/launch.png

size=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1); w=${size%x*}; h=${size#*x}
dens=$(adb shell wm density | grep -oE '[0-9]+' | tail -1)
y=$((h - 52 * dens / 160))
failed=0
alive() { adb shell pidof in.nomrank.app > /dev/null; }
tap_tab() { # index 0-4: Home, Battles, Rate, Activity, You
  adb shell input tap $(( (2 * $1 + 1) * w / 10 )) "$y"
  sleep 7
  adb exec-out screencap -p > "smoke/tab$1.png"
  if alive; then echo "ok    tab $1 ($2)"; else echo "DIED  tab $1 ($2)"; failed=1; adb shell monkey -p in.nomrank.app -c android.intent.category.LAUNCHER 1 > /dev/null; sleep 15; fi
}
tap_tab 1 Battles
tap_tab 0 Home
tap_tab 3 Activity
tap_tab 4 You
tap_tab 0 Home
tap_tab 2 Rate
adb shell input keyevent KEYCODE_BACK; sleep 3
tap_tab 1 Battles
adb logcat -d > smoke/logcat.txt
grep -E "FATAL EXCEPTION|ReactNativeJS|AndroidRuntime: " -A14 smoke/logcat.txt | grep -v "Access denied" | head -160 > smoke/crash.txt || true
exit $failed
