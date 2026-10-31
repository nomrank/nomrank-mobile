#!/usr/bin/env bash
# Installs the release APK on the running emulator, opens it, and records whether it survived.
mkdir -p smoke
adb install android/app/build/outputs/apk/release/app-release.apk
adb logcat -c
adb shell monkey -p in.nomrank.app -c android.intent.category.LAUNCHER 1
sleep 45
adb exec-out screencap -p > smoke/screen.png
adb logcat -d > smoke/logcat.txt
grep -E "FATAL EXCEPTION|ReactNativeJS|AndroidRuntime|libc  *:|DEBUG  *:" smoke/logcat.txt | tail -80 > smoke/crash.txt || true
if adb shell pidof in.nomrank.app; then echo "alive"; else echo "app is not running"; cat smoke/crash.txt; exit 1; fi
