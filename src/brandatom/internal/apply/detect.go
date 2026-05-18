package apply

import (
	"os"
	"path/filepath"
	"strings"
)

// ProjectKind enumerates the project shapes brandatom knows how to emit
// into. Detection prefers more-specific kinds over more-generic ones —
// a Next.js repo will be detected as Tailwind, not GenericWeb.
type ProjectKind string

const (
	KindUnknown     ProjectKind = "unknown"
	KindTailwind    ProjectKind = "tailwind"
	KindXcode       ProjectKind = "xcode"
	KindAndroid     ProjectKind = "android"
	KindGenericWeb  ProjectKind = "generic-web"
)

// Detection captures the result of inspecting a directory for project
// markers. `Path` points at the file that triggered the match (e.g. the
// tailwind config), which downstream emitters use as the injection target.
type Detection struct {
	Kind ProjectKind
	Path string
}

// Detect scans `root` and returns the first matching project kind. It
// never returns an error — a missing or unreadable directory just means
// `KindUnknown`.
func Detect(root string) Detection {
	if d, ok := detectTailwind(root); ok {
		return d
	}
	if d, ok := detectXcode(root); ok {
		return d
	}
	if d, ok := detectAndroid(root); ok {
		return d
	}
	if d, ok := detectGenericWeb(root); ok {
		return d
	}
	return Detection{Kind: KindUnknown}
}

// detectTailwind looks for tailwind.config.{js,ts,mjs,cjs} up to depth 2.
func detectTailwind(root string) (Detection, bool) {
	candidates := []string{
		"tailwind.config.js",
		"tailwind.config.ts",
		"tailwind.config.mjs",
		"tailwind.config.cjs",
	}
	// Depth 0 (root) and depth 1 (immediate subdirs).
	for _, name := range candidates {
		p := filepath.Join(root, name)
		if fileExists(p) {
			return Detection{Kind: KindTailwind, Path: p}, true
		}
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return Detection{}, false
	}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		if strings.HasPrefix(e.Name(), ".") || e.Name() == "node_modules" {
			continue
		}
		for _, name := range candidates {
			p := filepath.Join(root, e.Name(), name)
			if fileExists(p) {
				return Detection{Kind: KindTailwind, Path: p}, true
			}
		}
	}
	return Detection{}, false
}

// detectXcode looks for any *.xcodeproj directory at the root.
func detectXcode(root string) (Detection, bool) {
	entries, err := os.ReadDir(root)
	if err != nil {
		return Detection{}, false
	}
	for _, e := range entries {
		if e.IsDir() && strings.HasSuffix(e.Name(), ".xcodeproj") {
			return Detection{Kind: KindXcode, Path: filepath.Join(root, e.Name())}, true
		}
	}
	return Detection{}, false
}

// detectAndroid looks for the canonical app/src/main/AndroidManifest.xml
// or a build.gradle alongside an `app/` directory.
func detectAndroid(root string) (Detection, bool) {
	manifest := filepath.Join(root, "app", "src", "main", "AndroidManifest.xml")
	if fileExists(manifest) {
		return Detection{Kind: KindAndroid, Path: manifest}, true
	}
	gradle := filepath.Join(root, "build.gradle")
	gradleKts := filepath.Join(root, "build.gradle.kts")
	if (fileExists(gradle) || fileExists(gradleKts)) && dirExists(filepath.Join(root, "app")) {
		return Detection{Kind: KindAndroid, Path: root}, true
	}
	return Detection{}, false
}

// detectGenericWeb falls back to package.json or any top-level HTML/CSS.
func detectGenericWeb(root string) (Detection, bool) {
	pkg := filepath.Join(root, "package.json")
	if fileExists(pkg) {
		return Detection{Kind: KindGenericWeb, Path: root}, true
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return Detection{}, false
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if strings.HasSuffix(name, ".html") || strings.HasSuffix(name, ".css") {
			return Detection{Kind: KindGenericWeb, Path: root}, true
		}
	}
	return Detection{}, false
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func dirExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && st.IsDir()
}
