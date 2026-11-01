import { useEffect, useRef, type RefObject } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type Scroller = { scrollToOffset: (o: { offset: number; animated?: boolean }) => void };

// Pressing a bottom tab takes that tab's list back to the top. Each tab registers its list here; the tab bar calls `tabPressed`.
const lists = new Map<string, () => void>();
export const tabPressed = (name: string) => lists.get(name)?.();

export function useScrollToTopOnTab(name: string, ref: RefObject<Scroller | null>) {
  useEffect(() => {
    lists.set(name, () => ref.current?.scrollToOffset({ offset: 0, animated: true }));
    return () => void lists.delete(name);
  }, [name, ref]);
}

const TABS_ROW = 48;

// A list with tabs in its header (Takes / Rankings, Takes / Diary): when the next tab has less to show, the list would clamp to
// its end and look like it jumped to the bottom. Call `settle` as the tab changes and it parks the tab row at the top instead.
export function useKeepTabsInView(ref: RefObject<Scroller | null>) {
  const y = useRef(0);
  const head = useRef(0);
  return {
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      y.current = e.nativeEvent.contentOffset.y;
    },
    onHeaderLayout: (e: LayoutChangeEvent) => {
      head.current = e.nativeEvent.layout.height;
    },
    settle: () => {
      const at = Math.max(0, head.current - TABS_ROW);
      if (y.current > at) ref.current?.scrollToOffset({ offset: at, animated: false });
    },
  };
}
