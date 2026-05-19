# Architecture

How the encyclopedia is shaped, how the pieces fit, and why they're shaped that way.

## The atom model

Three layers, one direction of dependency.

```
brands/   ─references─→  palettes/  and  fonts/
                              ↑
                         (independent atoms)
```

- **Palette atom** — a set of swatches (`{id, name, value, description}`) plus a `modes.light.roles` and `modes.dark.roles` map. Stands alone; reusable across brands. Lives at `palettes/<slug>/<semver>/atom.yaml`.
- **Font atom** — family + classification + weights + license + CDN URL, plus optional `variableAxes` for variable fonts. Stands alone. Lives at `fonts/<slug>/<semver>/atom.yaml`.
- **Brand atom** — references one palette and a set of fonts by `slug@version`, adds semantic role overrides (`primary`, `identity`, `on-identity`, `accent`, …), attaches structured assets (logos, favicons), and declares typed constraints (`rules`). Lives at `brands/<slug>/<semver>/brand.yaml`.

Atoms are addressable by `<slug>@<version>`. `slug@1` resolves to the latest 1.x; `slug@1.0.0` pins exactly. Semver is enforced.

## Schemas

All schemas live in `tools/schemas/` and are authored as Zod (TypeScript-first). The schema files are the contract:

- `palette.ts` — palette structure, swatch shape, mode/role map.
- `font.ts` — font structure, classification enum, variable-axes shape.
- `brand.ts` — brand structure, references, roles, asset variants, rules.
- `constraints.ts` — every rule type (`contrastRatio`, `colorChoice`, `forbiddenTreatment`, `enumMembership`, `fontPairing`, `accessibilityRequirement`, `contextRestriction`, `compositionConstraint`, `numericRange`, `numericRatio`, …).
- `provenance.ts` — provenance block (source, license, attribution, importedDate, notes).
- `common.ts` — shared primitives (Slug regex, SemverString, AtomReference, Mode).
- `atom.ts` — the kind discriminator.

A change to a schema is a change to the contract. Add a required field, expect every existing atom to be re-audited. The Zod schemas are deliberately strict; loose validation hides defects until they ship.

## Build pipeline

```
                          ┌──────────────────────┐
   palettes/*  ───────────│                      │
   fonts/*     ───────────│  tools/build.ts      │───→  dist/<kind>/<slug>/<version>/...
   brands/*    ───────────│  (resolver + emit)   │      dist/index.json
                          └──────────────────────┘
```

1. **Loader** (`tools/loader.ts`) walks `palettes/`, `fonts/`, and `brands/` and parses every YAML against the appropriate Zod schema. A failed parse fails the build.
2. **Resolver** (`tools/resolver.ts`) takes a brand atom and dereferences every `<slug>@<version>` reference into the actual palette + font atoms. The brand's role mapping is layered on top of the palette's mode role mapping. The output is a `ResolvedBrand` — a self-contained, fully-resolved spec.
3. **Emitters** (`tools/emitters/*.ts`) each take a `ResolvedBrand` and write a single output file. Currently nine emitters: `json`, `yaml` (via re-serialization), `w3c-tokens`, `css`, `scss`, `tailwind`, `figma`, `swift`, `kotlin`, `markdown`. Adding a new emitter is one file plus an entry in `emitters/index.ts`.
4. **Catalog index** (`buildCatalogIndex` in `tools/build.ts`) emits `dist/index.json` summarizing every brand, palette, and font — slug, version, name, tags, identity color. Consumers read this to discover what's available without fetching every atom.

The `validate` command stops at step 1. The `build` command runs all four steps.

## Output formats

Every brand emits to nine formats per version. Path shape:

```
dist/brands/<slug>/<version>/<emitter>/<file>
```

- `json/brand.json` — flat resolved JSON; agents and scripts.
- `yaml/brand.yaml` — same shape as the source.
- `w3c/tokens.json` + `tokens.light.json` + `tokens.dark.json` — W3C Design Tokens (DTCG spec).
- `css/tokens.css` — `--color-*` and `--font-*` custom properties on `:root` with `prefers-color-scheme`.
- `scss/_tokens.scss` — `$brand-*` SCSS variables, full role set including light/dark variants.
- `tailwind/tailwind.config.cjs` — `swatch.*` and `brand.*` color nests for `bg-brand-primary`-style utilities.
- `figma/tokens.json` — Figma-flavored tokens (Tokens Studio compatible).
- `swift/BrandTokens.swift` — `UIColor` extensions for iOS.
- `kotlin/BrandTokens.kt` — typed color constants for Android.
- `markdown/brand-guide.md` — a human-readable brand guide rendered from the atom.

The emitter contract: take a `ResolvedBrand`, return `{path, content}`. Stateless, side-effect-free, test-friendly. Multi-file emitters (w3c/tokens emits three files) return an array.

## Site (`web/`)

[Astro](https://astro.build) static site, deployed to Cloudflare Pages. Source of truth for the production deploy is `main` — every push to `main` triggers the `deploy` workflow.

- `web/src/pages/` — page routes (Brands, Palettes, Fonts, Builder, Install, How to use, Request a brand).
- `web/src/layouts/Layout.astro` — global shell; CSS variables driven by the resolved `convergent-systems` brand so a change there flows through.
- `web/src/lib/encyclopedia.ts` — loads atoms server-side at build time. The site is a static build of the catalog as it existed at deploy time; new atoms ship on the next deploy.
- `web/public/dist/` — symlinked to the root `dist/` so atoms are served at `brand-atoms.com/dist/...` matching the documented HTTP-fetch paths.
- `web/public/_redirects` — Cloudflare Pages redirects (e.g., `/instructions → /install 308`).

## CLI (`src/brandatom/`)

Go binary, distributed via Homebrew (`convergent-systems-co/homebrew-tap`) and Scoop (`convergent-systems-co/scoop-bucket`).

```
src/brandatom/
├── cmd/brandatom/main.go      # entry point; dispatches subcommands
├── internal/list/             # `brands list`, `palettes list`, `fonts list` + specimens
├── internal/apply/            # `brand <slug>@<v> apply` — project-shape detection + emitters
├── internal/client/           # HTTP client against brand-atoms.com/dist/
└── internal/config/           # ANSI, --no-color, base-url override
```

The `apply` subcommand inspects the current directory and chooses an emitter:

| Detected                              | Emitter                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `tailwind.config.{js,ts,mjs,cjs}`     | Inject a `brandatom:` color block into `theme.extend.colors`       |
| `*.xcodeproj`                         | Write a `Brand.swift` next to the project with `UIColor` constants |
| `app/src/main/AndroidManifest.xml`    | Write `app/src/main/res/values/brand-atoms.xml`                    |
| `package.json` / top-level HTML / CSS | Write `brand-atoms.css` with custom-property tokens                |

The CLI's HTTP client fetches resolved atoms from the same `dist/` URLs documented on `/install` — there is no second API. The CLI is a convenience wrapper over the same endpoint humans curl.

## CI / deploy

Three workflows under `.github/workflows/`:

- **`validate`** — runs on every push and PR to `main`. `pnpm install --frozen-lockfile`, `pnpm validate`, `pnpm lint`, `pnpm test`.
- **`deploy`** — runs on push to `main`. Validates, builds the catalog (`pnpm build`), builds the Astro site (`cd web && pnpm build`), pushes to Cloudflare Pages via `wrangler pages deploy`. Auto-deploy means a merged PR is in production in roughly a minute.
- **`brandatom-release`** — runs on tag push (`brandatom-v*`). Cross-compiles the CLI for Linux/macOS/Windows × amd64/arm64, cuts a GitHub release with binaries + checksums, publishes the rendered Homebrew formula and Scoop manifest to their taps (when `PACKAGE_PUBLISH_TOKEN` is set).

All workflows force JavaScript-based actions onto Node 24 via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` at workflow-env level, ahead of the 2026-06-02 Node 20 deprecation on GitHub Actions runners. The job runtime stays on Node 22.

## Distribution

The catalog ships through four channels, each with its own latency and rebuild story:

1. **`dist/` over HTTPS** at `brand-atoms.com/dist/...` — fastest update path (one deploy = ~60s to global edge via Cloudflare).
2. **`brandatom` CLI** via Homebrew / Scoop — released on demand by pushing a `brandatom-v*` tag. Consumers `brew upgrade brandatom` to get a new version.
3. **GitHub repo** as the source-of-truth, for anyone who wants to vendor the YAML directly.
4. **Catalog index** at `dist/index.json` — the discovery endpoint; lists every atom with version, slug, identity color, and key counts.

## Roles and modes — the role map you'll see in atoms

Palette atoms expose swatches; brand atoms map those swatches to **roles**. The role vocabulary is the contract that emitters and consumers agree on. Standard roles:

**Color roles** (mapped per mode in palette `modes.light.roles` / `modes.dark.roles`):
`background`, `surface`, `surface-elevated`, `text-primary`, `text-secondary`, `text-tertiary`, `primary`, `primary-hover`, `accent`, `accent-hover`, `warning`, `warning-hover`, `error`, `success`, `border`.

**Brand-level role overrides** (in `brand.roles.colors`, augmenting the palette):
`identity`, `on-identity`, `mark`, plus `*-light` / `*-dark` variants where a single-mode override is needed. `identity` is the canvas the brand-badge sits on; `on-identity` is the contrasting ink. Every brand must declare both.

**Typography roles** (`brand.roles.typography` mapping to keys in `brand.references.fonts`):
`display`, `prose`, `code`.

Consumers — including AI agents — pick a role, not a swatch ID, when generating in-brand output. The role is stable across versions and modes; the swatch can drift.

## Versioning

- **Atoms** use SemVer. A breaking change (renamed role, removed swatch, changed token semantics) bumps major. New optional fields bump minor. Hex corrections without semantic change bump patch.
- **Schemas** evolve with deprecation cycles. Adding a required field to the schema requires backfilling existing atoms in the same PR or accepting a CI break.
- **Emitters** version with the converter package. A change to emitter output that affects consumers is a `BREAKING:` commit with a changelog entry.

## What this architecture deliberately is not

- **Not a CDN of marks.** We don't redistribute third-party logos. Consumers fetch marks from the brand's own sources. The atom encodes the rules around the mark, not the mark.
- **Not a runtime resolver.** Resolution happens at build time. Consumers fetch already-resolved output. No second resolver to run in production.
- **Not a design-tool integration.** The W3C Tokens and Figma emitters are interchange formats. Plugins live in their respective ecosystems, not in this repo.
- **Not an AI judgment layer.** The rules are typed and mechanical. An agent that respects every rule produces in-brand output deterministically. Aesthetic decisions are encoded as rules; if a rule can't be expressed, it doesn't ship.
