package apply

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/convergent-systems-co/branding-library/src/brandatom/internal/client"
)

// EmitTailwind plans an edit to an existing tailwind.config.{js,ts,mjs,cjs}.
// It is deliberately conservative: regex-based, no JS parser. The injected
// block is named `brandatom:` inside `theme.extend.colors`. If we can't
// find a safe insertion point we refuse rather than mangle the file.
func EmitTailwind(brand *client.ResolvedBrand, configPath string) (PlannedWrite, error) {
	src, err := os.ReadFile(configPath)
	if err != nil {
		return PlannedWrite{}, fmt.Errorf("read tailwind config: %w", err)
	}
	srcStr := string(src)

	// If brandatom: already exists, refuse — re-applying would create
	// a duplicate key. The user can delete the block manually or use
	// --force after we add that flow.
	if regexp.MustCompile(`(?m)^\s*brandatom\s*:`).MatchString(srcStr) {
		return PlannedWrite{
			Path: configPath,
			Kind: "tailwind",
		}, fmt.Errorf("tailwind config already contains a `brandatom:` key at %s — remove it first or use --force", configPath)
	}

	block := buildTailwindBlock(brand)

	// Try, in priority order:
	//   1. inject into existing `theme.extend.colors: { ... }`
	//   2. inject a colors key into existing `theme.extend: { ... }`
	//   3. inject a theme.extend block at the top of `theme: { ... }`
	//   4. inject a whole theme block at top of `module.exports = { ... }`
	patched, ok := injectIntoColors(srcStr, block)
	if !ok {
		patched, ok = injectIntoExtend(srcStr, block)
	}
	if !ok {
		patched, ok = injectIntoTheme(srcStr, block)
	}
	if !ok {
		return PlannedWrite{
			Path: configPath,
			Kind: "tailwind",
		}, fmt.Errorf("could not find a safe injection point in %s; please add a `theme.extend.colors.brandatom` object manually", configPath)
	}

	return PlannedWrite{
		Path:     configPath,
		Contents: []byte(patched),
		Kind:     "tailwind",
		Diff:     unifiedDiff(srcStr, patched, configPath),
	}, nil
}

func buildTailwindBlock(brand *client.ResolvedBrand) string {
	primary := brand.RoleHex("primary", "light")
	accent := brand.RoleHex("accent", "light")
	identity := brand.RoleHex("identity", "light")
	if identity == "" {
		identity = primary
	}
	surface := brand.RoleHex("surface", "light")
	text := brand.RoleHex("text-primary", "light")

	return fmt.Sprintf(`brandatom: {
        primary: '%s',
        accent: '%s',
        identity: '%s',
        surface: '%s',
        text: '%s',
      },`, primary, accent, identity, surface, text)
}

// Regex helpers. None of these understand JS — they look for canonical
// shapes Tailwind users actually write.

var (
	reColorsObj = regexp.MustCompile(`(?ms)(colors\s*:\s*\{)`)
	reExtendObj = regexp.MustCompile(`(?ms)(extend\s*:\s*\{)`)
	reThemeObj  = regexp.MustCompile(`(?ms)(theme\s*:\s*\{)`)
)

func injectIntoColors(src, block string) (string, bool) {
	idx := reColorsObj.FindStringSubmatchIndex(src)
	if idx == nil {
		return src, false
	}
	insertPos := idx[3] // end of the opening `{`
	indented := "\n        " + block
	return src[:insertPos] + indented + src[insertPos:], true
}

func injectIntoExtend(src, block string) (string, bool) {
	idx := reExtendObj.FindStringSubmatchIndex(src)
	if idx == nil {
		return src, false
	}
	insertPos := idx[3]
	indented := "\n      colors: {\n        " + block + "\n      },"
	return src[:insertPos] + indented + src[insertPos:], true
}

func injectIntoTheme(src, block string) (string, bool) {
	idx := reThemeObj.FindStringSubmatchIndex(src)
	if idx == nil {
		return src, false
	}
	insertPos := idx[3]
	indented := "\n    extend: {\n      colors: {\n        " + block + "\n      },\n    },"
	return src[:insertPos] + indented + src[insertPos:], true
}

// unifiedDiff produces a minimal context-free diff between original and
// patched source. It's not a true unified-diff format — just enough for
// a --dry-run preview.
func unifiedDiff(orig, patched, path string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "--- a/%s\n", path)
	fmt.Fprintf(&b, "+++ b/%s\n", path)
	origLines := strings.Split(orig, "\n")
	patchedLines := strings.Split(patched, "\n")
	// Find the first divergence.
	start := 0
	for start < len(origLines) && start < len(patchedLines) && origLines[start] == patchedLines[start] {
		start++
	}
	// Find the last divergence.
	endO := len(origLines)
	endP := len(patchedLines)
	for endO > start && endP > start && origLines[endO-1] == patchedLines[endP-1] {
		endO--
		endP--
	}
	// Print a small context window.
	ctxStart := max(0, start-2)
	ctxEndO := min(len(origLines), endO+2)
	ctxEndP := min(len(patchedLines), endP+2)
	fmt.Fprintf(&b, "@@ -%d,%d +%d,%d @@\n", ctxStart+1, ctxEndO-ctxStart, ctxStart+1, ctxEndP-ctxStart)
	for i := ctxStart; i < start; i++ {
		fmt.Fprintf(&b, " %s\n", origLines[i])
	}
	for i := start; i < endO; i++ {
		fmt.Fprintf(&b, "-%s\n", origLines[i])
	}
	for i := start; i < endP; i++ {
		fmt.Fprintf(&b, "+%s\n", patchedLines[i])
	}
	for i := endO; i < ctxEndO; i++ {
		fmt.Fprintf(&b, " %s\n", origLines[i])
	}
	return b.String()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
