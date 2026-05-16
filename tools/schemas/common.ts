import { z } from 'zod';

export const Slug = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'must be lowercase, start with a letter, and contain only letters, digits, and hyphens',
  );
export type Slug = z.infer<typeof Slug>;

export const SemverString = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'must be a semver string in the form MAJOR.MINOR.PATCH');
export type SemverString = z.infer<typeof SemverString>;

export const VersionRef = z
  .string()
  .regex(
    /^(latest|\d+(\.\d+(\.\d+)?)?)$/,
    'must be "latest", "MAJOR", "MAJOR.MINOR", or "MAJOR.MINOR.PATCH"',
  );
export type VersionRef = z.infer<typeof VersionRef>;

const ATOM_REFERENCE_REGEX = /^([a-z][a-z0-9-]*)@(latest|\d+(\.\d+(\.\d+)?)?)$/;

export const AtomReference = z
  .string()
  .regex(
    ATOM_REFERENCE_REGEX,
    'must be in the form "<slug>@<version>" where version is "latest", a major, major.minor, or full semver',
  );
export type AtomReference = z.infer<typeof AtomReference>;

export const parseAtomReference = (ref: string): { slug: string; version: string } | null => {
  const match = ref.match(ATOM_REFERENCE_REGEX);
  if (!match) return null;
  const [, slug, version] = match;
  if (!slug || !version) return null;
  return { slug, version };
};

export const Severity = z.enum(['error', 'warning', 'recommendation']);
export type Severity = z.infer<typeof Severity>;

export const Mode = z.enum(['light', 'dark']);
export type Mode = z.infer<typeof Mode>;

export const ContextTag = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*$/,
    'context tags must be lowercase slugs (e.g., "marketing-site", "print", "mobile-app")',
  );
export type ContextTag = z.infer<typeof ContextTag>;

export const Url = z.string().url();
