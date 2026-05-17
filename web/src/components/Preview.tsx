import type { ResolvedBrand } from '../lib/encyclopedia.js';

export type PreviewProps = {
  brand: ResolvedBrand;
  mode: 'light' | 'dark';
  onModeChange: (mode: 'light' | 'dark') => void;
};

const swatchValue = (brand: ResolvedBrand, swatchId: string | undefined): string => {
  if (!swatchId) return '#888888';
  const sw = brand.palette.data.swatches.find((s) => s.id === swatchId);
  return sw?.value ?? '#888888';
};

const fontStack = (brand: ResolvedBrand, role: 'heading' | 'body' | 'mono'): string => {
  const font = brand.fonts.find((f) => f.role === role);
  if (!font) return 'system-ui, sans-serif';
  return [font.data.family, ...font.data.fallbackStack]
    .map((f) => (f.includes(' ') ? `'${f}'` : f))
    .join(', ');
};

export function Preview({ brand, mode, onModeChange }: PreviewProps): JSX.Element {
  const roles = brand.palette.data.modes[mode].roles;

  const bg = swatchValue(brand, roles.background ?? roles.surface);
  const surface = swatchValue(brand, roles.surface ?? roles['surface-elevated'] ?? roles.background);
  const surfaceElevated = swatchValue(brand, roles['surface-elevated'] ?? roles.surface ?? roles.background);
  const fg = swatchValue(
    brand,
    roles.foreground ?? roles['on-background'] ?? roles['on-surface'] ?? roles['text-primary'],
  );
  const fgSecondary = swatchValue(
    brand,
    roles['text-secondary'] ?? roles['on-surface'] ?? roles.foreground,
  );
  const primary = swatchValue(brand, roles.primary ?? roles.cta);
  const onPrimary = swatchValue(brand, roles['on-primary'] ?? (mode === 'light' ? roles.background : roles.foreground));
  const accent = swatchValue(brand, roles.accent ?? roles.secondary ?? roles.primary);
  const success = swatchValue(brand, roles.success ?? roles.accent ?? roles.primary);
  const warning = swatchValue(brand, roles.warning ?? roles.accent ?? roles.primary);
  const error = swatchValue(brand, roles.error ?? roles.warning ?? roles.accent ?? roles.primary);

  const headingFamily = fontStack(brand, 'heading');
  const bodyFamily = fontStack(brand, 'body');
  const monoFamily = fontStack(brand, 'mono');

  return (
    <section className="preview" data-component="preview">
      <header className="preview-head">
        <h2>Live preview</h2>
        <div className="mode-toggle" role="group" aria-label="Preview color mode">
          <button
            type="button"
            className={mode === 'light' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('light')}
            data-mode="light"
          >
            Light
          </button>
          <button
            type="button"
            className={mode === 'dark' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => onModeChange('dark')}
            data-mode="dark"
          >
            Dark
          </button>
        </div>
      </header>

      <div
        className="preview-card"
        style={{
          background: bg,
          color: fg,
        }}
      >
        <h3 className="preview-heading" style={{ fontFamily: headingFamily }}>
          {brand.name}
        </h3>
        <p className="preview-body" style={{ fontFamily: bodyFamily }}>
          A composed brand renders heading + body type in the chosen typefaces, with role-mapped
          colors driving primary, accent, and success surfaces.
        </p>

        <div className="preview-buttons">
          <button
            type="button"
            className="preview-btn"
            style={{ background: primary, color: onPrimary, fontFamily: bodyFamily }}
          >
            Primary action
          </button>
          <button
            type="button"
            className="preview-btn outline"
            style={{ borderColor: accent, color: accent, background: 'transparent', fontFamily: bodyFamily }}
          >
            Accent
          </button>
          <span
            className="preview-badge"
            style={{ background: success, color: onPrimary, fontFamily: bodyFamily }}
          >
            Success
          </span>
        </div>

        <div className="preview-lists">
          <div className="preview-list-col">
            <h4 className="preview-list-head" style={{ fontFamily: headingFamily, color: fg }}>
              Bulleted list
            </h4>
            <ul
              className="preview-list"
              style={{ fontFamily: bodyFamily, color: fg, ['--preview-bullet' as string]: primary }}
            >
              <li>Bullet markers inherit the primary color.</li>
              <li>
                Inline <span className="preview-highlight" style={{ background: accent, color: bg }}>highlighted text</span>{' '}
                picks up the accent swatch.
              </li>
              <li>
                A <a className="preview-link" href="#" style={{ color: primary }}>link</a>{' '}
                colors itself with the brand's primary.
              </li>
            </ul>
          </div>
          <div className="preview-list-col">
            <h4 className="preview-list-head" style={{ fontFamily: headingFamily, color: fg }}>
              Numbered list
            </h4>
            <ol
              className="preview-list preview-list-ordered"
              style={{ fontFamily: bodyFamily, color: fg, ['--preview-bullet' as string]: primary }}
            >
              <li>Pick a palette atom.</li>
              <li>Pick the heading, body, and mono fonts.</li>
              <li>Preview live, then download the YAML.</li>
            </ol>
          </div>
        </div>

        <div className="preview-callouts">
          <div
            className="preview-callout"
            style={{ background: surface, borderLeftColor: primary, color: fg, fontFamily: bodyFamily }}
          >
            <span className="preview-callout-icon" style={{ background: primary, color: onPrimary, fontFamily: headingFamily }}>i</span>
            <div className="preview-callout-body">
              <strong style={{ fontFamily: headingFamily, color: fg }}>Info</strong>
              <p style={{ color: fgSecondary }}>Neutral context — uses the brand's primary as the rule.</p>
            </div>
          </div>
          <div
            className="preview-callout"
            style={{ background: surface, borderLeftColor: success, color: fg, fontFamily: bodyFamily }}
          >
            <span className="preview-callout-icon" style={{ background: success, color: onPrimary, fontFamily: headingFamily }}>✓</span>
            <div className="preview-callout-body">
              <strong style={{ fontFamily: headingFamily, color: fg }}>Success</strong>
              <p style={{ color: fgSecondary }}>Confirms a completed action — rule color from the success role.</p>
            </div>
          </div>
          <div
            className="preview-callout"
            style={{ background: surface, borderLeftColor: warning, color: fg, fontFamily: bodyFamily }}
          >
            <span className="preview-callout-icon" style={{ background: warning, color: onPrimary, fontFamily: headingFamily }}>!</span>
            <div className="preview-callout-body">
              <strong style={{ fontFamily: headingFamily, color: fg }}>Warning</strong>
              <p style={{ color: fgSecondary }}>Needs attention but isn't blocking — palette role <code style={{ fontFamily: monoFamily }}>warning</code>.</p>
            </div>
          </div>
          <div
            className="preview-callout"
            style={{ background: surface, borderLeftColor: error, color: fg, fontFamily: bodyFamily }}
          >
            <span className="preview-callout-icon" style={{ background: error, color: onPrimary, fontFamily: headingFamily }}>×</span>
            <div className="preview-callout-body">
              <strong style={{ fontFamily: headingFamily, color: fg }}>Error</strong>
              <p style={{ color: fgSecondary }}>Surfaces a failure that blocks progress.</p>
            </div>
          </div>
        </div>

        <pre
          className="preview-mono"
          style={{ fontFamily: monoFamily, color: fg, opacity: 0.85, background: surfaceElevated }}
        >
{`{
  "id": "${brand.id}",
  "version": "${brand.version}",
  "palette": "${brand.palette.slug}",
  "fonts": ["${brand.fonts.map((f) => f.slug).join('", "')}"]
}`}
        </pre>
      </div>
    </section>
  );
}
