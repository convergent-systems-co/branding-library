import { z } from 'zod';
import { AtomReference, Mode, SemverString, Slug } from './common.js';
import { Constraint } from './constraints.js';
import { Provenance } from './provenance.js';

const RoleName = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'role names must be lowercase slugs (e.g., "heading", "body", "cta", "background")',
  );

export const BrandReferences = z.object({
  palette: AtomReference,
  fonts: z
    .record(RoleName, AtomReference)
    .default({})
    .describe(
      'Map of role → font atom reference (e.g., { heading: "inter@1", body: "merriweather@1" })',
    ),
  layout: AtomReference.optional(),
});
export type BrandReferences = z.infer<typeof BrandReferences>;

export const BrandRoles = z
  .object({
    colors: z
      .record(RoleName, z.string())
      .optional()
      .describe('Semantic color role → swatch ID in the referenced palette'),
    typography: z
      .record(RoleName, z.string())
      .optional()
      .describe('Semantic typography role → font role key (defined in references.fonts)'),
  })
  .optional()
  .describe(
    'Optional semantic role mapping. Overrides or supplements palette-level role mappings.',
  );

export const BrandAssetCategory = z.enum([
  'logo',
  'logo-wordmark',
  'logo-mark',
  'logo-monogram',
  'favicon',
  'og-image',
  'app-icon',
  'icon',
  'illustration',
  'pattern',
  'photograph',
  'video',
  'audio',
  'document-template',
  'other',
]);
export type BrandAssetCategory = z.infer<typeof BrandAssetCategory>;

export const BrandAssetColorScheme = z.enum([
  'dark-on-light',
  'light-on-dark',
  'monochrome-dark',
  'monochrome-light',
  'full-color',
  'duotone',
]);

export const BrandAssetDimensions = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  unit: z.enum(['px', 'pt', 'em', 'rem', 'vw', 'vh']).default('px'),
});

export const BrandAssetVariant = z.object({
  id: Slug,
  file: z.string().min(1).describe('Path relative to the brand version directory'),
  colorScheme: BrandAssetColorScheme.optional(),
  intendedMode: Mode.optional(),
  dimensions: BrandAssetDimensions.optional(),
  format: z.enum(['svg', 'png', 'jpg', 'webp', 'avif', 'ico', 'mp4', 'webm']).optional(),
  notes: z.string().optional(),
});
export type BrandAssetVariant = z.infer<typeof BrandAssetVariant>;

export const BrandAsset = z.object({
  id: Slug,
  category: BrandAssetCategory,
  name: z.string().min(1),
  description: z.string().optional(),
  variants: z.array(BrandAssetVariant).min(1),
});
export type BrandAsset = z.infer<typeof BrandAsset>;

export const Brand = z.object({
  id: Slug,
  version: SemverString,
  name: z.string().min(1),
  description: z.string().optional(),
  provenance: Provenance.optional(),
  tags: z.array(Slug).default([]),

  references: BrandReferences,
  roles: BrandRoles,
  assets: z.array(BrandAsset).default([]),
  rules: z.array(Constraint).default([]),
});
export type Brand = z.infer<typeof Brand>;
