// Command brandatom is the brand-atoms.com command-line client. It lets
// users browse the encyclopedia (brands, palettes, fonts) and apply a
// brand to the current project.
package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/apply"
	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/client"
	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/config"
	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/list"
)

// Exit codes — documented in the README so callers can rely on them.
const (
	ExitOK              = 0
	ExitGenericError    = 1
	ExitNotFound        = 2
	ExitDetectionFailed = 3
)

type globalFlags struct {
	baseURL string
	noColor bool
	help    bool
	version bool
	json    bool
}

func main() {
	os.Exit(run(os.Args[1:]))
}

func run(args []string) int {
	gf, rest, err := parseGlobalFlags(args)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return ExitGenericError
	}
	if gf.help {
		printHelp()
		return ExitOK
	}
	if gf.version {
		fmt.Println("brandatom", config.Version)
		return ExitOK
	}
	if len(rest) == 0 {
		printHelp()
		return ExitOK
	}

	colorOn := decideColor(gf.noColor)
	c := client.New(gf.baseURL)
	ctx := context.Background()

	switch rest[0] {
	case "brands":
		return runBrands(ctx, c, rest[1:], colorOn, gf)
	case "palettes":
		return runPalettes(ctx, c, rest[1:], colorOn, gf)
	case "fonts":
		return runFonts(ctx, c, rest[1:], colorOn, gf)
	case "brand":
		return runBrandSubcommand(ctx, c, rest[1:], colorOn, gf)
	case "help", "--help", "-h":
		printHelp()
		return ExitOK
	default:
		fmt.Fprintf(os.Stderr, "unknown command: %s\n", rest[0])
		printHelp()
		return ExitGenericError
	}
}

func runBrands(ctx context.Context, c *client.Client, args []string, color bool, gf globalFlags) int {
	if len(args) == 0 || args[0] != "list" {
		fmt.Fprintln(os.Stderr, "usage: brandatom brands list")
		return ExitGenericError
	}
	opts := list.Options{Color: color, JSON: gf.json}
	if err := list.Brands(ctx, c, os.Stdout, opts); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return classifyErr(err)
	}
	return ExitOK
}

func runPalettes(ctx context.Context, c *client.Client, args []string, color bool, gf globalFlags) int {
	if len(args) == 0 || args[0] != "list" {
		fmt.Fprintln(os.Stderr, "usage: brandatom palettes list")
		return ExitGenericError
	}
	opts := list.Options{Color: color, JSON: gf.json}
	if err := list.Palettes(ctx, c, os.Stdout, opts); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return classifyErr(err)
	}
	return ExitOK
}

func runFonts(ctx context.Context, c *client.Client, args []string, color bool, gf globalFlags) int {
	if len(args) == 0 || args[0] != "list" {
		fmt.Fprintln(os.Stderr, "usage: brandatom fonts list")
		return ExitGenericError
	}
	opts := list.Options{Color: color, JSON: gf.json}
	if err := list.Fonts(ctx, c, os.Stdout, opts); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return classifyErr(err)
	}
	return ExitOK
}

// runBrandSubcommand dispatches `brandatom brand <slug>@<version> {apply|show}`.
func runBrandSubcommand(ctx context.Context, c *client.Client, args []string, _ bool, _ globalFlags) int {
	if len(args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: brandatom brand <slug>@<version> {apply|show} [flags]")
		return ExitGenericError
	}
	ref := args[0]
	verb := args[1]
	rest := args[2:]

	slug, version, ok := parseBrandRef(ref)
	if !ok {
		fmt.Fprintln(os.Stderr, "error: brand reference must be <slug>@<version> (e.g. convergent-systems@1.0.0)")
		return ExitGenericError
	}

	switch verb {
	case "apply":
		return runBrandApply(ctx, c, slug, version, rest)
	case "show":
		return runBrandShow(ctx, c, slug, version)
	default:
		fmt.Fprintf(os.Stderr, "unknown brand verb: %s (expected apply|show)\n", verb)
		return ExitGenericError
	}
}

func runBrandApply(ctx context.Context, c *client.Client, slug, version string, args []string) int {
	var dryRun, force bool
	var format string
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--dry-run":
			dryRun = true
		case "--force":
			force = true
		case "--format":
			if i+1 >= len(args) {
				fmt.Fprintln(os.Stderr, "--format requires a value (css|tailwind|swift|android)")
				return ExitGenericError
			}
			format = args[i+1]
			i++
		default:
			fmt.Fprintf(os.Stderr, "unknown flag for apply: %s\n", args[i])
			return ExitGenericError
		}
	}
	brand, _, err := c.FetchBrand(ctx, slug, version)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return classifyErr(err)
	}
	root, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: cwd:", err)
		return ExitGenericError
	}
	opts := apply.Options{
		Root:   root,
		DryRun: dryRun,
		Force:  force,
		Format: format,
	}
	if err := apply.Run(ctx, brand, opts); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		if errors.Is(err, apply.ErrDetectionFailed) {
			return ExitDetectionFailed
		}
		return classifyErr(err)
	}
	return ExitOK
}

func runBrandShow(ctx context.Context, c *client.Client, slug, version string) int {
	_, body, err := c.FetchBrand(ctx, slug, version)
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		return classifyErr(err)
	}
	os.Stdout.Write(body)
	if len(body) > 0 && body[len(body)-1] != '\n' {
		fmt.Println()
	}
	return ExitOK
}

func parseBrandRef(s string) (slug, version string, ok bool) {
	i := strings.Index(s, "@")
	if i <= 0 || i == len(s)-1 {
		return "", "", false
	}
	return s[:i], s[i+1:], true
}

func classifyErr(err error) int {
	if errors.Is(err, client.ErrNotFound) {
		return ExitNotFound
	}
	return ExitGenericError
}

// parseGlobalFlags pulls --base-url, --no-color, --json, --help,
// --version out of the argv. Everything else is returned as positional.
func parseGlobalFlags(args []string) (globalFlags, []string, error) {
	gf := globalFlags{baseURL: config.DefaultBaseURL}
	rest := make([]string, 0, len(args))
	for i := 0; i < len(args); i++ {
		a := args[i]
		switch a {
		case "--base-url":
			if i+1 >= len(args) {
				return gf, nil, errors.New("--base-url requires a value")
			}
			gf.baseURL = args[i+1]
			i++
		case "--no-color":
			gf.noColor = true
		case "--json":
			gf.json = true
		case "-h", "--help":
			gf.help = true
		case "-V", "--version":
			gf.version = true
		default:
			rest = append(rest, a)
		}
	}
	return gf, rest, nil
}

// decideColor turns ANSI output on unless the user said --no-color or
// the NO_COLOR env var is set (https://no-color.org).
func decideColor(noColor bool) bool {
	if noColor {
		return false
	}
	if _, ok := os.LookupEnv("NO_COLOR"); ok {
		return false
	}
	return true
}

func printHelp() {
	fmt.Print(`brandatom — brand-atoms.com command-line client

Usage:
  brandatom brands list                       List all brands
  brandatom palettes list                     List all palettes
  brandatom fonts list                        List all fonts
  brandatom brand <slug>@<version> apply      Apply a brand to the current project
  brandatom brand <slug>@<version> show       Print the resolved brand JSON

Global flags:
  --base-url <url>    Override the encyclopedia host (default: https://brand-atoms.com)
  --no-color          Disable ANSI color output
  --json              On list commands, output raw JSON
  -h, --help          Show help
  -V, --version       Show version

Apply flags:
  --dry-run           Show what would be written; don't touch the filesystem
  --force             Overwrite existing files without prompting
  --format <name>     Force an emitter (css|tailwind|swift|android), skipping detection

Exit codes:
  0  success
  1  generic error
  2  not found (brand doesn't exist in the catalog)
  3  detection failure on apply
`)
}
