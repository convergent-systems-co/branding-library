import { z } from 'zod';
import { SemverString, Slug } from './common.js';
import { Provenance } from './provenance.js';

export const AtomBase = z.object({
  id: Slug.describe(
    'Stable slug; combined with version forms the canonical reference "id@version"',
  ),
  version: SemverString,
  name: z.string().min(1).describe('Human-readable display name'),
  description: z.string().optional(),
  provenance: Provenance.optional(),
  tags: z.array(Slug).default([]),
});
export type AtomBase = z.infer<typeof AtomBase>;
