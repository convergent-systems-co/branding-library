package list

// SpecimenLine is the pangram printed under each font. Plain ASCII —
// no font rendering happens in the terminal, this is just to remind
// the reader the encyclopedia ships a specimen.
const SpecimenLine = "The quick brown fox jumps over 13 lazy dogs."

// FormatSpecimen styles the specimen line based on classification.
// Serifs get italic; everything else gets dim.
func FormatSpecimen(classification string, color bool) string {
	switch classification {
	case "serif", "slab-serif":
		return Italic(SpecimenLine, color)
	default:
		return Dim(SpecimenLine, color)
	}
}
