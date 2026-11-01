import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

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

const run = (buzz: () => Promise<void>) => {
  if (on) buzz().catch(() => {});
};

// One place for every buzz, so the switch in Settings covers them all.
export const haptic = {
  tap: () => run(() => Haptics.selectionAsync()), // choosing: tabs, options, a score step
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)), // buttons
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), // double-tap to agree
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
