// Package apply takes a resolved brand JSON and writes the appropriate
// project file(s) into the user's working directory. It detects the
// project shape (Tailwind, Xcode, Android, generic web) unless the user
// forces a specific emitter with --format.
package apply

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/client"
)

// ErrDetectionFailed signals that we couldn't figure out what kind of
// project the user is in. Callers should map this to exit code 3.
var ErrDetectionFailed = errors.New("project type could not be detected")

// PlannedWrite is one file we intend to create or modify.
type PlannedWrite struct {
	Path     string
	Contents []byte
	Kind     string // tailwind | css | swift | android
	Diff     string // optional human-readable preview for dry-runs
}

// Options for apply.
type Options struct {
	Root    string // working directory (usually os.Getwd())
	DryRun  bool
	Force   bool
	Format  string // override detection; "" = auto
	Stdout  io.Writer
	Stderr  io.Writer
	Stdin   io.Reader
}

// Run executes the apply flow against the encyclopedia. brand is the
// already-fetched resolved-brand JSON; the caller does the HTTP.
func Run(ctx context.Context, brand *client.ResolvedBrand, opts Options) error {
	if opts.Stdout == nil {
		opts.Stdout = os.Stdout
	}
	if opts.Stderr == nil {
		opts.Stderr = os.Stderr
	}
	if opts.Stdin == nil {
		opts.Stdin = os.Stdin
	}

	det := chooseDetection(opts)
	if det.Kind == KindUnknown {
		return ErrDetectionFailed
	}

	plan, err := plan(brand, det)
	if err != nil {
		return err
	}

	fmt.Fprintf(opts.Stdout, "Project: %s (%s)\n", det.Kind, det.Path)
	fmt.Fprintf(opts.Stdout, "Brand:   %s@%s — %s\n", brand.ID, brand.Version, brand.Name)
	fmt.Fprintln(opts.Stdout)

	if opts.DryRun {
		printDryRun(opts.Stdout, plan)
		return nil
	}

	for _, p := range plan {
		if err := writePlanned(p, opts); err != nil {
			return err
		}
	}
	fmt.Fprintf(opts.Stdout, "Applied %s@%s.\n", brand.ID, brand.Version)
	return nil
}

// chooseDetection honors --format if set; otherwise auto-detects.
func chooseDetection(opts Options) Detection {
	if opts.Format != "" {
		kind := ProjectKind(strings.ToLower(opts.Format))
		switch kind {
		case KindCSS, KindTailwind, KindXcode, KindAndroid, KindGenericWeb:
		default:
			// Unknown — fall through to auto-detect.
			return Detect(opts.Root)
		}
		// For forced formats we still need a Path. Use root as the
		// best-effort target; emitters know how to interpret.
		return Detection{Kind: kind, Path: opts.Root}
	}
	return Detect(opts.Root)
}

// KindCSS is an alias used when --format css is passed explicitly. The
// auto-detected variant for a vanilla web project is KindGenericWeb,
// which also emits CSS — they share an emitter.
const KindCSS ProjectKind = "css"

// plan dispatches to the right emitter and returns the list of files to
// write. It never touches the filesystem itself.
func plan(brand *client.ResolvedBrand, det Detection) ([]PlannedWrite, error) {
	switch det.Kind {
	case KindTailwind:
		pw, err := EmitTailwind(brand, det.Path)
		if err != nil {
			return nil, err
		}
		return []PlannedWrite{pw}, nil
	case KindXcode:
		return []PlannedWrite{EmitSwift(brand, det.Path)}, nil
	case KindAndroid:
		return []PlannedWrite{EmitAndroid(brand, projectRootFromAndroid(det.Path))}, nil
	case KindCSS, KindGenericWeb:
		root := det.Path
		// If det.Path points to a file rather than a directory, walk up.
		if st, err := os.Stat(root); err == nil && !st.IsDir() {
			root = filepath.Dir(root)
		}
		return []PlannedWrite{EmitCSS(brand, root)}, nil
	default:
		return nil, ErrDetectionFailed
	}
}

// projectRootFromAndroid takes either an AndroidManifest.xml path or a
// project root and returns the project root.
func projectRootFromAndroid(p string) string {
	if strings.HasSuffix(p, "AndroidManifest.xml") {
		// app/src/main/AndroidManifest.xml → project root is three up.
		return filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(p))))
	}
	return p
}

func printDryRun(w io.Writer, plan []PlannedWrite) {
	for _, p := range plan {
		fmt.Fprintf(w, "[dry-run] would write %s (%s)\n", p.Path, p.Kind)
		if p.Diff != "" {
			fmt.Fprintln(w)
			fmt.Fprint(w, p.Diff)
			fmt.Fprintln(w)
		} else if len(p.Contents) > 0 {
			fmt.Fprintln(w)
			fmt.Fprintln(w, "--- file contents ---")
			fmt.Fprintln(w, string(p.Contents))
			fmt.Fprintln(w, "--- end ---")
		}
	}
}

func writePlanned(p PlannedWrite, opts Options) error {
	if _, err := os.Stat(p.Path); err == nil && !opts.Force {
		// Existing file — prompt unless --force.
		fmt.Fprintf(opts.Stdout, "%s already exists. Overwrite? [y/N] ", p.Path)
		reader := bufio.NewReader(opts.Stdin)
		line, _ := reader.ReadString('\n')
		line = strings.ToLower(strings.TrimSpace(line))
		if line != "y" && line != "yes" {
			fmt.Fprintln(opts.Stdout, "skipped.")
			return nil
		}
	}
	if err := os.MkdirAll(filepath.Dir(p.Path), 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(p.Path), err)
	}
	if err := os.WriteFile(p.Path, p.Contents, 0o644); err != nil {
		return fmt.Errorf("write %s: %w", p.Path, err)
	}
	fmt.Fprintf(opts.Stdout, "wrote %s\n", p.Path)
	return nil
}
