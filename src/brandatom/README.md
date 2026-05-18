# brandatom

A command-line client for [brand-atoms.com](https://brand-atoms.com) — the
encyclopedia of brands, palettes, and fonts. `brandatom` lets you browse the
catalog from a terminal and apply a brand to your local project (Tailwind,
Xcode, Android, or vanilla web) with one command.

## Install

### Homebrew (macOS, Linux)

Once the formula has been merged into the convergent-systems-co tap:

```sh
brew install convergent-systems-co/tap/brandatom
```

### Scoop (Windows)

Once the manifest has been merged into the convergent-systems-co bucket:

```sh
scoop bucket add convergent-systems-co https://github.com/convergent-systems-co/scoop-bucket
scoop install brandatom
```

### Build from source

Requires Go 1.22 or newer.

```sh
git clone https://github.com/convergent-systems-co/branding-library
cd branding-library/src/brandatom
go build -o brandatom ./cmd/brandatom
./brandatom --version
```

## Usage

### Browse the catalog

```sh
brandatom brands list      # every brand, with identity/primary/accent swatches
brandatom palettes list    # every palette, with preview swatches
brandatom fonts list       # every font, with specimen line and weight range
```

Each list command supports `--json` for machine-readable output:

```sh
brandatom brands list --json | jq '.[].slug'
```

### Inspect a single brand

```sh
brandatom brand convergent-systems@1.0.0 show
```

Streams the resolved `brand.json` (palette + fonts + roles + rules) to
stdout. Pipe it through `jq` or save it for offline use.

### Apply a brand to the current project

```sh
brandatom brand convergent-systems@1.0.0 apply
```

`brandatom` looks at the current directory and chooses an emitter:

| Detected                              | Emitter                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `tailwind.config.{js,ts,mjs,cjs}`     | Inject a `brandatom:` color block into `theme.extend.colors`       |
| `*.xcodeproj`                         | Write a `Brand.swift` next to the project with `UIColor` constants |
| `app/src/main/AndroidManifest.xml`    | Write `app/src/main/res/values/brand-atoms.xml`                    |
| `package.json` / top-level HTML / CSS | Write `brand-atoms.css` with custom-property tokens                |

Flags:

- `--dry-run` — print the planned write (and, for Tailwind, a unified
  diff) without touching the filesystem.
- `--force` — skip prompts on existing files.
- `--format <name>` — force a specific emitter, skipping detection:
  `css`, `tailwind`, `swift`, `android`.

### Global flags

- `--base-url <url>` — override the encyclopedia host (default
  `https://brand-atoms.com`). Use this to point at a local
  `python3 -m http.server` during development.
- `--no-color` — disable ANSI output. Also honored: the `NO_COLOR`
  environment variable.
- `-V`, `--version` — print the version.
- `-h`, `--help` — print help.

### Exit codes

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| 0    | success                                                  |
| 1    | generic error                                            |
| 2    | not found (brand doesn't exist in the catalog)           |
| 3    | detection failure on apply (no recognized project shape) |

## Related

- [brand-atoms.com](https://brand-atoms.com) — the encyclopedia
- [convergent-systems-co/branding-library](https://github.com/convergent-systems-co/branding-library)
  — the source repo for everything: data, build tooling, the Astro site,
  and this CLI

## License

MIT. See the repo root for the full text.
