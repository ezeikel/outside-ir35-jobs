# Outside IR35 Jobs — Brand Assets

> Fleet convention: `~/Development/docs/BRAND-STORE-ASSETS.md`.

## Figma — **one file only**

**[Outside IR35 Jobs — Brand](https://www.figma.com/design/9FCEuclwJ0CRH6kV0ZcgTh)**

| Page | Contents |
|---|---|
| **Logo Lockups** | App icon + on-dark / white / mono marks; horizontal, stacked, wordmark |
| **App Icons** | Production / Internal (purple+grid) / Dev (teal+code) 1024² |
| **Store Screenshots** | (fill as needed) |
| **Social** | (fill as needed) |

### Type

| Role | Face | Notes |
|---|---|---|
| **Wordmark / display** | **Instrument Serif** (Regular) | Logo lockups, marketing headings — matches web `font-display` |
| UI / body | Inter Tight | App + web UI (not for wordmark) |
| Mono | Geist Mono | Optional data/code |

Do **not** set lockup wordmarks in Inter/Inter Bold — that was a scaffold mistake.

Legacy: App Icon + FB Cover files — fold then delete.

## App icon variants (Expo)

| File | Env | BG |
|---|---|---|
| `icon.png` | production | Brand store art |
| `icon-preview.png` | preview → Internal | Purple `#5B2C6F` + light grid |
| `icon-dev.png` | development → Dev | Teal `#0E6655` + large code |

Wired via `pickIcon` in mobile `app.config.ts`. Regenerator:
`~/Development/Personal/scripts/generate-app-icon-variants.sh`

## Repo exports

`branding/lockups/` — mark tiles exported for Figma.
