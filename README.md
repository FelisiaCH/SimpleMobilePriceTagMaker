# Simple Mobile Price Tag Maker

Offline A4 price tag sheets for a phone shop — 12 tags per page.

Open `index.html`. That is the whole app: no install, no server, no internet.
Type a model code (`RMX3310`, `iPhone15,3`, `MT9Q2TH/A`) and it resolves the model
name and offers any specs you have saved.

## Files

```
index.html          the app — generated, don't hand-edit the data blocks
languages/          20 tag languages, 4 menu languages
devices/            model code → name, plus your own specs
tools/build.mjs     splices languages/ and devices/ into index.html
```

## Build

```bash
node tools/build.mjs          # rebuild index.html
node tools/build.mjs --check  # fail if index.html is stale
```

**Add a language** — copy `languages/ui/en.json`, translate it, add the code to
`languages/order.json`, rebuild. The build fails if any key is missing.

**Add specs** — fill in `devices/specs.tsv` (format is in its header). One code can
have several rows for different storage sizes or regions; the app shows them as
buttons and never fills a field on its own.

## Notes

- Print at 100 % scale. A tag is 64.67 × 70.25 mm.
- Apple A-numbers (`A1724`) collide with Android device codes, so they are excluded
  from lookup — use `iPhone15,3` or the part number on the box.

## Credits

| Source | Licence | Used for |
|---|---|---|
| [bsthen/device-models](https://github.com/bsthen/device-models) | Apache-2.0 | Android codes, from Google Play's supported-devices list |
| [apple-device-identifiers](https://github.com/kyle-seongwoo-jun/apple-device-identifiers) | MIT | Apple identifiers (`iPhone15,3`) |
| [List of iPhone models, Wikipedia](https://en.wikipedia.org/wiki/List_of_iPhone_models) | CC BY-SA 4.0 | Apple A-number list |
| [Material Symbols](https://github.com/google/material-design-icons) | Apache-2.0 | `storefront` fallback icon |

Specs in `devices/specs.tsv` are entered by the shop, not scraped.

## Licence

MIT — see [LICENSE](LICENSE). Third-party data keeps its own licence above.
