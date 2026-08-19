#!/usr/bin/env node
/* tools/build.mjs — splice languages/ and devices/ back into index.html.
 *
 * index.html stays ONE self-contained file (invariant 1) and never fetches
 * anything at run time (invariant 2). languages/ and devices/ are the editable
 * *source*, not runtime assets — this script is what puts them into the app.
 *
 * Device specs are NOT here. The app learns those from what the shop enters and
 * keeps them in localStorage, so there is no file to maintain and no build step
 * standing between a shop assistant and their own data.
 *
 * Splicing is done by line index. Never String.replace with a computed
 * replacement: the device data contains \n and \u sequences that replacement
 * APIs reinterpret, which has already corrupted this file once.
 *
 *   node tools/build.mjs            rebuild index.html
 *   node tools/build.mjs --check    verify index.html is up to date, write nothing
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = join(ROOT, "index.html");
const CHECK = process.argv.includes("--check");

const read = p => readFileSync(join(ROOT, p), "utf8");
const lang = (kind, code) => JSON.parse(read(`languages/${kind}/${code}.json`));
// JSON.stringify emits literal UTF-8 and never \uXXXX escapes — invariant 6 holds
// by construction, so no hand-written escape can be typo'd into a parse error.
const js = v => JSON.stringify(v);

/* ── load + validate ─────────────────────────────────────────────── */

const order = JSON.parse(read("languages/order.json"));
const problems = [];

for (const kind of ["tag", "ui"]) {
  const disk = readdirSync(join(ROOT, "languages", kind))
    .filter(f => f.endsWith(".json")).map(f => f.slice(0, -5));
  for (const c of order[kind])
    if (!disk.includes(c)) problems.push(`languages/${kind}/${c}.json listed in order.json but missing`);
  for (const c of disk)
    if (!order[kind].includes(c)) problems.push(`languages/${kind}/${c}.json exists but is not in order.json — it would be ignored`);
}

// every tag language needs the full key set; rtl is optional and only ar has it
const TAG_KEYS = ["n", "model", "ram", "vat", "war", "per"];
for (const c of order.tag) {
  const miss = TAG_KEYS.filter(k => !(k in lang("tag", c)));
  if (miss.length) problems.push(`languages/tag/${c}.json missing: ${miss.join(", ")}`);
}
// every menu language must cover the same keys as the first one, or applyUI()
// silently renders undefined into the sidebar
const uiRef = Object.keys(lang("ui", order.ui[0]));
for (const c of order.ui.slice(1)) {
  const have = lang("ui", c);
  const miss = uiRef.filter(k => !(k in have));
  const extra = Object.keys(have).filter(k => !uiRef.includes(k));
  if (miss.length) problems.push(`languages/ui/${c}.json missing ${miss.length} key(s): ${miss.slice(0, 6).join(", ")}${miss.length > 6 ? " …" : ""}`);
  if (extra.length) problems.push(`languages/ui/${c}.json has key(s) absent from ${order.ui[0]}: ${extra.join(", ")}`);
}

if (problems.length) {
  console.error("build failed:\n" + problems.map(p => "  - " + p).join("\n"));
  process.exit(1);
}

/* ── generate ────────────────────────────────────────────────────── */

const TAG_ORDER = ["n", "model", "ram", "vat", "war", "per", "rtl"];
const genTag = () => "var L = {\n" + order.tag.map(c => {
  const o = lang("tag", c);
  return `  ${c}:{` + TAG_ORDER.filter(k => k in o).map(k => `${k}:${js(o[k])}`).join(", ") + "}";
}).join(",\n") + "\n};";

// pack keys to a width budget so the block stays readable instead of 300 lines
const genUI = (width = 104) => "var UI = {\n" + order.ui.map(c => {
  const o = lang("ui", c), keys = Object.keys(o);
  const parts = keys.map((k, i) => `${k}:${js(o[k])}` + (i < keys.length - 1 ? "," : ""));
  const rows = [];
  let cur = "";
  for (const p of parts) {
    if (!cur) cur = p;
    else if ((cur + " " + p).length <= width) cur += " " + p;
    else { rows.push(cur); cur = p; }
  }
  if (cur) rows.push(cur);
  return `  ${c}:{` + rows.map((r, i) => i ? "    " + r : r).join("\n") + "}";
}).join(",\n") + "\n};";

// The font ships inside index.html. Downloading it at build time would make the
// build need a network; vendoring the woff2 keeps it reproducible offline.
const fontB64 = readFileSync(join(ROOT, "fonts/GoogleSans-latin.woff2")).toString("base64");
// official brand marks and colours, vendored from Simple Icons (CC0) — see icons/
const brands = JSON.parse(read("icons/brands.json"));
const brandBlock = "var BRAND = " + JSON.stringify(
  Object.fromEntries(Object.entries(brands).map(([k, v]) => [k, { c: "#" + v.hex, d: v.d }]))) + ";";
const fontFace = "@font-face{font-family:'Google Sans';font-style:normal;font-weight:400 700;" +
  "font-display:swap;src:url(data:font/woff2;base64," + fontB64 + ") format('woff2')}";

const names = read("devices/names.txt").replace(/\n$/, "");

// Apple's A-numbers collide with Android device codes (A1724 is an iPhone SE and
// also maps to an Acer tablet). Drop those codes so they miss instead of
// answering wrongly. Only CODES are removed — names.txt keeps its line indices,
// so nothing needs re-indexing.
const blocked = new Set(read("devices/apple-model-numbers.txt").split("\n")
  .map(l => l.replace(/\r$/, "").trim())
  .filter(l => l && !l.startsWith("#"))
  .map(l => l.toUpperCase()));
const blockedHits = [];
const codes = read("devices/codes.txt").trim().split("\n")
  .filter(line => {
    const code = line.slice(0, line.lastIndexOf(" "));
    if (!blocked.has(code)) return true;
    blockedHits.push(code);
    return false;
  }).join(" ");

/* ── splice by index ─────────────────────────────────────────────── */

const before = readFileSync(HTML, "utf8");
const lines = before.split("\n");

function spliceBlock(startRe, endExact, text) {
  const i = lines.findIndex(l => startRe.test(l));
  if (i < 0) throw new Error(`start of block not found: ${startRe}`);
  let j = i;
  while (j < lines.length && lines[j] !== endExact) j++;
  if (j >= lines.length) throw new Error(`end of block ("${endExact}") not found after line ${i + 1}`);
  lines.splice(i, j - i + 1, ...text.split("\n"));
  return [i + 1, j - i + 1];
}
function spliceLine(startRe, text) {
  const i = lines.findIndex(l => startRe.test(l));
  if (i < 0) throw new Error(`line not found: ${startRe}`);
  lines[i] = text;
  return [i + 1, 1];
}

const at = {};
at.L    = spliceBlock(/^var L = \{$/,  "};", genTag());
at.UI   = spliceBlock(/^var UI = \{$/, "};", genUI());
at.font = spliceLine(/^@font-face\{font-family:'Google Sans'/, fontFace);
at.BRAND = spliceLine(/^var BRAND = /, brandBlock);
at.DB_N = spliceLine(/^var DB_N = /, `var DB_N = ${js(names)};`);
at.DB_C = spliceLine(/^var DB_C = /, `var DB_C = ${js(codes)};`);

const after = lines.join("\n");

/* ── report ──────────────────────────────────────────────────────── */

const nameCount = names.split("\n").length;
const codeCount = codes.split(" ").length / 2;
console.log(`tag languages   ${String(order.tag.length).padStart(6)}   ${order.tag.join(" ")}`);
console.log(`menu languages  ${String(order.ui.length).padStart(6)}   ${order.ui.join(" ")}  (${uiRef.length} keys each)`);
console.log(`bundled font    ${String(Math.round(fontB64.length/1024)).padStart(6)} KB  Google Sans latin, SIL OFL 1.1`);
console.log(`brand icons     ${String(Object.keys(brands).length).padStart(6)}     Simple Icons, CC0`);
console.log(`device names    ${String(nameCount).padStart(6)}`);
console.log(`device codes    ${String(codeCount).padStart(6)}   ${blocked.size} Apple model numbers blocked, ${blockedHits.length} collision(s) removed${blockedHits.length ? ": " + blockedHits.join(", ") : ""}`);
console.log(`spliced at      L:${at.L[0]}  UI:${at.UI[0]}  DB_N:${at.DB_N[0]}  DB_C:${at.DB_C[0]}`);

if (codeCount % 1 !== 0) { console.error("devices/codes.txt has an odd number of tokens — every line must be \"CODE index\""); process.exit(1); }

if (after === before) {
  console.log(`\nindex.html already up to date (${before.length} chars)`);
  process.exit(0);
}
if (CHECK) {
  console.error("\nindex.html is OUT OF DATE — run: node tools/build.mjs");
  process.exit(1);
}
writeFileSync(HTML, after, "utf8");
console.log(`\nindex.html  ${before.length} -> ${after.length} chars`);
