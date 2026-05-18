// Package config holds compile-time and runtime configuration for brandatom.
package config

// Version is the CLI version string. Bumped at release time.
const Version = "0.1.0"

// DefaultBaseURL is the canonical encyclopedia host. Override with --base-url
// for local development against `python3 -m http.server` or a staging
// deployment.
const DefaultBaseURL = "https://brand-atoms.com"

// UserAgent is sent on every HTTP request so the encyclopedia host can
// distinguish CLI traffic from browsers.
var UserAgent = "brandatom/" + Version
