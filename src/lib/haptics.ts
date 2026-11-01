import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const KEY = "nomrank-haptics";
let on = true;
AsyncStorage.getItem(KEY).then((v) => {
  on = v !== "0";
});

export const hapticsOn = () => on;
export function setHaptics(next: boolean) {
  on = next;
  AsyncStorage.setItem(KEY, next ? "1" : "0");
}

// iPhones have no web vibration, but Safari on iOS 18+ gives a light tick when a switch control is toggled. One hidden switch,
// clicked in code. Every kind of buzz feels the same here, and older iOS stays silent.
let tick: HTMLLabelElement | null = null;
function iosTick() {
  if (!tick) {
    tick = document.createElement("label");
    tick.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    tick.appendChild(input);
    document.body.appendChild(tick);
  }
  tick.click();
}

const run = (buzz: () => Promise<void>) => {
  if (!on) return;
  if (Platform.OS === "web") return /iP(hone|ad|od)/.test(navigator.userAgent) ? iosTick() : navigator.vibrate?.(10);
  buzz().catch(() => {});
};

// One place for every buzz, so the switch in Settings covers them all.
export const haptic = {
  tap: () => run(() => Haptics.selectionAsync()), // choosing: tabs, options, a score step
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), // buttons
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), // double-tap to agree
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
