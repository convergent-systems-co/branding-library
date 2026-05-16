import { z } from 'zod';
import { Url } from './common.js';

export const Provenance = z.object({
  source: Url.optional().describe('Canonical URL for the original definition'),
  license: z
    .string()
    .describe('SPDX license identifier or human-readable license name (e.g., "MIT", "Apache-2.0")'),
  attribution: z
    .string()
    .optional()
    .describe('Required attribution text per the source license, if any'),
  importedDate: z
    .string()
    .date()
    .optional()
    .describe('ISO date (YYYY-MM-DD) when this atom was imported from its source'),
  importedFromVersion: z
    .string()
    .optional()
    .describe('Upstream source version this atom mirrors, if applicable'),
  notes: z
    .string()
    .optional()
    .describe('Free-text provenance notes — human-readable context about origin or curation'),
});
export type Provenance = z.infer<typeof Provenance>;
