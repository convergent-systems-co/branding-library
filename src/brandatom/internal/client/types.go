// Package client knows how to talk to the brand-atoms.com encyclopedia:
// the catalog index at /dist/index.json and the per-brand resolved JSON
// at /dist/brands/<slug>/<version>/json/brand.json.
package client

// CatalogIndex mirrors the JSON written by tools/build.ts.
type CatalogIndex struct {
	SchemaVersion string           `json:"schemaVersion"`
	Generated     string           `json:"generated"`
	Brands        []CatalogBrand   `json:"brands"`
	Palettes      []CatalogPalette `json:"palettes"`
	Fonts         []CatalogFont    `json:"fonts"`
}

// CatalogBrand is one summarized brand row in the index.
type CatalogBrand struct {
	Slug        string            `json:"slug"`
	Version     string            `json:"version"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Tags        []string          `json:"tags"`
	PaletteRef  string            `json:"paletteRef"`
	FontRefs    map[string]string `json:"fontRefs"`
	Identity    string            `json:"identity"`
	Primary     string            `json:"primary"`
	Accent      string            `json:"accent"`
	AssetCount  int               `json:"assetCount"`
	RuleCount   int               `json:"ruleCount"`
}

// CatalogPalette is one summarized palette row.
type CatalogPalette struct {
	Slug        string   `json:"slug"`
	Version     string   `json:"version"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	SwatchCount int      `json:"swatchCount"`
	Preview     []string `json:"preview"`
	HasLight    bool     `json:"hasLight"`
	HasDark     bool     `json:"hasDark"`
}

// CatalogFont is one summarized font row.
type CatalogFont struct {
	Slug           string `json:"slug"`
	Version        string `json:"version"`
	Name           string `json:"name"`
	Family         string `json:"family"`
	Classification string `json:"classification"`
	License        string `json:"license"`
	IsVariable     bool   `json:"isVariable"`
	WeightRange    []int  `json:"weightRange"`
}

// Swatch matches the swatch shape inside a resolved brand.json.
type Swatch struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Value       string   `json:"value"`
	Description string   `json:"description,omitempty"`
	Aliases     []string `json:"aliases,omitempty"`
}

// PaletteMode is one mode's role→swatch-id map.
type PaletteMode struct {
	Roles map[string]string `json:"roles"`
}

// BrandPalette is the palette block inside a resolved brand.
type BrandPalette struct {
	Ref      string   `json:"ref"`
	Swatches []Swatch `json:"swatches"`
	Modes    struct {
		Light PaletteMode `json:"light"`
		Dark  PaletteMode `json:"dark"`
	} `json:"modes"`
}

// BrandFont is one font reference inside a resolved brand.
type BrandFont struct {
	Role           string   `json:"role"`
	Ref            string   `json:"ref"`
	Family         string   `json:"family"`
	Classification string   `json:"classification"`
	FallbackStack  []string `json:"fallbackStack"`
}

// BrandRoles holds the brand's semantic role mappings.
type BrandRoles struct {
	Colors     map[string]string `json:"colors"`
	Typography map[string]string `json:"typography"`
}

// ResolvedBrand mirrors dist/brands/<slug>/<version>/json/brand.json.
type ResolvedBrand struct {
	ID          string       `json:"id"`
	Version     string       `json:"version"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Tags        []string     `json:"tags"`
	Palette     BrandPalette `json:"palette"`
	Fonts       []BrandFont  `json:"fonts"`
	Roles       BrandRoles   `json:"roles"`
}

// SwatchHex returns the hex value for the given swatch id, or "" if not found.
func (b *ResolvedBrand) SwatchHex(id string) string {
	if id == "" {
		return ""
	}
	for _, sw := range b.Palette.Swatches {
		if sw.ID == id {
			return sw.Value
		}
	}
	return ""
}

// RoleHex resolves a role through brand-level overrides first, then the
// palette's mode roles. Matches the TS brandTheme() resolution.
func (b *ResolvedBrand) RoleHex(role string, mode string) string {
	if b.Roles.Colors != nil {
		if swID, ok := b.Roles.Colors[role]; ok {
			if hex := b.SwatchHex(swID); hex != "" {
				return hex
			}
		}
	}
	var modeRoles map[string]string
	if mode == "dark" {
		modeRoles = b.Palette.Modes.Dark.Roles
	} else {
		modeRoles = b.Palette.Modes.Light.Roles
	}
	if modeRoles != nil {
		if swID, ok := modeRoles[role]; ok {
			if hex := b.SwatchHex(swID); hex != "" {
				return hex
			}
		}
	}
	return ""
}
