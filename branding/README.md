# Outside IR35 Jobs — Brand Assets

> Fleet convention: `~/Development/docs/BRAND-STORE-ASSETS.md`.

## Figma (canonical — one file)

**[Outside IR35 Jobs — Brand](https://www.figma.com/design/9FCEuclwJ0CRH6kV0ZcgTh)**

Pages: Logo Lockups · App Icons · Store Screenshots · Social.

Legacy (fold in, then archive):
- [App Icon](https://www.figma.com/design/FtLba74mG1WQytsa9sEWwH)
- [Facebook Cover](https://www.figma.com/design/i5ONaCpMD6BtEgBG9YW96k)

## App icon variants (Expo)

| File | Env |
|---|---|
| `apps/mobile/assets/images/icon.png` | production |
| `apps/mobile/assets/images/icon-preview.png` | preview → Internal (grid) |
| `apps/mobile/assets/images/icon-dev.png` | development → Dev (code) |

Also `adaptive-icon{,-preview,-dev}.png`. Regenerator:
`~/Development/Personal/scripts/generate-app-icon-variants.sh`

## Canonical assets

- `app-icon-1024.png`
- `fb-cover.png`
- `mark-dark.svg`
- `mark-light.svg`
