// Lets one thing through and drops repeats for a moment, so a double tap can't do it twice.
const seen = new Map<string, number>();
export function once(key: string, ms = 800) {
  const now = Date.now();
  if (now - (seen.get(key) ?? 0) < ms) return false;
  seen.set(key, now);
  return true;
}
