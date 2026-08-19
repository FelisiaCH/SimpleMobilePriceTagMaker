# HANDOFF — index.html

Planning done in chat. Implementation from here is yours. Open PRs; do not merge.

## What it is

Single-file, offline, print-first A4 price tag sheet generator for a phone shop.
Editor UI on the left, live sheet preview on the right, `window.print()` gives exact A4.

- `index.html` — 1095 lines, 527 KB. The whole app. Named `index.html` so GitHub Pages serves it at the site root.
- Source of truth for the tag design: `Smartphone_Price_Tag_Sheet.pdf` (12-up handwrite template).

## Hard invariants

Breaking any of these is a regression, not a refactor.

1. **One file.** No npm, no CDN, no external assets, no runtime network calls.
2. **Must work from `file://` with no internet.** This is a shop counter.
3. **Print geometry is exact.** A4, `@page { size:A4 portrait; margin:0 }`, `.page` 210×297mm with 8mm pad, 3×4 grid → tag 64.67 × 70.25mm. Verify by print-to-PDF at 100% scale, then measure.
4. **No `color-mix()`.** Removed deliberately for older browsers; two uses were replaced with `--primary-hover` tokens.
5. **`[hidden]{display:none !important}` is load-bearing.** `.empty` and `.ct-row` set `display:flex`, which silently beats the bare `hidden` attribute. This bug already shipped once.
6. **Non-Latin strings go in the file as literal UTF-8.** Do not hand-write `\uXXXX` escapes — a typo'd escape is a parse error that kills the whole script.
7. **`DB_N` / `DB_C` are generated.** Never hand-edit. See T1.

## Map

CSS sections (marker comments in the file):

| Line | Section |
|---|---|
| 8 | shadcn/ui neutral tokens, light + `[data-theme=dark]` |
| 75 | primitives — `.btn` `.input` `.select` `.card` |
| 123 | layout — sidebar / topbar / stats / table / popover |
| 257 | the printed tag (do not restyle without asking) |
| 295 | responsive (`max-width:1024px` collapses sidebar) |
| 308 | print |

JS:

| Line | Thing |
|---|---|
| 484 | `KEY = "kotags.v5"`, `PER_PAGE = 12`, `LOGO_MAX = 320` |
| 487 | `L` — 20 tag languages × 5 keys (`model` `ram` `vat` `war` `per`, `rtl` on `ar`) |
| 511 | `UI` — 4 menu languages, ~55 keys each |
| 609 | `CUR` — 20 currency presets |
| 626 | `defaults()` / `normalize()` — state shape + migration |
| 713 | `PLAT` — 17 contact platforms, inline SVG badges |
| 736 | device code lookup — `DB_N` `DB_C` `db()` `lookupModel()` |
| 782 | `tagHTML()` — the printed tag |
| 812 | `renderSheet()` / 831 `renderList()` / 863 `renderContacts()` |

State: `{settings, entries}` → `localStorage["kotags.v5"]`, debounced 200ms.
Render entry points: `boot()` → `applySettings()` `applyUI()` `renderList()` `renderSheet()`.
i18n applies via `data-t` attributes; `applyUI()` walks them.

## Embedded data provenance

**Logo** — none bundled. `settings.logo` starts empty; the shop uploads its own and it is downscaled on a canvas to `LOGO_MAX` (320px long edge) PNG before it reaches `localStorage`. Upload size is deliberately ungated — the canvas step, not a byte limit, is what keeps state under the ~5 MB `localStorage` quota. With no upload the tag falls back to `ICON.logo`: Material Symbols "storefront" (filled, 24px) from google/material-design-icons, **Apache-2.0**, inlined as a path — no CDN, per invariant 1.

**Device DB** — built from:
- `github.com/bsthen/device-models` `devices.json` (Apache-2.0, auto-updated daily from Google Play's supported-devices CSV)
- `github.com/kyle-seongwoo-jun/apple-device-identifiers` `ios-device-identifiers.json`

Transforms applied, in order:
1. Drop entries where normalised name contains normalised code — 23,600 rows. Google's CSV frequently repeats the code as the "name"; resolving a code to another code is worse than a miss.
2. Drop names that are themselves code-shaped — `/^[A-Za-z]{0,4}\d{3,}[A-Za-z0-9]*$/` with no space and length ≥5 — 848 rows. Catches `V1901A → V1901K`.
3. CJK brand words mapped: 真我→realme, 红米→Redmi, 小米→Xiaomi, 荣耀→Honor, 华为→Huawei, 一加→OnePlus, 黑鲨→Black Shark, 飛馬→Pegasus.
4. Brand fixes: `TCT (Alcatel)`→Alcatel, `LGE`→LG, `Itel`→itel, `Vivo`→vivo, `Blu`→BLU.
5. Prefix brand when the name doesn't already contain it.
6. Dedupe names → array; codes → `"NORMCODE base36idx "` pairs.

Result: 18,971 codes, 11,293 names, 441 KB.

---

# Tasks

## T1 — commit the DB regeneration script  **[highest priority]**

The database was generated ad-hoc. There is no reproducible script in the repo. Upstream updates daily; right now nobody can refresh it.

Write `tools/build-device-db.mjs`:
- Fetch both upstream JSONs (URLs above).
- Apply the six transforms in the provenance section, in that order.
- Splice `DB_N` / `DB_C` into `index.html` **by index, not `String.replace` with a computed replacement** — the replacement text contains `\u` and `\n` sequences that regex-replace APIs will reinterpret. This already broke the file once.
- Print before/after counts for each drop stage.

**AC:** `node tools/build-device-db.mjs` on a clean checkout produces a byte-identical file when upstream is unchanged. `node --check` on the extracted `<script>` passes.

## T2 — commit a smoke test

Verification so far has been manual Playwright in a scratch container. Nothing is committed.

Write `tools/smoke.mjs` (Playwright, headless Chromium, loads `file://`):
- No `pageerror` on load.
- `RMX3310` → `realme GT 2`; `CPH2725` → `Oppo A5x`; `SM-S256VL` → `Samsung Galaxy A25 5G`; `iPhone15,3` → `iPhone 14 Pro Max`; `cph 2451` → `OnePlus 11 5G` (whitespace tolerance); `SM-S928` → `Samsung Galaxy S24 Ultra` (prefix match).
- `V1901` and `ZZZ9999X` → miss state with a `google.com/search` href.
- Empty state hidden when rows exist, visible at zero rows; table inverse.
- 25 tags → 3 pages; 12 tags qty-1 → exactly 1 page; 0 entries → 1 blank page, stats read 0/1/12.
- Every `data-t` key in the markup resolves in all 4 `UI` dicts; every `L` entry has all 5 keys.
- Menu language switch to `lo`/`th`/`zh` changes `.sb-name` and contact placeholders.
- Tag language `ar` sets `dir="rtl"` on `.tag`.

**AC:** exits non-zero on any failure. Runs in CI.

## T3 — print verification on real hardware

Not yet done. Everything above is screen-rendered only.

- Print to PDF at A4, 100% scale, default margins. Measure a tag: must be 64.67 × 70.25mm.
- Print on paper. Confirm cut guides align and 12 tags fit.
- Test with 4 contacts and long values — the contact row wraps to two lines; confirm it doesn't push the price block or clip.
- Test tag language `my` (Burmese) and `km` (Khmer) on the target machine. No webfonts are bundled; missing script fonts render as tofu.

**AC:** a short note in `docs/PRINT-VERIFIED.md` recording OS, browser, printer, and measured tag size.

## T4 — downscale uploaded logos

`fileLogo` accepts up to 1.2 MB and stores the raw base64 in `settings.logo`, which is written to `localStorage` on **every** state change. A 1 MB upload becomes ~1.3 MB of base64 rewritten on each keystroke-debounce.

Downscale on upload: canvas, max 320×320, PNG, before assigning to state. Keep the 1.2 MB input guard as a first filter.

**AC:** uploading a 1 MB JPEG results in `settings.logo` under 60 KB. Tag still renders sharp at 300dpi print.

## T5 — sheet render performance

`redraw()` rebuilds the entire `#sheet` innerHTML on a 150ms debounce. At 12 tags that's fine; at 200 tags (17 pages) every keystroke rebuilds 200 tag subtrees.

Measure first. If it's a real problem past ~5 pages, cache `tagHTML()` output per entry id + settings hash, or only re-render pages containing changed entries.

**AC:** typing in a Price cell with 20 pages queued stays under 100ms per debounce tick.

---

# Open decisions — need Felisia, do not guess

1. **Default logo.** Still the KO PhoneFix mark extracted from the PDF. Every other identifying detail was replaced with a translated placeholder. If this ships to another shop the logo is wrong for them. Swap for a neutral placeholder mark, or keep?
2. **iPhone A-numbers** (`A3101`, `A2650`) don't resolve — only Apple *identifiers* (`iPhone15,2`) do. Apple publishes no machine-readable A-number mapping and I was not willing to write one from memory onto a price tag. Options: source a vetted list, or leave to the web-search fallback.
3. **vivo coverage is thin.** Upstream data problem — vivo largely doesn't publish marketing names to Google. `V1901` misses by design.
4. **Google Sans** is in the tag font stack but cannot be bundled (proprietary, not on Google Fonts). Renders on Android/ChromeOS, falls back elsewhere. Accept, or switch the tag to a bundleable face?
5. **`MAX_CONTACTS = 4`** — chosen so the contact row can't eat the price block. Raise?

# Bugs already fixed — do not reintroduce

- `[hidden]` beaten by `display:flex` (see invariant 5).
- Table `th` padding `0 8px` vs cell text at 12px — headers sat 4px left of their column. `th` is now `0 12px`.
- Table `.cell::placeholder` had no colour rule and inherited a dark UA default, making placeholder prices look like real values. Now `--muted-foreground` at `opacity:.65`.
- Empty currency printed a leading `·` and empty contacts printed orphan icons. `tagHTML()` filters empty parts; do not revert to string concatenation.
