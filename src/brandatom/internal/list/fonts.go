package list

import (
	"context"
	"fmt"
	"io"
)

// Fonts prints every font with classification, variable-axis info, and
// a one-line specimen.
func Fonts(ctx context.Context, c Fetcher, w io.Writer, opts Options) error {
	idx, err := fetchIndex(ctx, c)
	if err != nil {
		return err
	}
	if opts.JSON {
		return writeJSON(w, idx.Fonts)
	}

	maxRef := 0
	maxFamily := 0
	maxClass := 0
	for _, f := range idx.Fonts {
		ref := f.Slug + "@" + f.Version
		if len(ref) > maxRef {
			maxRef = len(ref)
		}
		if len(f.Family) > maxFamily {
			maxFamily = len(f.Family)
		}
		if len(f.Classification) > maxClass {
			maxClass = len(f.Classification)
		}
	}

	for _, f := range idx.Fonts {
		ref := f.Slug + "@" + f.Version
		axis := "static"
		if f.IsVariable && len(f.WeightRange) == 2 {
			axis = fmt.Sprintf("variable, %d–%d", f.WeightRange[0], f.WeightRange[1])
		} else if len(f.WeightRange) == 2 {
			axis = fmt.Sprintf("weights %d–%d", f.WeightRange[0], f.WeightRange[1])
		}
		fmt.Fprintf(w, "%s  %s %s (%s)\n",
			PadRight(ref, maxRef),
			PadRight(f.Family, maxFamily),
			PadRight(f.Classification, maxClass),
			axis,
		)
		fmt.Fprintf(w, "  %s\n", FormatSpecimen(f.Classification, opts.Color))
	}
	return nil
}
