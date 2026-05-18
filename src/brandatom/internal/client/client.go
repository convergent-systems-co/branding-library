package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/config"
)

// ErrNotFound is returned when the encyclopedia returns 404 for the
// requested resource. Callers should map this to exit code 2.
var ErrNotFound = errors.New("not found")

// Client is a thin HTTP wrapper that knows how to fetch the catalog
// index and individual brand JSON files. It is safe for concurrent use.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// New constructs a Client with sensible defaults: 30-second timeout and
// the canonical encyclopedia base URL.
func New(baseURL string) *Client {
	if baseURL == "" {
		baseURL = config.DefaultBaseURL
	}
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (c *Client) get(ctx context.Context, path string) ([]byte, error) {
	url := c.BaseURL + path
	var lastErr error
	// Retry transient failures up to twice; total of 3 attempts.
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(attempt) * 250 * time.Millisecond)
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("User-Agent", config.UserAgent)
		req.Header.Set("Accept", "application/json")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		body, readErr := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("%w: %s", ErrNotFound, url)
		}
		if resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("server error %d for %s", resp.StatusCode, url)
			continue
		}
		if resp.StatusCode >= 400 {
			return nil, fmt.Errorf("http %d for %s", resp.StatusCode, url)
		}
		if readErr != nil {
			lastErr = readErr
			continue
		}
		return body, nil
	}
	if lastErr == nil {
		lastErr = errors.New("request failed without an underlying error")
	}
	return nil, lastErr
}

// FetchIndex pulls the catalog index from <base>/dist/index.json.
func (c *Client) FetchIndex(ctx context.Context) (*CatalogIndex, error) {
	body, err := c.get(ctx, "/dist/index.json")
	if err != nil {
		return nil, err
	}
	var idx CatalogIndex
	if err := json.Unmarshal(body, &idx); err != nil {
		return nil, fmt.Errorf("decode catalog index: %w", err)
	}
	return &idx, nil
}

// FetchBrand pulls a single resolved brand JSON from the encyclopedia.
func (c *Client) FetchBrand(ctx context.Context, slug, version string) (*ResolvedBrand, []byte, error) {
	if slug == "" || version == "" {
		return nil, nil, errors.New("slug and version are required")
	}
	path := fmt.Sprintf("/dist/brands/%s/%s/json/brand.json", slug, version)
	body, err := c.get(ctx, path)
	if err != nil {
		return nil, nil, err
	}
	var brand ResolvedBrand
	if err := json.Unmarshal(body, &brand); err != nil {
		return nil, nil, fmt.Errorf("decode brand %s@%s: %w", slug, version, err)
	}
	return &brand, body, nil
}
