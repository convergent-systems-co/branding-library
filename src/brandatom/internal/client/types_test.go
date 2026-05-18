package client

import (
	"encoding/json"
	"testing"
)

func TestCatalogIndexUnmarshal(t *testing.T) {
	t.Parallel()
	const raw = `{
	  "schemaVersion": "1",
	  "generated": "2026-05-17T20:00:00.000Z",
	  "brands": [
	    {
	      "slug": "convergent-systems",
	      "version": "1.0.0",
	      "name": "Convergent Systems",
	      "description": "Civilization-grade software.",
	      "tags": ["dark-first"],
	      "paletteRef": "convergent-deep-space@1.0.0",
	      "fontRefs": { "heading": "inter@1.0.0", "body": "inter@1.0.0" },
	      "identity": "#07090F",
	      "primary": "#5CD6FF",
	      "accent": "#F4C75E",
	      "assetCount": 4,
	      "ruleCount": 14
	    }
	  ],
	  "palettes": [
	    {
	      "slug": "nord",
	      "version": "1.0.0",
	      "name": "Nord",
	      "description": "Arctic-inspired.",
	      "tags": ["cool"],
	      "swatchCount": 16,
	      "preview": ["#2E3440", "#5E81AC"],
	      "hasLight": true,
	      "hasDark": true
	    }
	  ],
	  "fonts": [
	    {
	      "slug": "inter",
	      "version": "1.0.0",
	      "name": "Inter",
	      "family": "Inter",
	      "classification": "sans-serif",
	      "license": "OFL-1.1",
	      "isVariable": true,
	      "weightRange": [100, 900]
	    }
	  ]
	}`
	var idx CatalogIndex
	if err := json.Unmarshal([]byte(raw), &idx); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if idx.SchemaVersion != "1" {
		t.Errorf("schemaVersion: want 1, got %q", idx.SchemaVersion)
	}
	if len(idx.Brands) != 1 || idx.Brands[0].Slug != "convergent-systems" {
		t.Errorf("brands: %+v", idx.Brands)
	}
	if idx.Brands[0].FontRefs["heading"] != "inter@1.0.0" {
		t.Errorf("fontRefs.heading: %v", idx.Brands[0].FontRefs)
	}
	if len(idx.Palettes) != 1 || idx.Palettes[0].SwatchCount != 16 {
		t.Errorf("palettes: %+v", idx.Palettes)
	}
	if len(idx.Fonts) != 1 || !idx.Fonts[0].IsVariable || idx.Fonts[0].WeightRange[1] != 900 {
		t.Errorf("fonts: %+v", idx.Fonts)
	}
}

func TestResolvedBrandRoleHex(t *testing.T) {
	t.Parallel()
	b := &ResolvedBrand{
		Palette: BrandPalette{
			Swatches: []Swatch{
				{ID: "primary-blue", Value: "#0000FF"},
				{ID: "accent-gold", Value: "#FFD700"},
				{ID: "deep-canvas", Value: "#07090F"},
			},
			Modes: struct {
				Light PaletteMode `json:"light"`
				Dark  PaletteMode `json:"dark"`
			}{
				Light: PaletteMode{Roles: map[string]string{"primary": "primary-blue", "accent": "accent-gold"}},
				Dark:  PaletteMode{Roles: map[string]string{"primary": "primary-blue"}},
			},
		},
		Roles: BrandRoles{
			Colors: map[string]string{"identity": "deep-canvas"},
		},
	}
	tests := []struct {
		role string
		mode string
		want string
	}{
		{"primary", "light", "#0000FF"},
		{"accent", "light", "#FFD700"},
		{"identity", "light", "#07090F"}, // brand-level override
		{"missing", "light", ""},
		{"primary", "dark", "#0000FF"},
		{"accent", "dark", ""}, // not in dark mode
	}
	for _, tc := range tests {
		got := b.RoleHex(tc.role, tc.mode)
		if got != tc.want {
			t.Errorf("RoleHex(%q,%q) = %q, want %q", tc.role, tc.mode, got, tc.want)
		}
	}
}

func TestResolvedBrandUnmarshalFromBuildOutput(t *testing.T) {
	t.Parallel()
	// Mirrors the shape of dist/brands/<slug>/<version>/json/brand.json.
	const raw = `{
	  "id": "convergent-systems",
	  "version": "1.0.0",
	  "name": "Convergent Systems",
	  "description": "test",
	  "tags": ["dark-first"],
	  "palette": {
	    "ref": "convergent-deep-space@1.0.0",
	    "swatches": [
	      { "id": "deep-space-0", "name": "canvas", "value": "#07090F" },
	      { "id": "frost-cyan", "name": "primary", "value": "#5CD6FF" }
	    ],
	    "modes": {
	      "light": { "roles": { "primary": "frost-cyan", "background": "deep-space-0" } },
	      "dark":  { "roles": { "primary": "frost-cyan", "background": "deep-space-0" } }
	    }
	  },
	  "fonts": [
	    { "role": "heading", "ref": "inter@1.0.0", "family": "Inter", "classification": "sans-serif", "fallbackStack": [] }
	  ],
	  "roles": {
	    "colors": { "identity": "deep-space-0" },
	    "typography": { "display": "heading" }
	  }
	}`
	var b ResolvedBrand
	if err := json.Unmarshal([]byte(raw), &b); err != nil {
		t.Fatalf("unmarshal brand: %v", err)
	}
	if b.RoleHex("primary", "light") != "#5CD6FF" {
		t.Errorf("primary: %s", b.RoleHex("primary", "light"))
	}
	if b.RoleHex("identity", "light") != "#07090F" {
		t.Errorf("identity: %s", b.RoleHex("identity", "light"))
	}
	if b.SwatchHex("frost-cyan") != "#5CD6FF" {
		t.Errorf("SwatchHex: %s", b.SwatchHex("frost-cyan"))
	}
}
