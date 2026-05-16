import { z } from 'zod';
import { AtomBase } from './atom.js';
import { Slug } from './common.js';

export const ColorValue = z
  .string()
  .regex(
    /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/,
    'must be a 6- or 8-digit hex color (e.g., "#2E3440" or "#2E3440FF")',
  );
export type ColorValue = z.infer<typeof ColorValue>;

export const Swatch = z.object({
  id: Slug.describe('Stable swatch identifier — referenced by role mappings'),
  name: z.string().min(1),
  value: ColorValue,
  description: z.string().optional(),
  aliases: z
    .array(Slug)
    .default([])
    .describe('Alternative slugs that resolve to this swatch (for backward compat or naming)'),
});
export type Swatch = z.infer<typeof Swatch>;

const RoleName = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'role names must be lowercase slugs (e.g., "primary", "on-primary", "surface-variant")',
  );

export const PaletteMode = z.object({
  roles: z
    .record(RoleName, Slug)
    .default({})
    .describe(
      'Semantic role → swatch ID. Common roles: primary, secondary, tertiary, background, surface, on-*, error, outline, accent, cta.',
    ),
});
export type PaletteMode = z.infer<typeof PaletteMode>;

export const Palette = AtomBase.extend({
  kind: z.literal('palette'),
  swatches: z
    .array(Swatch)
    .min(1)
    .describe('Source-of-truth color list. Modes map roles onto these swatches.'),
  modes: z.object({
    light: PaletteMode,
    dark: PaletteMode,
  }),
});
export type Palette = z.infer<typeof Palette>;
