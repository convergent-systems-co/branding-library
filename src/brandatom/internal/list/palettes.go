package list

import (
	"context"
	"fmt"
	"io"
)

// Palettes prints every palette with its preview swatches.
func Palettes(ctx context.Context, c Fetcher, w io.Writer, opts Options) error {
	idx, err := fetchIndex(ctx, c)
	if err != nil {
		return err
	}
	if opts.JSON {
		return writeJSON(w, idx.Palettes)
	}

	maxRef := 0
	for _, p := range idx.Palettes {
		ref := p.Slug + "@" + p.Version
		if len(ref) > maxRef {
			maxRef = len(ref)
		}
	}

	for _, p := range idx.Palettes {
		ref := p.Slug + "@" + p.Version
		fmt.Fprintf(w, "%s   %s  %s %s\n",
			PadRight(ref, maxRef),
			SwatchRow(p.Preview, opts.Color),
			Bold(p.Name, opts.Color),
			Dim(fmt.Sprintf("(%d swatches)", p.SwatchCount), opts.Color),
		)
	}
	return nil
}
