# Homebrew formula for brandatom.
#
# DRAFT. Placeholder URL/SHA values are filled in by the release workflow
# (see .github/workflows/brandatom-release.yml). The cross-repo push to
# convergent-systems-co/homebrew-tap is intentionally manual — see the
# TODO in that workflow.
class Brandatom < Formula
  desc "Command-line client for brand-atoms.com — browse and apply brand kits"
  homepage "https://brand-atoms.com"
  version "0.1.1"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/convergent-systems-co/branding-library/releases/download/brandatom-v#{version}/brandatom-darwin-arm64.tar.gz"
      sha256 "REPLACE_WITH_DARWIN_ARM64_SHA256"
    else
      url "https://github.com/convergent-systems-co/branding-library/releases/download/brandatom-v#{version}/brandatom-darwin-amd64.tar.gz"
      sha256 "REPLACE_WITH_DARWIN_AMD64_SHA256"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/convergent-systems-co/branding-library/releases/download/brandatom-v#{version}/brandatom-linux-arm64.tar.gz"
      sha256 "REPLACE_WITH_LINUX_ARM64_SHA256"
    else
      url "https://github.com/convergent-systems-co/branding-library/releases/download/brandatom-v#{version}/brandatom-linux-amd64.tar.gz"
      sha256 "REPLACE_WITH_LINUX_AMD64_SHA256"
    end
  end

  def install
    bin.install "brandatom"
  end

  test do
    assert_match "brandatom #{version}", shell_output("#{bin}/brandatom --version")
  end
end
