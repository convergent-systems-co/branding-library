# Contributing

Every contribution is a typed YAML diff. The schema validates at build time; a bad atom fails CI. Read this once and you should rarely have to fight the toolchain again.

## Before you start

- Skim [ARCHITECTURE.md](./ARCHITECTURE.md) for the atom model, role vocabulary, and emitter contract.
- The canonical reference shape lives at `brands/anthropic/1.0.0/brand.yaml` + `palettes/anthropic/1.0.0/atom.yaml`. New atoms should mirror its field order, comment style, and provenance discipline.
- All schemas live in `tools/schemas/` (Zod). When in doubt, read the schema — it's the contract.

## Local setup

Requires Node 20+ and `pnpm` 9+.

```sh
pnpm install
pnpm validate     # all atoms against the schema
pnpm build        # render dist/ for every brand × emitter
pnpm test         # workflow assertions
cd web && pnpm dev    # local preview at http://localhost:4321
```

Validate before opening a PR. The CI runs the same command; failures here mean failures there.

## Adding a palette atom

Path: `palettes/<slug>/<version>/atom.yaml`. Version starts at `1.0.0`. Slug is lowercase-hyphenated and starts with a letter.

Required keys (see `tools/schemas/palette.ts` for the authoritative definition):

- `kind: palette`
- `id`, `version`, `name`, `description`, `tags`
- `provenance`: source URL (must resolve to a real page you fetched), license, attribution, importedDate
- `swatches`: array of `{id, name, value, description}` — every hex MUST come from a real source. No invented colors.
- `modes.light.roles` and `modes.dark.roles` — both required, even when the brand is single-mode. Map role names (`background`, `surface`, `text-primary`, `primary`, `accent`, `warning`, `error`, `success`, `border`, …) to swatch IDs.

If you discover a brand that's already published a palette upstream (e.g., Tailwind, IBM Carbon, Material), capture the canonical hex values verbatim and cite the source-of-truth URL.

## Adding a font atom

Path: `fonts/<slug>/<version>/atom.yaml`. See `tools/schemas/font.ts`.

Required keys: `kind: font`, `id`, `version`, `name`, `family`, `classification`, `weights`, `provenance`, `license`, `cdnUrl`. For variable fonts, also include `variableAxes`.

Substitution rule — when a brand uses a proprietary face that isn't publicly distributed, do NOT author a fake atom for it. Use an existing open-source substitute (`inter@1`, `merriweather@1`, `jetbrainsmono-nerdfont@1`, …) and document the proprietary primary in the brand atom's `provenance.notes`.

## Adding a brand atom

Path: `brands/<slug>/<version>/brand.yaml`. Start at `1.0.0`. See `tools/schemas/brand.ts`.

Required:

- `id`, `version`, `name`, `description`, `tags`
- `provenance`: source URL, license, attribution, importedDate, optional notes
- `references.palette`: `<slug>@<version>` of an atom that exists in `palettes/`
- `references.fonts`: at minimum `heading`, `body`, `mono` keys pointing to font atoms
- `roles.colors`: MUST declare `identity` and `on-identity` plus the usual semantic set (`primary`, `accent`, `mark`, `success`, `warning`, `error`, plus text + background + surface families for light and dark)
- `roles.typography`: map of `display`, `prose`, `code` to font role keys
- `assets: []` — see "Trademark policy" below
- `rules`: at least **five** typed constraints. Each rule has `type`, `target`, parameters, `severity`, and `rationale`. The rationale must reference the source — no hand-wavy justifications.

### Rule types you'll use most

`contrastRatio`, `colorChoice`, `forbiddenTreatment`, `enumMembership`, `fontPairing`, `accessibilityRequirement`, `contextRestriction`, `compositionConstraint`, `numericRange`, `numericRatio`. See `tools/schemas/constraints.ts` for the full list and parameters.

### Provenance discipline

- `source` URL MUST be a page you actually fetched. If the documented brand-guide page is unreachable (403, 404, datadome, dynamic SPA), fall back to the homepage and note in `provenance.notes`:
  `Derived from live site CSS at <url> on <YYYY-MM-DD>; published brand guide unavailable.`
- Cross-reference with simple-icons, wikimedia commons, or open-source design-system mirrors when the brand's own page is policy-only and ships no hex values.
- `importedDate` captures the snapshot moment — the source can drift, the date pins what was true.

### Trademark policy

Every non-Convergent-Systems brand atom uses `assets: []`. We do not redistribute third-party logos or marks. Consumers are expected to pull marks from the brand's official sources; the atom encodes the rules and tokens around the mark, not the mark itself. The atom citing a brand's trademark policy is the discipline; the atom shipping the mark is the defect.

Convergent-Systems-owned atoms (jmfe, jma-group, jm-lexus, set-finance, set-distributors, world-omni, toyota under SET, etc.) MAY ship assets where the principal authorizes it.

## Adding a shell brand composition

Path: `brands/shell/<slug>.yaml`. Slug is lowercase-hyphenated, starts with a letter. The fastest path to contribution: fork an existing shell brand (e.g., `brands/shell/nord.yaml`) and adapt it.

Required fields:

```yaml
id: <your-slug>                    # lowercase, hyphens only; matches filename stem
name: <Human Readable Name>
version: 1.0.0
description: <one sentence>
base_brand: <base brand id>        # optional — omit if fully standalone
prompt_symbol: "❯"                 # your preferred prompt character
separator_char: ""                 # Powerline glyph, plain "›", or "" for none
ansi_256_support: true
truecolor_support: true
role_bindings:
  primary: "#rrggbb"               # active prompt, cwd — all hex MUST be lowercase
  accent: "#rrggbb"                # git branch, highlights
  error: "#rrggbb"                 # non-zero exit, errors
  warning: "#rrggbb"               # dirty git state, stash indicator
  success: "#rrggbb"               # clean state, zero exit
  muted: "#rrggbb"                 # timestamps, secondary info
tags: [<your-theme-name>, dark]    # or light
license: <license>                 # MIT, Apache-2.0, etc.
```

Rules:

- All hex values MUST be lowercase (`#rrggbb`, not `#RRGGBB`).
- Every required `role_bindings` key is mandatory — no omissions.
- `base_brand` must reference a slug that exists in `brands/<slug>/`.
- `id` must match the filename stem exactly.

## PR workflow

1. `pnpm validate && pnpm build && pnpm test` locally — all must be green.
2. Single logical change per commit. Conventional Commit prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`. Catalog additions use `feat(brands):` / `feat(palettes):` / `feat(fonts):` / `feat(brands/shell):`.
3. Don't bundle a refactor and a brand addition in one commit. Don't bundle five unrelated brand additions either — one cluster per commit is the discipline.
4. PR description names what changed, why, and how to verify. Link the issue if one exists.
5. Merge to `main` triggers an auto-deploy to brand-atoms.com.

## Common review failures

- **Fabricated hex values.** Every color must trace to a fetched page. If the brand-guide URL is unreachable, document the fallback — don't fake the citation.
- **Fewer than 5 rules.** The five-rule floor is a quality gate, not a suggestion.
- **Missing identity role.** Every brand declares `roles.colors.identity` AND `roles.colors.on-identity` — even light-first brands.
- **No dark mode.** `modes.dark.roles` is required on every palette, not optional. Author a defensible dark variant even for a light-first brand.
- **`assets: []` violated** on a non-Convergent-Systems brand without explicit authorization.
- **Slug doesn't match the schema regex.** Lowercase letters, digits, and hyphens; must start with a letter. `37signals` → `thirty-seven-signals` (real example).
- **Uppercase hex in shell brand.** All `role_bindings` hex values must be lowercase. `#88C0D0` → `#88c0d0`.
- **Missing role_bindings key in shell brand.** All six keys (`primary`, `accent`, `error`, `warning`, `success`, `muted`) are required.
- **Shell brand `id` doesn't match filename.** `id: nord` must live at `brands/shell/nord.yaml`.

## When to open an issue instead of a PR

- You found a brand that should exist but you can't author it yourself: open a Brand Request at [/request-brand](https://brand-atoms.com/request-brand). A maintainer triages.
- You found a bug in the schema, emitter, or CLI: open an issue at `convergent-systems-co/branding-library/issues/new`.
- You found a wrong hex value or stale provenance: open an issue or a one-commit PR — both are welcome.

## Decisions logged in HANDOFF.md

The living roadmap at [HANDOFF.md](./HANDOFF.md) is hand-curated. Significant decisions land there with a date and a one-sentence rationale. Read it before you start non-trivial work; update it when your work changes the shape of the catalog or the roadmap.
