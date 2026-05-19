# Brand Atoms

A civilization-grade encyclopedia of branding — typed palettes, fonts, brands, and constraints, consumed by AI agents and humans to produce on-brand output.

- **Live:** [brand-atoms.com](https://brand-atoms.com)
- **CDN index:** [brand-atoms.com/dist/index.json](https://brand-atoms.com/dist/index.json)
- **CLI:** `brandatom` — brew + scoop installs available
- **License:** MIT (code) · individual brand atoms note their own trademark provenance

## What this is

Every palette, font, and brand is a typed YAML file with verifiable provenance. A build step validates each atom against a Zod schema and emits nine output formats per brand: YAML, JSON, W3C Design Tokens, CSS variables, SCSS, Tailwind config, Figma tokens, Swift, Kotlin, and a human-readable Markdown brand guide.

The same source feeds:

- **AI agents** that need a machine-readable contract to render in-brand output.
- **Humans** browsing a reference, composing a new brand in the builder, or pulling tokens into their toolchain.

## Quick start

**Install the CLI:**

```sh
brew install convergent-systems-co/tap/brandatom
# or on Windows:
scoop bucket add convergent-systems-co https://github.com/convergent-systems-co/scoop-bucket
scoop install brandatom
```

**Browse from the terminal:**

```sh
brandatom brands list
brandatom brand anthropic@1.0.0 show | jq .
```

**Apply a brand to your project:**

```sh
cd my-tailwind-app
brandatom brand anthropic@1.0.0 apply
```

**Or fetch directly over HTTP — no install:**

```sh
curl https://brand-atoms.com/dist/brands/anthropic/1.0.0/css/tokens.css
```

For every consumer pattern (Next.js, vanilla CSS, iOS, Android, Figma, Style Dictionary, SCSS, …) see [How to use](https://brand-atoms.com/how-to-use).

## What's in the catalog

The live counts are at `dist/index.json`. As of this writing the catalog covers brands across consumer products, enterprise SaaS, AI labs, design-system foundations, gaming, news, music, education, universities, government / civic identities, and OSS foundations. Each brand declares at least five typed-constraint rules grounded in published guidance.

## Repo layout

```
.
├── brands/<slug>/<version>/brand.yaml      # brand atoms — palette + fonts + roles + rules
├── palettes/<slug>/<version>/atom.yaml     # palette atoms — swatches + light/dark modes
├── fonts/<slug>/<version>/atom.yaml        # font atoms — family + weights + CDN URLs
├── tools/                                   # converter / validator / emitters (TypeScript)
│   ├── schemas/                            # Zod schemas — the contract
│   ├── emitters/                           # nine output emitters
│   └── validate.ts / build.ts              # CI entry points
├── src/brandatom/                          # Go CLI
├── web/                                    # Astro site (brand-atoms.com)
└── dist/                                   # emitter output — generated, also published as a CDN
```

For more depth, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

The catalog grows by typed YAML diffs. To add a brand, palette, or font:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) — required reading covers the schema, provenance, and trademark policy.
2. Author the atom under the appropriate `brands/` / `palettes/` / `fonts/` directory.
3. Run `pnpm validate` locally; open a PR; CI runs validate on every push and deploys on merge.

Don't want to author yourself? Open a brand request at [/request-brand](https://brand-atoms.com/request-brand) — a maintainer triages by hand.

## Security

See [SECURITY.md](./SECURITY.md). Vulnerabilities go to the maintainers privately; do not file public issues for them.

## Status & roadmap

[HANDOFF.md](./HANDOFF.md) is the living roadmap: what's shipped, what's in flight, what's known-broken. Read it before you start non-trivial work.
