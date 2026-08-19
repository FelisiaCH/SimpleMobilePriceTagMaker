# Simple Mobile Price Tag Maker

Offline A4 price tag sheets for a phone shop — 12 tags per page.

Open `index.html`. That is the whole app: no install, no server, no internet.
Type a model code (`RMX3310`, `iPhone15,3`, `SM-A035F`) and it resolves the model
name, offers the other market variants of the same phone, and — once you have
priced that model before — offers its specs back with one click.

## Files

```
index.html          the app — generated, don't hand-edit the data blocks
languages/          20 tag languages, 4 menu languages
devices/            model code → name, and Apple model numbers to exclude
fonts/              Google Sans, embedded into index.html at build time
tools/build.mjs     splices those into index.html
```

## Build

```bash
node tools/build.mjs          # rebuild index.html
node tools/build.mjs --check  # fail if index.html is stale
```

**Add a language** — copy `languages/ui/en.json`, translate it, add the code to
`languages/order.json`, rebuild. The build fails if any key is missing.

## Specs and origin

There is no spec file to maintain. Storage, RAM, battery, chipset and origin are
typed straight into the table, and the app remembers them against the model code
in the browser's own storage. Type that code again — in any row, any day — and it
offers what you entered last time. A code sold in two sizes keeps both, so you
pick the one in front of you. Nothing is ever filled in silently.

Every field except price and quantity also suggests values you have used before.

Origin is free text: put in whatever your customers ask about — `Thailand`,
`ZP/A`, `Korea, network locked`. An Apple part number fills it in on its own
(`MT952ZA/A` → `ZA`), because those letters are in the code you typed. No code is
ever translated into a country name: the published tables disagree with each
other and go stale — ZP moved from Hong Kong to South-East Asia, and LL covers
the USA, Canada and replacement units at once.

Chipset prints in a chip about 14.8mm wide, roughly 12 characters. `T606`,
`Helio G99`, `Exynos 1480` and `A17 Pro` fit whole; only Qualcomm and MediaTek
need shortening, e.g. `Snap 8 Elite` and `MTK D9300`.

## Notes

- Print at 100% scale. A tag is 64.67 × 70.25 mm.
- The tag typeface is bundled inside `index.html`, so every machine prints the
  same thing. Latin only — Lao, Thai, Khmer and the rest still use whatever the
  printing machine has installed.
- Apple A-numbers (`A1724`) collide with Android device codes, so they are
  excluded from lookup — use `iPhone15,3` or the part number on the box.

## Credits

| Source | Licence | Used for |
|---|---|---|
| [bsthen/device-models](https://github.com/bsthen/device-models) | Apache-2.0 | Android codes, from Google Play's supported-devices list |
| [apple-device-identifiers](https://github.com/kyle-seongwoo-jun/apple-device-identifiers) | MIT | Apple identifiers (`iPhone15,3`) |
| [List of iPhone models, Wikipedia](https://en.wikipedia.org/wiki/List_of_iPhone_models) | CC BY-SA 4.0 | the Apple A-numbers in `devices/apple-model-numbers.txt` |
| [Material Symbols](https://github.com/google/material-design-icons) | Apache-2.0 | the tag icons |
| [Google Sans](https://fonts.google.com/specimen/Google+Sans) | SIL OFL 1.1 | the tag typeface, bundled as base64 — see `fonts/` |

No specification data is shipped or scraped. What the app knows about a phone's
specs is what the shop typed into it.

## Licence

MIT — see [LICENSE](LICENSE). Third-party data keeps its own licence above.
