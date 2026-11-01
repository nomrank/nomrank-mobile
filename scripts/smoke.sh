#!/usr/bin/env bash
# Installs the release APK on the running emulator, opens it, then jumps to each screen by link and records whether the
# app survived. A crash is reported with the screen that caused it.
mkdir -p smoke
adb install android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb shell monkey -p in.nomrank.app -c android.intent.category.LAUNCHER 1
sleep 40
adb exec-out screencap -p > smoke/launch.png
failed=0
open() {
  adb shell am start -W -a android.intent.action.VIEW -d "$1" in.nomrank.app > /dev/null
  sleep 9
  name=$(echo "$1" | tr -c 'a-zA-Z0-9\n' '_')
  adb exec-out screencap -p > "smoke/$name.png"
  if adb shell pidof in.nomrank.app > /dev/null; then echo "ok    $1"; else echo "DIED  $1"; failed=1; adb shell monkey -p in.nomrank.app -c android.intent.category.LAUNCHER 1 > /dev/null; sleep 12; fi
}
for path in battles notifications you rate "rate?dish=none" settings "u/nobody" "top/biryani"; do open "nomrank:///$path"; done
adb logcat -d > smoke/logcat.txt
grep -E "FATAL EXCEPTION|ReactNativeJS|AndroidRuntime" -A12 smoke/logcat.txt | grep -v "Access denied" | head -150 > smoke/crash.txt || true
exit $failed
