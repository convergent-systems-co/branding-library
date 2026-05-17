import { resolve } from 'node:path';
import {
  type AtomRecord,
  type BrandRecord,
  type FontAtomRecord,
  loadAll,
  type PaletteAtomRecord,
} from '../../../tools/loader.js';
import { type ResolvedBrand, resolveBrand } from '../../../tools/resolver.js';

// During Astro build, encyclopedia.ts is bundled into a Vite chunk, so
// import.meta.url is unreliable for locating the repo root. Use cwd
// (always the workspace package — web/) and walk up.
const repoRoot = resolve(process.cwd(), process.cwd().endsWith('/web') ? '..' : '.');

let cached: ReturnType<typeof loadAll> | null = null;

const load = () => {
  if (!cached) {
    cached = loadAll(repoRoot);
    if (cached.errors.length > 0) {
      for (const e of cached.errors) {
        console.warn(`[encyclopedia] ${e.file} [${e.path}]: ${e.message}`);
      }
    }
  }
  return cached;
};

export const getPalettes = (): PaletteAtomRecord[] => {
  return load().atoms.filter((a): a is PaletteAtomRecord => a.kind === 'palette');
};

export const getFonts = (): FontAtomRecord[] => {
  return load().atoms.filter((a): a is FontAtomRecord => a.kind === 'font');
};

export const getBrands = (): BrandRecord[] => {
  return load().brands;
};

export const getPaletteBySlug = (slug: string): PaletteAtomRecord | null => {
  const palettes = getPalettes().filter((p) => p.slug === slug);
  if (palettes.length === 0) return null;
  return palettes.sort((a, b) => b.version.localeCompare(a.version))[0] ?? null;
};

export const getFontBySlug = (slug: string): FontAtomRecord | null => {
  const fonts = getFonts().filter((f) => f.slug === slug);
  if (fonts.length === 0) return null;
  return fonts.sort((a, b) => b.version.localeCompare(a.version))[0] ?? null;
};

export const getResolvedBrandBySlug = (slug: string): ResolvedBrand | null => {
  const all = load();
  const matches = all.brands.filter((b) => b.slug === slug);
  if (matches.length === 0) return null;
  const latest = matches.sort((a, b) => b.version.localeCompare(a.version))[0];
  if (!latest) return null;
  const { brand, errors } = resolveBrand(latest, all.atoms);
  if (errors.length > 0) {
    for (const e of errors) {
      console.warn(`[encyclopedia] resolve ${e.brand} [${e.path}]: ${e.message}`);
    }
  }
  return brand;
};

const fontClassToFamilyMap: Record<string, string> = {
  inter: "'Inter', sans-serif",
  'firacode-nerdfont': "'Fira Code', ui-monospace, monospace",
  'jetbrainsmono-nerdfont': "'JetBrains Mono', ui-monospace, monospace",
  'hack-nerdfont': "'Hack', 'DejaVu Sans Mono', ui-monospace, monospace",
  'cascadiacode-nerdfont': "'Cascadia Code', ui-monospace, monospace",
  'toyota-type':
    "'ToyotaType', 'Helvetica Neue', Helvetica, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  'proxima-nova':
    "'proxima-nova', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  'freight-text-pro': "'freight-text-pro', 'Lora', Georgia, 'Times New Roman', Times, serif",
  'helvetica-neue':
    "'Helvetica Neue', HelveticaNeue, Helvetica, -apple-system, BlinkMacSystemFont, Arial, sans-serif",
  lato: "'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  raleway:
    "'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

export const fontShowcaseFamily = (slug: string): string => {
  return fontClassToFamilyMap[slug] ?? 'var(--font-sans)';
};

const resolveSwatchHex = (brand: ResolvedBrand, swatchId: string | undefined): string | null => {
  if (!swatchId) return null;
  const sw = brand.palette.data.swatches.find((s) => s.id === swatchId);
  return sw?.value ?? null;
};

const roleHex = (brand: ResolvedBrand, role: string, mode: 'light' | 'dark' = 'light'): string | null => {
  const brandSwatchId = brand.roles?.colors?.[role];
  const paletteSwatchId = brand.palette.data.modes[mode].roles[role];
  return resolveSwatchHex(brand, brandSwatchId) ?? resolveSwatchHex(brand, paletteSwatchId);
};

export type BrandTheme = {
  primary: string;
  primaryHover: string;
  surface: string;
  surfaceElevated: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  highlight: string;
  warning: string;
  error: string;
  success: string;
  onPrimary: string;
  headingFont: string;
  bodyFont: string;
};

const PRIMARY_FALLBACK = '#5E81AC';
const SURFACE_FALLBACK = '#ECEFF4';
const TEXT_FALLBACK = '#2E3440';

export const brandTheme = (brand: ResolvedBrand): BrandTheme => {
  const primary = roleHex(brand, 'primary') ?? PRIMARY_FALLBACK;
  const primaryHover = roleHex(brand, 'primary-hover') ?? primary;
  const surface = roleHex(brand, 'surface') ?? SURFACE_FALLBACK;
  const surfaceElevated = roleHex(brand, 'surface-elevated') ?? surface;
  const background = roleHex(brand, 'background') ?? '#FFFFFF';
  const textPrimary = roleHex(brand, 'text-primary') ?? TEXT_FALLBACK;
  const textSecondary = roleHex(brand, 'text-secondary') ?? textPrimary;
  const textTertiary = roleHex(brand, 'text-tertiary') ?? textSecondary;
  const accent = roleHex(brand, 'accent') ?? primary;
  const highlight = roleHex(brand, 'highlight') ?? accent;
  const warning = roleHex(brand, 'warning') ?? accent;
  const error = roleHex(brand, 'error') ?? '#BF616A';
  const success = roleHex(brand, 'success') ?? '#A3BE8C';

  const headingFontRole = brand.roles?.typography?.display ?? 'heading';
  const bodyFontRole = brand.roles?.typography?.prose ?? 'body';
  const headingSlug = brand.fonts.find((f) => f.role === headingFontRole)?.slug;
  const bodySlug = brand.fonts.find((f) => f.role === bodyFontRole)?.slug;

  return {
    primary,
    primaryHover,
    surface,
    surfaceElevated,
    background,
    textPrimary,
    textSecondary,
    textTertiary,
    accent,
    highlight,
    warning,
    error,
    success,
    onPrimary: '#FFFFFF',
    headingFont: headingSlug ? fontShowcaseFamily(headingSlug) : 'var(--font-sans)',
    bodyFont: bodySlug ? fontShowcaseFamily(bodySlug) : 'var(--font-sans)',
  };
};

export const getResolvedBrands = (): ResolvedBrand[] => {
  const all = load();
  const seen = new Set<string>();
  const latestPerSlug: BrandRecord[] = [];
  for (const b of all.brands) {
    const existing = latestPerSlug.find((x) => x.slug === b.slug);
    if (!existing) {
      latestPerSlug.push(b);
      seen.add(b.slug);
    } else if (b.version.localeCompare(existing.version) > 0) {
      const idx = latestPerSlug.indexOf(existing);
      latestPerSlug[idx] = b;
    }
  }
  const out: ResolvedBrand[] = [];
  for (const rec of latestPerSlug) {
    const { brand, errors } = resolveBrand(rec, all.atoms);
    if (errors.length > 0) {
      for (const e of errors) {
        console.warn(`[encyclopedia] resolve ${e.brand} [${e.path}]: ${e.message}`);
      }
    }
    if (brand) out.push(brand);
  }
  return out;
};

export type { AtomRecord, BrandRecord, PaletteAtomRecord, FontAtomRecord, ResolvedBrand };
