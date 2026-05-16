#!/usr/bin/env tsx
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { ZodIssue } from 'zod';
import { Brand, Font, Palette, parseAtomReference } from './schemas/index.js';
import type {
  Brand as BrandData,
  Font as FontData,
  Palette as PaletteData,
} from './schemas/index.js';

const REPO_ROOT = process.cwd();
const PALETTES_DIR = join(REPO_ROOT, 'palettes');
const FONTS_DIR = join(REPO_ROOT, 'fonts');
const BRANDS_DIR = join(REPO_ROOT, 'brands');

type AtomKind = 'palette' | 'font';

type AtomRecord =
  | { kind: 'palette'; slug: string; version: string; filePath: string; data: PaletteData }
  | { kind: 'font'; slug: string; version: string; filePath: string; data: FontData };

type BrandRecord = {
  slug: string;
  version: string;
  filePath: string;
  data: BrandData;
};

type Diagnostic = { file: string; path: string; message: string };

class ValidationContext {
  errors: Diagnostic[] = [];
  warnings: Diagnostic[] = [];

  error(file: string, path: string, message: string): void {
    this.errors.push({ file, path, message });
  }

  warn(file: string, path: string, message: string): void {
    this.warnings.push({ file, path, message });
  }

  zodIssues(file: string, issues: ZodIssue[]): void {
    for (const issue of issues) {
      this.error(file, issue.path.join('.'), issue.message);
    }
  }
}

const listDirs = (parent: string): string[] => {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
};

const loadYaml = (filePath: string, ctx: ValidationContext): unknown | null => {
  try {
    return parseYaml(readFileSync(filePath, 'utf8'));
  } catch (e) {
    ctx.error(filePath, '', `YAML parse error: ${(e as Error).message}`);
    return null;
  }
};

const loadAtoms = (ctx: ValidationContext): AtomRecord[] => {
  const atoms: AtomRecord[] = [];

  const kinds: { kind: AtomKind; dir: string }[] = [
    { kind: 'palette', dir: PALETTES_DIR },
    { kind: 'font', dir: FONTS_DIR },
  ];

  for (const { kind, dir } of kinds) {
    for (const slug of listDirs(dir)) {
      for (const version of listDirs(join(dir, slug))) {
        const filePath = join(dir, slug, version, 'atom.yaml');
        if (!existsSync(filePath)) {
          ctx.error(join(dir, slug, version), '', 'missing atom.yaml');
          continue;
        }
        const parsed = loadYaml(filePath, ctx);
        if (parsed === null) continue;

        const result = kind === 'palette' ? Palette.safeParse(parsed) : Font.safeParse(parsed);
        if (!result.success) {
          ctx.zodIssues(filePath, result.error.issues);
          continue;
        }

        if (result.data.id !== slug) {
          ctx.error(filePath, 'id', `id "${result.data.id}" does not match folder slug "${slug}"`);
        }
        if (result.data.version !== version) {
          ctx.error(
            filePath,
            'version',
            `version "${result.data.version}" does not match folder version "${version}"`,
          );
        }

        if (kind === 'palette') {
          atoms.push({ kind, slug, version, filePath, data: result.data as PaletteData });
        } else {
          atoms.push({ kind, slug, version, filePath, data: result.data as FontData });
        }
      }
    }
  }

  return atoms;
};

const loadBrands = (ctx: ValidationContext): BrandRecord[] => {
  const brands: BrandRecord[] = [];
  for (const slug of listDirs(BRANDS_DIR)) {
    for (const version of listDirs(join(BRANDS_DIR, slug))) {
      const filePath = join(BRANDS_DIR, slug, version, 'brand.yaml');
      if (!existsSync(filePath)) {
        ctx.error(join(BRANDS_DIR, slug, version), '', 'missing brand.yaml');
        continue;
      }
      const parsed = loadYaml(filePath, ctx);
      if (parsed === null) continue;
      const result = Brand.safeParse(parsed);
      if (!result.success) {
        ctx.zodIssues(filePath, result.error.issues);
        continue;
      }
      if (result.data.id !== slug) {
        ctx.error(filePath, 'id', `id "${result.data.id}" does not match folder slug "${slug}"`);
      }
      if (result.data.version !== version) {
        ctx.error(
          filePath,
          'version',
          `version "${result.data.version}" does not match folder version "${version}"`,
        );
      }
      brands.push({ slug, version, filePath, data: result.data });
    }
  }
  return brands;
};

const semverParts = (v: string): [number, number, number] => {
  const [a = 0, b = 0, c = 0] = v.split('.').map(Number);
  return [a, b, c];
};

const compareSemver = (a: string, b: string): number => {
  const [a1, a2, a3] = semverParts(a);
  const [b1, b2, b3] = semverParts(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
};

const resolveVersion = (versions: string[], ref: string): string | null => {
  if (versions.length === 0) return null;
  const sorted = [...versions].sort(compareSemver);
  if (ref === 'latest') return sorted[sorted.length - 1] ?? null;
  const parts = ref.split('.').map(Number);
  const matching = sorted.filter((v) => {
    const vp = v.split('.').map(Number);
    for (let i = 0; i < parts.length; i++) {
      if (vp[i] !== parts[i]) return false;
    }
    return true;
  });
  return matching.length === 0 ? null : (matching[matching.length - 1] ?? null);
};

const validateCrossReferences = (
  ctx: ValidationContext,
  atoms: AtomRecord[],
  brands: BrandRecord[],
): void => {
  const atomIndex = new Map<AtomKind, Map<string, string[]>>([
    ['palette', new Map()],
    ['font', new Map()],
  ]);
  for (const a of atoms) {
    const slugMap = atomIndex.get(a.kind);
    if (!slugMap) continue;
    const versions = slugMap.get(a.slug) ?? [];
    versions.push(a.version);
    slugMap.set(a.slug, versions);
  }

  for (const a of atoms) {
    if (a.kind !== 'palette') continue;
    const swatchIds = new Set(a.data.swatches.map((s) => s.id));
    for (const mode of ['light', 'dark'] as const) {
      const roles = a.data.modes[mode].roles;
      for (const [role, swatchId] of Object.entries(roles)) {
        if (!swatchIds.has(swatchId)) {
          ctx.error(
            a.filePath,
            `modes.${mode}.roles.${role}`,
            `references swatch "${swatchId}" which is not defined in swatches`,
          );
        }
      }
    }
  }

  for (const brand of brands) {
    const palRef = parseAtomReference(brand.data.references.palette);
    let resolvedPaletteVersion: string | null = null;

    if (!palRef) {
      ctx.error(brand.filePath, 'references.palette', 'malformed atom reference');
    } else {
      const versions = atomIndex.get('palette')?.get(palRef.slug);
      if (!versions || versions.length === 0) {
        ctx.error(
          brand.filePath,
          'references.palette',
          `palette "${palRef.slug}" not found in palettes/`,
        );
      } else {
        resolvedPaletteVersion = resolveVersion(versions, palRef.version);
        if (!resolvedPaletteVersion) {
          ctx.error(
            brand.filePath,
            'references.palette',
            `palette "${palRef.slug}" has no version matching "${palRef.version}". Available: ${versions.join(', ')}`,
          );
        }
      }
    }

    if (brand.data.roles?.colors && palRef && resolvedPaletteVersion) {
      const palAtom = atoms.find(
        (a): a is Extract<AtomRecord, { kind: 'palette' }> =>
          a.kind === 'palette' && a.slug === palRef.slug && a.version === resolvedPaletteVersion,
      );
      if (palAtom) {
        const swatchIds = new Set(palAtom.data.swatches.map((s) => s.id));
        for (const [role, swatchId] of Object.entries(brand.data.roles.colors)) {
          if (!swatchIds.has(swatchId)) {
            ctx.error(
              brand.filePath,
              `roles.colors.${role}`,
              `swatch "${swatchId}" not found in palette "${palRef.slug}@${resolvedPaletteVersion}"`,
            );
          }
        }
      }
    }

    for (const [roleKey, fontRef] of Object.entries(brand.data.references.fonts)) {
      const parsed = parseAtomReference(fontRef);
      if (!parsed) {
        ctx.error(brand.filePath, `references.fonts.${roleKey}`, 'malformed atom reference');
        continue;
      }
      const versions = atomIndex.get('font')?.get(parsed.slug);
      if (!versions || versions.length === 0) {
        ctx.error(
          brand.filePath,
          `references.fonts.${roleKey}`,
          `font "${parsed.slug}" not found in fonts/`,
        );
        continue;
      }
      const resolved = resolveVersion(versions, parsed.version);
      if (!resolved) {
        ctx.error(
          brand.filePath,
          `references.fonts.${roleKey}`,
          `font "${parsed.slug}" has no version matching "${parsed.version}". Available: ${versions.join(', ')}`,
        );
      }
    }

    if (brand.data.roles?.typography) {
      const fontKeys = new Set(Object.keys(brand.data.references.fonts));
      for (const [role, fontKey] of Object.entries(brand.data.roles.typography)) {
        if (!fontKeys.has(fontKey)) {
          ctx.error(
            brand.filePath,
            `roles.typography.${role}`,
            `references font role "${fontKey}" which is not declared in references.fonts`,
          );
        }
      }
    }

    const versionDir = brand.filePath.replace(/\/brand\.yaml$/, '');
    for (const asset of brand.data.assets) {
      for (const variant of asset.variants) {
        const fullPath = join(versionDir, variant.file);
        if (!existsSync(fullPath)) {
          ctx.error(
            brand.filePath,
            `assets[${asset.id}].variants[${variant.id}].file`,
            `file not found at ${variant.file}`,
          );
        }
      }
    }
  }
};

const printResults = (ctx: ValidationContext): void => {
  if (ctx.errors.length === 0 && ctx.warnings.length === 0) {
    console.log('✓ All validations passed.');
    return;
  }
  for (const e of ctx.errors) {
    const relFile = e.file.replace(`${REPO_ROOT}${sep}`, '');
    const path = e.path ? ` [${e.path}]` : '';
    console.error(`✗ ${relFile}${path}: ${e.message}`);
  }
  for (const w of ctx.warnings) {
    const relFile = w.file.replace(`${REPO_ROOT}${sep}`, '');
    const path = w.path ? ` [${w.path}]` : '';
    console.warn(`! ${relFile}${path}: ${w.message}`);
  }
  console.log(`\n${ctx.errors.length} error(s), ${ctx.warnings.length} warning(s).`);
};

const main = (): void => {
  const ctx = new ValidationContext();
  const atoms = loadAtoms(ctx);
  const brands = loadBrands(ctx);
  validateCrossReferences(ctx, atoms, brands);
  printResults(ctx);
  process.exit(ctx.errors.length > 0 ? 1 : 0);
};

main();
