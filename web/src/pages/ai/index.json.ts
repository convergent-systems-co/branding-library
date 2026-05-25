import type { APIRoute } from 'astro';
import { getBrands, getFonts, getPalettes } from '../../lib/encyclopedia.js';

export const GET: APIRoute = () => {
  const brands = getBrands();
  const palettes = getPalettes();
  const fonts = getFonts();

  const uniqueSlugs = (items: { slug: string }[]) =>
    [...new Set(items.map((i) => i.slug))].sort();

  const payload = {
    version: '1',
    site: 'https://brand-atoms.com',
    description:
      'Civilization-grade encyclopedia of branding — palettes, fonts, and brands. Consumed by AIs and humans to produce on-brand outputs.',
    catalog: {
      index: 'https://brand-atoms.com/dist/index.json',
      brands: uniqueSlugs(brands),
      palettes: uniqueSlugs(palettes),
      fonts: uniqueSlugs(fonts),
    },
    endpoints: {
      brands: 'https://brand-atoms.com/dist/brands/{slug}/{version}/json/brand.json',
      palettes: 'https://brand-atoms.com/dist/palettes/{slug}/{version}/json/palette.json',
      fonts: 'https://brand-atoms.com/dist/fonts/{slug}/{version}/json/font.json',
    },
    workflow: [
      '1. Fetch the catalog index at https://brand-atoms.com/dist/index.json to discover available brands, palettes, and fonts.',
      '2. Resolve a brand by slug@version. Fetch https://brand-atoms.com/dist/brands/{slug}/{version}/json/brand.json.',
      '3. Honor every entry in brand.roles.colors verbatim. Use brand.references.fonts for typography.',
      '4. Iterate brand.rules. Treat severity:error entries as hard constraints; severity:recommendation as strong defaults — explain any deviation.',
      '5. Pin to an exact version (e.g. convergent-systems@1.0.0) for reproducibility, or a major version (convergent-systems@1) to ride non-breaking updates.',
    ],
    systemPromptPattern:
      "The user's brand is \"{slug}@{version}\". Before generating any branded output, fetch https://brand-atoms.com/dist/brands/{slug}/{version}/json/brand.json. Honor every roles.colors mapping verbatim, respect every rules entry (severity:error rules are non-negotiable), and apply references.fonts for all typography.",
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};
