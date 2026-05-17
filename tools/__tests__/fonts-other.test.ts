import assert from 'node:assert/strict';
/**
 * Acceptance tests for Issue #14 — ~20 foundry-family + extra Nerd Font atoms.
 *
 * Each new atom must:
 *  1. Exist at fonts/<slug>/<version>/atom.yaml.
 *  2. Parse against the Font schema.
 *  3. Have the expected classification.
 *  4. Carry a real SPDX license (not a placeholder).
 *  5. Carry a non-empty, non-placeholder attribution.
 *  6. Point provenance.source at github.com (the canonical upstream).
 *  7. Have a fallbackStack of length ≥ 3 ending in a generic CSS family.
 *  8. Declare ≥ 1 availableStyles entry.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse as parseYaml } from 'yaml';
import { Font } from '../schemas/font.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const FONTS_DIR = join(REPO_ROOT, 'fonts');

type Expected = {
  slug: string;
  version: string;
  classification: 'serif' | 'sans-serif' | 'monospace';
  family: string;
  licenseSpdx: RegExp; // matches the recorded provenance.license string
};

const ALLOWED_LICENSE_RE =
  /^(OFL-1\.1|Apache-2\.0|MIT|\(OFL-1\.1 AND MIT\)|\(Apache-2\.0 AND MIT\))$/;

const GENERIC_CSS_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
]);

const PLACEHOLDER_RE = /\b(todo|fixme|placeholder|lorem ipsum|xxx|example\.com)\b/i;

const expected: Expected[] = [
  // T1 — IBM Plex + Adobe Source
  {
    slug: 'ibm-plex-sans',
    version: '1.0.0',
    classification: 'sans-serif',
    family: 'IBM Plex Sans',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'ibm-plex-sans-condensed',
    version: '1.0.0',
    classification: 'sans-serif',
    family: 'IBM Plex Sans Condensed',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'ibm-plex-serif',
    version: '1.0.0',
    classification: 'serif',
    family: 'IBM Plex Serif',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'ibm-plex-mono',
    version: '1.0.0',
    classification: 'monospace',
    family: 'IBM Plex Mono',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'source-sans-3',
    version: '3.0.52',
    classification: 'sans-serif',
    family: 'Source Sans 3',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'source-serif-4',
    version: '4.0.5',
    classification: 'serif',
    family: 'Source Serif 4',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'source-code-pro',
    version: '2.42.0',
    classification: 'monospace',
    family: 'Source Code Pro',
    licenseSpdx: /^OFL-1\.1$/,
  },

  // T2 — Mozilla Fira + other open-source
  {
    slug: 'fira-sans',
    version: '4.3.0',
    classification: 'sans-serif',
    family: 'Fira Sans',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'fira-sans-condensed',
    version: '4.3.0',
    classification: 'sans-serif',
    family: 'Fira Sans Condensed',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'fira-mono',
    version: '3.2.0',
    classification: 'monospace',
    family: 'Fira Mono',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'manrope',
    version: '4.5.0',
    classification: 'sans-serif',
    family: 'Manrope',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'plus-jakarta-sans',
    version: '1.0.5',
    classification: 'sans-serif',
    family: 'Plus Jakarta Sans',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'public-sans',
    version: '2.1.0',
    classification: 'sans-serif',
    family: 'Public Sans',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'work-sans',
    version: '2.0.0',
    classification: 'sans-serif',
    family: 'Work Sans',
    licenseSpdx: /^OFL-1\.1$/,
  },
  {
    slug: 'crimson-pro',
    version: '2.0.0',
    classification: 'serif',
    family: 'Crimson Pro',
    licenseSpdx: /^OFL-1\.1$/,
  },

  // T3 — Extra Nerd Fonts
  {
    slug: 'iosevka-nerdfont',
    version: '1.0.0',
    classification: 'monospace',
    family: 'Iosevka Nerd Font',
    licenseSpdx: /^\(OFL-1\.1 AND MIT\)$/,
  },
  {
    slug: 'meslo-nerdfont',
    version: '1.0.0',
    classification: 'monospace',
    family: 'MesloLGS Nerd Font',
    licenseSpdx: /^\(Apache-2\.0 AND MIT\)$/,
  },
  {
    slug: 'mononoki-nerdfont',
    version: '1.0.0',
    classification: 'monospace',
    family: 'Mononoki Nerd Font',
    licenseSpdx: /^\(OFL-1\.1 AND MIT\)$/,
  },
  {
    slug: 'robotomono-nerdfont',
    version: '1.0.0',
    classification: 'monospace',
    family: 'RobotoMono Nerd Font',
    licenseSpdx: /^\(Apache-2\.0 AND MIT\)$/,
  },
];

for (const e of expected) {
  test(`fonts-other: ${e.slug}@${e.version} — atom.yaml exists and parses`, () => {
    const path = join(FONTS_DIR, e.slug, e.version, 'atom.yaml');
    const raw = readFileSync(path, 'utf8');
    const parsed = parseYaml(raw);
    const result = Font.safeParse(parsed);
    assert.equal(
      result.success,
      true,
      result.success ? '' : JSON.stringify(result.error.issues, null, 2),
    );
    if (!result.success) return;

    assert.equal(result.data.id, e.slug, 'id matches slug');
    assert.equal(result.data.version, e.version, 'version matches');
    assert.equal(result.data.family, e.family, 'family matches');
    assert.equal(result.data.classification, e.classification, 'classification matches');

    // Provenance must be real
    assert.ok(result.data.provenance, 'has provenance block');
    const p = result.data.provenance;
    assert.ok(p.license, 'has license');
    assert.match(p.license, ALLOWED_LICENSE_RE, `license "${p.license}" is allowed SPDX`);
    assert.match(p.license, e.licenseSpdx, `license matches expected for ${e.slug}`);

    assert.ok(p.attribution, 'has attribution');
    assert.ok(p.attribution.trim().length > 10, 'attribution is non-trivial');
    assert.ok(!PLACEHOLDER_RE.test(p.attribution), 'attribution has no placeholder markers');

    assert.ok(p.source, 'has provenance.source');
    assert.ok(
      p.source.startsWith('https://github.com/'),
      `provenance.source "${p.source}" points at github.com`,
    );

    assert.ok(p.importedDate, 'has importedDate');
    assert.ok(p.importedFromVersion, 'has importedFromVersion');

    // fallbackStack: ≥ 3, ends with a generic family
    assert.ok(result.data.fallbackStack.length >= 3, 'fallbackStack has ≥ 3 entries');
    const last = result.data.fallbackStack[result.data.fallbackStack.length - 1];
    assert.ok(
      last && GENERIC_CSS_FAMILIES.has(last),
      `fallbackStack ends with a generic CSS family (got "${last}")`,
    );

    // availableStyles: ≥ 1
    assert.ok(result.data.availableStyles.length >= 1, 'has ≥ 1 availableStyles entry');

    // tags non-placeholder
    for (const tag of result.data.tags) {
      assert.ok(!PLACEHOLDER_RE.test(tag), `tag "${tag}" not a placeholder`);
    }
  });
}

test('fonts-other: no duplicate slug+version with pre-existing atoms', () => {
  const newSlugs = new Set(expected.map((e) => `${e.slug}@${e.version}`));
  const preExisting = [
    'inter@1.0.0',
    'firacode-nerdfont@1.0.0',
    'jetbrainsmono-nerdfont@1.0.0',
    'hack-nerdfont@1.0.0',
    'cascadiacode-nerdfont@1.0.0',
  ];
  for (const p of preExisting) {
    assert.ok(!newSlugs.has(p), `new atom set does not collide with ${p}`);
  }
});
