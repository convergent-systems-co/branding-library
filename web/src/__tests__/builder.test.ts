import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { composeBrand, toBrandDefinitionYaml } from '../lib/composeBrand.js';
import { emitters } from '../../../tools/emitters/index.js';
import { fixtureBrand } from './fixtures/brand.js';

const atoms = {
  palettes: [
    {
      slug: fixtureBrand.palette.slug,
      version: fixtureBrand.palette.resolvedVersion,
      data: fixtureBrand.palette.data,
    },
  ],
  fonts: fixtureBrand.fonts.map((f) => ({
    slug: f.slug,
    version: f.resolvedVersion,
    data: f.data,
  })),
};

describe('composeBrand', () => {
  it('produces a ResolvedBrand-shaped object from atom payload + selections', () => {
    const composed = composeBrand({
      id: 'custom-brand',
      version: '0.1.0',
      name: 'Custom Brand',
      paletteSlug: atoms.palettes[0]!.slug,
      headingSlug: atoms.fonts[0]!.slug,
      bodySlug: atoms.fonts[1]!.slug,
      monoSlug: atoms.fonts[2]!.slug,
      atoms,
    });
    expect(composed).not.toBeNull();
    expect(composed!.id).toBe('custom-brand');
    expect(composed!.palette.slug).toBe(atoms.palettes[0]!.slug);
    expect(composed!.fonts).toHaveLength(3);
    const roles = composed!.fonts.map((f) => f.role).sort();
    expect(roles).toEqual(['body', 'heading', 'mono']);
  });

  it('runs every one of the 9 emitters against a composed brand', () => {
    const composed = composeBrand({
      id: 'custom-brand',
      version: '0.1.0',
      name: 'Custom Brand',
      paletteSlug: atoms.palettes[0]!.slug,
      headingSlug: atoms.fonts[0]!.slug,
      bodySlug: atoms.fonts[1]!.slug,
      monoSlug: atoms.fonts[2]!.slug,
      atoms,
    })!;

    let totalFiles = 0;
    for (const emitter of emitters) {
      const files = emitter.emit(composed);
      expect(files.length, `emitter ${emitter.name} produced no files`).toBeGreaterThan(0);
      for (const f of files) {
        expect(f.contents.length, `emitter ${emitter.name} produced empty file ${f.path}`).toBeGreaterThan(0);
      }
      totalFiles += files.length;
    }
    expect(totalFiles).toBe(11);
  });
});

describe('toBrandDefinitionYaml', () => {
  it('produces a non-empty YAML string matching the Brand schema', () => {
    const yaml = toBrandDefinitionYaml({
      id: 'custom-brand',
      version: '0.1.0',
      name: 'Custom Brand',
      paletteSlug: atoms.palettes[0]!.slug,
      paletteVersion: atoms.palettes[0]!.version,
      headingSlug: atoms.fonts[0]!.slug,
      headingVersion: atoms.fonts[0]!.version,
      bodySlug: atoms.fonts[1]!.slug,
      bodyVersion: atoms.fonts[1]!.version,
      monoSlug: atoms.fonts[2]!.slug,
      monoVersion: atoms.fonts[2]!.version,
    });
    expect(yaml.length).toBeGreaterThan(0);

    const parsed = parseYaml(yaml);
    expect(parsed.id).toBe('custom-brand');
    expect(parsed.version).toBe('0.1.0');
    expect(parsed.name).toBe('Custom Brand');
    expect(parsed.references).toBeDefined();
    expect(parsed.references.palette).toContain(atoms.palettes[0]!.slug);
    expect(parsed.references.fonts).toBeDefined();
    expect(parsed.references.fonts.heading).toContain(atoms.fonts[0]!.slug);
    expect(parsed.references.fonts.body).toContain(atoms.fonts[1]!.slug);
    expect(parsed.references.fonts.mono).toContain(atoms.fonts[2]!.slug);
  });
});
