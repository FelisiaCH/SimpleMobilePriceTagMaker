# Simple Mobile Price Tag Maker

Offline A4 price tag sheets for a phone shop — 12 tags per page.

Open `index.html`. That is the whole app: no install, no server, no internet.
Type a model code (`RMX3310`, `iPhone15,3`, `SM-A035F`) and it resolves the model
name, offers the other market variants of the same phone, and — once you have
priced that model before — offers its specs back with one click.

20 languages for the printed tag and 20 for the editor. Starts in English with
USD.

## Files

```
index.html          the app — generated, don't hand-edit the data blocks
languages/<code>/   tag.json (printed on the tag) + ui.json (the editor)
devices/            model code → name, and Apple model numbers to exclude
fonts/              Google Sans, embedded into index.html at build time
icons/              brand marks for the contact badges
tools/build.mjs     splices all of that into index.html
```

## Build

```bash
node tools/build.mjs          # rebuild index.html
node tools/build.mjs --check  # fail if index.html is stale
```

**Add a language** — copy any folder in `languages/`, translate both files, add
the code to `languages/order.json`. The build fails if a key is missing or extra,
so a half-finished translation cannot ship as blank labels.

## Specs

There is no spec file to maintain. Storage, RAM, battery and chipset are typed
straight into the table, and the app remembers them against the model code in the
browser's own storage. Type that code again — in any row, any day — and it offers
what you entered last time. A code sold in two sizes keeps both, so you pick the
one in front of you. Nothing is ever filled in silently.

Every field except price and quantity also suggests values you have used before.

Chipset prints in a chip about 14.8 mm wide, roughly 12 characters. `T606`,
`Helio G99`, `Exynos 1480` and `A17 Pro` fit whole; only Qualcomm and MediaTek
need shortening, e.g. `Snap 8 Elite` and `MTK D9300`.

## Notes

- Print at 100% scale. A tag is 64.67 × 70.25 mm. Verified on paper.
- The tag typeface is bundled inside `index.html`, so every machine prints the
  same thing. Latin only — other scripts use whatever the printing machine has.
- Apple A-numbers (`A1724`) collide with Android device codes, so they are
  excluded from lookup — use `iPhone15,3` or the part number on the box.

## Credits

| Source | Licence | Used for |
|---|---|---|
| [bsthen/device-models](https://github.com/bsthen/device-models) | Apache-2.0 | 18,721 Android codes — itself a transform of Google Play's public supported-devices list |
| [apple-device-identifiers](https://github.com/kyle-seongwoo-jun/apple-device-identifiers) | MIT | 62 Apple identifiers (`iPhone15,3`) |
| [List of iPhone models, Wikipedia](https://en.wikipedia.org/wiki/List_of_iPhone_models) | CC BY-SA 4.0 | 199 Apple A-numbers, used only to exclude them — `devices/apple-model-numbers.txt` |
| [Simple Icons](https://simpleicons.org) | CC0 1.0 | 14 contact brand marks and their brand colours — `icons/` |
| [Material Symbols](https://github.com/google/material-design-icons) | Apache-2.0 | 2 icons: the shop mark and the chipset chip |
| [Google Sans](https://fonts.google.com/specimen/Google+Sans) | SIL OFL 1.1 | the tag typeface — `fonts/` |

The storage, RAM and battery icons are drawn for this project.

No specification data is shipped or scraped. What the app knows about a phone's
specs is what the shop typed into it.

Brand names and logos are trademarks of their owners and appear only to identify
which messaging service a shop's contact belongs to.

## Licence

MIT — see [LICENSE](LICENSE). Third-party data and assets keep their own licences
above.
