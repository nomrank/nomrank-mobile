// Copies the web app's pure rules and queries into src/core, so both apps read the database the same way.
// Run from this repo with the web repo next to it: node scripts/sync-core.js ../Bitecast
const fs = require("fs");
const path = require("path");

const web = path.resolve(process.argv[2] ?? "../Bitecast", "apps/web/lib");
const out = path.resolve(__dirname, "../src/core");
const FILES = ["avatar", "battles", "cities", "comments", "db-errors", "diet", "dishes", "notifications", "plate", "profiles", "rankings", "ratings", "restaurants", "taste", "time", "validation", "votes"];

// Web-only pieces, swapped for their phone equivalents.
const EDITS = {
  ratings: [[/export function scoreColor[\s\S]*?\n}\n/, `export function scoreColor(score: number) {
  const k = scoreHeat(score);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * k);
  return \`rgb(\${mix(255, 255)}, \${mix(75, 194)}, \${mix(58, 60)})\`;
}
`]],
  // Admin-only, and its \\p{M} regex isn't worth carrying into Hermes.
  validation: [[/\/\/ Admins adding a restaurant[\s\S]*$/, ""]],
};

fs.mkdirSync(out, { recursive: true });
for (const name of FILES) {
  let s = fs.readFileSync(path.join(web, `${name}.ts`), "utf8").replace(/\r\n/g, "\n");
  s = s.replaceAll("process.env.NEXT_PUBLIC_SUPABASE_URL", "process.env.EXPO_PUBLIC_SUPABASE_URL");
  for (const [from, to] of EDITS[name] ?? []) {
    if (!from.test(s)) throw new Error(`${name}: edit no longer applies: ${from}`);
    s = s.replace(from, to);
  }
  fs.writeFileSync(path.join(out, `${name}.ts`), `// Generated from nomrank-web apps/web/lib/${name}.ts by scripts/sync-core.js. Change it there.\n${s}`);
}
console.log(`copied ${FILES.length} files`);
