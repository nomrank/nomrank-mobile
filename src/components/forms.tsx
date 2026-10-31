import { useState } from "react";
import { Pressable, View } from "react-native";
import { CheckIcon, SearchIcon } from "lucide-react-native";
import { brand, useTheme } from "@/theme";
import { Input, Overline, T } from "./ui";

export type PickableRegion = { slug: string; name: string; kind: "state" | "ut" };

// Where you grew up eating: every state and union territory, searchable and grouped.
export function RegionPicker({ regions, value, onChange }: { regions: PickableRegion[]; value: string; onChange: (slug: string) => void }) {
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = regions.filter((r) => r.name.toLowerCase().includes(needle));
  return (
    <View style={{ gap: 8 }}>
      <View>
        <Input value={q} onChangeText={setQ} placeholder="Search states" accessibilityLabel="Search states" style={{ paddingLeft: 42 }} />
        <View pointerEvents="none" style={{ position: "absolute", left: 14, top: 15 }}>
          <SearchIcon size={18} color={colors.muted} />
        </View>
      </View>
      {(["state", "ut"] as const).map((kind) => {
        const list = shown.filter((r) => r.kind === kind);
        if (!list.length) return null;
        return (
          <View key={kind} style={{ gap: 2 }}>
            <Overline style={{ marginTop: 8 }}>{kind === "state" ? "States" : "Union territories"}</Overline>
            {list.map((r) => (
              <Pressable key={r.slug} onPress={() => onChange(r.slug)} accessibilityRole="radio" accessibilityState={{ selected: value === r.slug }} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderRadius: 10, backgroundColor: value === r.slug ? "rgba(255,194,60,0.15)" : "transparent" }}>
                <T weight={value === r.slug ? 600 : 400}>{r.name}</T>
                {value === r.slug && <CheckIcon size={18} color={colors.mustardInk} />}
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const pad = (n: string, size: number) => n.padStart(size, "0");

// Birthday as three boxes: day, month, year. `value` is YYYY-MM-DD once it's a whole date, otherwise "".
export function DateOfBirth({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { colors } = useTheme();
  const [y0, m0, d0] = value ? value.split("-") : ["", "", ""];
  const [day, setDay] = useState(d0);
  const [month, setMonth] = useState(m0);
  const [year, setYear] = useState(y0);

  function push(d: string, m: string, y: string) {
    const [dn, mn, yn] = [Number(d), Number(m), Number(y)];
    const real = d && m && y.length === 4 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= new Date(Date.UTC(yn, mn, 0)).getUTCDate();
    onChange(real ? `${y}-${pad(m, 2)}-${pad(d, 2)}` : "");
  }
  const box = (label: string, val: string, set: (s: string) => void, max: number, flex: number, apply: (s: string) => void) => (
    <View style={{ flex, gap: 4 }}>
      <T size={13} color={colors.muted}>
        {label}
      </T>
      <Input
        value={val}
        onChangeText={(s) => {
          const clean = s.replace(/\D/g, "").slice(0, max);
          set(clean);
          apply(clean);
        }}
        keyboardType="number-pad"
        maxLength={max}
        accessibilityLabel={`Birth ${label.toLowerCase()}`}
        style={{ textAlign: "center" }}
      />
    </View>
  );
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      {box("Day", day, setDay, 2, 1, (s) => push(s, month, year))}
      {box("Month", month, setMonth, 2, 1, (s) => push(day, s, year))}
      {box("Year", year, setYear, 4, 1.5, (s) => push(day, month, s))}
    </View>
  );
}

// Pick one of a few, with a line of explanation under each.
export function OptionList<V extends string>({ options, value, onChange }: { options: readonly { value: V; label: string; hint?: string }[]; value: V; onChange: (v: V) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: on ? brand.mustard : colors.hairline, backgroundColor: on ? "rgba(255,194,60,0.1)" : colors.paper, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <T size={14} weight={600}>
                {o.label}
              </T>
              {!!o.hint && (
                <T size={13} color={colors.muted}>
                  {o.hint}
                </T>
              )}
            </View>
            {on && <CheckIcon size={16} color={colors.mustardInk} />}
          </Pressable>
        );
      })}
    </View>
  );
}
