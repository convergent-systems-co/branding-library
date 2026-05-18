package apply

import (
	"os"
	"path/filepath"
	"testing"
)

// helper writes a file with empty contents; parent dirs are created.
func touch(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, nil, 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

// mkdir creates a directory (and parents).
func mkdir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
}

func TestDetect(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name  string
		setup func(t *testing.T, dir string)
		want  ProjectKind
	}{
		{
			name: "tailwind config at root",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "tailwind.config.js"))
			},
			want: KindTailwind,
		},
		{
			name: "tailwind config in subdir",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "web", "tailwind.config.ts"))
			},
			want: KindTailwind,
		},
		{
			name: "tailwind beats package.json",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "package.json"))
				touch(t, filepath.Join(dir, "tailwind.config.mjs"))
			},
			want: KindTailwind,
		},
		{
			name: "xcode project",
			setup: func(t *testing.T, dir string) {
				mkdir(t, filepath.Join(dir, "MyApp.xcodeproj"))
			},
			want: KindXcode,
		},
		{
			name: "android manifest",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "app", "src", "main", "AndroidManifest.xml"))
			},
			want: KindAndroid,
		},
		{
			name: "gradle + app dir",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "build.gradle"))
				mkdir(t, filepath.Join(dir, "app"))
			},
			want: KindAndroid,
		},
		{
			name: "package.json only",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "package.json"))
			},
			want: KindGenericWeb,
		},
		{
			name: "html file only",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "index.html"))
			},
			want: KindGenericWeb,
		},
		{
			name:  "empty dir",
			setup: func(t *testing.T, dir string) {},
			want:  KindUnknown,
		},
		{
			name: "node_modules is skipped for tailwind scan",
			setup: func(t *testing.T, dir string) {
				touch(t, filepath.Join(dir, "node_modules", "some-pkg", "tailwind.config.js"))
			},
			want: KindUnknown,
		},
	}
	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			dir := t.TempDir()
			tc.setup(t, dir)
			got := Detect(dir)
			if got.Kind != tc.want {
				t.Errorf("Detect(%s) = %s (path=%s), want %s", tc.name, got.Kind, got.Path, tc.want)
			}
		})
	}
}
