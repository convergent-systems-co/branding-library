package list

import (
	"fmt"
	"strconv"
	"strings"
)

// ANSI helpers. We use 24-bit truecolor backgrounds for color swatches.
// Any terminal that doesn't understand these gets a literal "  " block —
// not ideal, but no worse than printing escapes.

const (
	ansiReset = "\x1b[0m"
	ansiDim   = "\x1b[2m"
	ansiBold  = "\x1b[1m"
	ansiItal  = "\x1b[3m"
)

// HexToRGB parses "#RRGGBB" or "#RRGGBBAA"; alpha is dropped (terminals
// have no concept of transparency). Returns false if the input doesn't
// look like a hex color.
func HexToRGB(hex string) (r, g, b int, ok bool) {
	hex = strings.TrimPrefix(strings.TrimSpace(hex), "#")
	if len(hex) != 6 && len(hex) != 8 {
		return 0, 0, 0, false
	}
	rv, err1 := strconv.ParseInt(hex[0:2], 16, 0)
	gv, err2 := strconv.ParseInt(hex[2:4], 16, 0)
	bv, err3 := strconv.ParseInt(hex[4:6], 16, 0)
	if err1 != nil || err2 != nil || err3 != nil {
		return 0, 0, 0, false
	}
	return int(rv), int(gv), int(bv), true
}

// SwatchBlock returns a 2-character colored block ("  ") for the given
// hex value, or two spaces when color is disabled or the hex doesn't
// parse.
func SwatchBlock(hex string, color bool) string {
	if !color {
		return "  "
	}
	r, g, b, ok := HexToRGB(hex)
	if !ok {
		return "  "
	}
	return fmt.Sprintf("\x1b[48;2;%d;%d;%dm  %s", r, g, b, ansiReset)
}

// SwatchRow returns a row of N swatch blocks. Used for brand cards and
// palette previews.
func SwatchRow(hexes []string, color bool) string {
	var b strings.Builder
	for _, h := range hexes {
		b.WriteString(SwatchBlock(h, color))
	}
	return b.String()
}

// PadRight pads `s` with spaces to width `n`. ANSI escape sequences are
// not counted toward visible width — we only call this on plain strings.
func PadRight(s string, n int) string {
	if len(s) >= n {
		return s
	}
	return s + strings.Repeat(" ", n-len(s))
}

// Dim wraps s in the ANSI dim escape (no-op if color is disabled).
func Dim(s string, color bool) string {
	if !color {
		return s
	}
	return ansiDim + s + ansiReset
}

// Bold wraps s in the ANSI bold escape.
func Bold(s string, color bool) string {
	if !color {
		return s
	}
	return ansiBold + s + ansiReset
}

// Italic wraps s in the ANSI italic escape.
func Italic(s string, color bool) string {
	if !color {
		return s
	}
	return ansiItal + s + ansiReset
}
