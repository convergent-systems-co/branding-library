import { z } from 'zod';
import { ContextTag, Severity } from './common.js';

const PredicateValue = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);

const constraintCommon = {
  target: z
    .string()
    .min(1)
    .describe(
      'Dotted path to the thing this rule constrains (e.g., "logo.primary.width", "palette.accent-red", "typography.heading")',
    ),
  severity: Severity,
  rationale: z
    .string()
    .optional()
    .describe('Human-readable explanation of WHY this rule exists. Never used for machine logic.'),
  appliesIn: z
    .array(ContextTag)
    .optional()
    .describe('Context tags where this rule applies. Omitted = applies everywhere.'),
  when: z
    .record(z.string(), PredicateValue)
    .optional()
    .describe('AND-of-equality conditions that must hold for this rule to activate'),
};

export const NumericRange = z.object({
  type: z.literal('numericRange'),
  ...constraintCommon,
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().min(1).describe('Unit string (e.g., "px", "rem", "pt", "%")'),
});

export const NumericRatio = z.object({
  type: z.literal('numericRatio'),
  ...constraintCommon,
  min: z.number().optional(),
  max: z.number().optional(),
});

export const ContrastRatio = z.object({
  type: z.literal('contrastRatio'),
  ...constraintCommon,
  against: z.string().describe('What the target is being measured against (e.g., "background")'),
  minRatio: z.number().positive(),
  standard: z.enum(['WCAG-AA', 'WCAG-AAA', 'WCAG-AA-large', 'APCA']).optional(),
});

export const ColorChoice = z.object({
  type: z.literal('colorChoice'),
  ...constraintCommon,
  allowed: z.array(z.string()).optional(),
  forbidden: z.array(z.string()).optional(),
});

export const EnumMembership = z.object({
  type: z.literal('enumMembership'),
  ...constraintCommon,
  allowed: z.array(z.string()).optional(),
  forbidden: z.array(z.string()).optional(),
});

export const VariantSelection = z.object({
  type: z.literal('variantSelection'),
  ...constraintCommon,
  use: z
    .string()
    .describe('Identifier of the variant that must be used under the `when` conditions'),
});

export const ForbiddenTreatment = z.object({
  type: z.literal('forbiddenTreatment'),
  ...constraintCommon,
  treatments: z
    .array(z.string())
    .min(1)
    .describe(
      'Treatments that must never be applied (e.g., "stretched", "rotated", "recolored", "drop-shadow", "on-busy-photo")',
    ),
});

export const CompositionConstraint = z.object({
  type: z.literal('compositionConstraint'),
  ...constraintCommon,
  pairsWith: z.array(z.string()).optional(),
  doesNotPairWith: z.array(z.string()).optional(),
});

export const ContextRestriction = z.object({
  type: z.literal('contextRestriction'),
  ...constraintCommon,
  allowedContexts: z.array(ContextTag).optional(),
  forbiddenContexts: z.array(ContextTag).optional(),
});

export const AccessibilityRequirement = z.object({
  type: z.literal('accessibilityRequirement'),
  ...constraintCommon,
  standard: z.enum(['WCAG-A', 'WCAG-AA', 'WCAG-AAA']),
  criterion: z
    .string()
    .optional()
    .describe('Specific WCAG success criterion ID, e.g., "1.4.3" for contrast minimum'),
});

export const FontPairing = z.object({
  type: z.literal('fontPairing'),
  ...constraintCommon,
  requires: z
    .string()
    .optional()
    .describe('Another font role/atom that must be present when this one is used'),
  minSizeRatio: z
    .number()
    .positive()
    .optional()
    .describe('Minimum size ratio between this font and its pair (e.g., 1.5 means at least 1.5×)'),
});

export const Constraint = z.discriminatedUnion('type', [
  NumericRange,
  NumericRatio,
  ContrastRatio,
  ColorChoice,
  EnumMembership,
  VariantSelection,
  ForbiddenTreatment,
  CompositionConstraint,
  ContextRestriction,
  AccessibilityRequirement,
  FontPairing,
]);
export type Constraint = z.infer<typeof Constraint>;

export const ConstraintTypeNames = [
  'numericRange',
  'numericRatio',
  'contrastRatio',
  'colorChoice',
  'enumMembership',
  'variantSelection',
  'forbiddenTreatment',
  'compositionConstraint',
  'contextRestriction',
  'accessibilityRequirement',
  'fontPairing',
] as const;
export type ConstraintTypeName = (typeof ConstraintTypeNames)[number];
