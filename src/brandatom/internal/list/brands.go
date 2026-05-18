package list

import (
	"context"
	"fmt"
	"io"
	"strings"
)

// Brands prints every brand in the catalog with swatches and font roles.
func Brands(ctx context.Context, c Fetcher, w io.Writer, opts Options) error {
	idx, err := fetchIndex(ctx, c)
	if err != nil {
		return err
	}
	if opts.JSON {
		return writeJSON(w, idx.Brands)
	}

	// Compute padding so the slug@version column lines up.
	maxRef := 0
	for _, b := range idx.Brands {
		ref := b.Slug + "@" + b.Version
		if len(ref) > maxRef {
			maxRef = len(ref)
		}
	}

	for _, b := range idx.Brands {
		ref := b.Slug + "@" + b.Version
		// Build the 12-block swatch row: identity + primary + accent +
		// up to 9 unique extras pulled from a few palette hints.
		blocks := dedupe(append(
			[]string{b.Identity, b.Primary, b.Accent},
			brandExtras(b)...,
		), 12)
		fmt.Fprintf(w, "%s   %s  %s\n",
			PadRight(ref, maxRef),
			SwatchRow(blocks, opts.Color),
			Bold(b.Name, opts.Color),
		)
		if len(b.FontRefs) > 0 {
			fmt.Fprintf(w, "  fonts: %s\n", formatFontRefs(b.FontRefs))
		}
		if len(b.Tags) > 0 {
			fmt.Fprintf(w, "  %s\n", Dim(strings.Join(b.Tags, " · "), opts.Color))
		}
		if b.Description != "" {
			fmt.Fprintf(w, "  %s\n", b.Description)
		}
		fmt.Fprintln(w)
	}
	return nil
}

// brandExtras fills out the swatch row beyond identity/primary/accent.
// We don't have the full palette preview in the index, so we re-use what
// we do have (and avoid duplicates).
func brandExtras(_ any) []string {
	// Currently no extras beyond identity/primary/accent are available
	// from the catalog index (it doesn't include the palette preview
	// per-brand). Future versions may extend CatalogBrand with a
	// `preview` field; until then we just leave the row at 3 colors.
	return nil
}

func formatFontRefs(m map[string]string) string {
	// Stable order: heading, body, mono, anything else alphabetical.
	preferred := []string{"heading", "body", "mono", "display", "ui", "code"}
	seen := map[string]bool{}
	parts := []string{}
	for _, k := range preferred {
		if v, ok := m[k]; ok {
			parts = append(parts, fmt.Sprintf("%s=%s", k, stripVersion(v)))
			seen[k] = true
		}
	}
	for k, v := range m {
		if seen[k] {
			continue
		}
		parts = append(parts, fmt.Sprintf("%s=%s", k, stripVersion(v)))
	}
	return strings.Join(parts, " ")
}

func stripVersion(ref string) string {
	if i := strings.Index(ref, "@"); i > 0 {
		return ref[:i]
	}
	return ref
}

func dedupe(in []string, max int) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range in {
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
		if len(out) >= max {
			break
		}
	}
	return out
}
