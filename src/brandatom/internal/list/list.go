// Package list renders the catalog (brands / palettes / fonts) to stdout.
// All formatting decisions live here; commands just pass through.
package list

import (
	"context"
	"encoding/json"
	"fmt"
	"io"

	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/client"
)

// Options controls list rendering.
type Options struct {
	Color bool
	JSON  bool
}

// Fetcher is the minimal interface the list commands need from the client.
type Fetcher interface {
	FetchIndex(ctx context.Context) (*client.CatalogIndex, error)
}

// writeJSON emits a sub-section of the catalog as raw indented JSON.
func writeJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

// fetchIndex is a small helper so each command's signature stays narrow.
func fetchIndex(ctx context.Context, c Fetcher) (*client.CatalogIndex, error) {
	idx, err := c.FetchIndex(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch catalog index: %w", err)
	}
	return idx, nil
}
