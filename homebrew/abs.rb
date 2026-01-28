require "language/node"

class Abs < Formula
  desc "ABS Core Runtime & CLI (Autonomous Business System)"
  homepage "https://abscore.app"
  license "Apache-2.0"
  head "https://github.com/eusheriff/abs-core.git", branch: "main"

  depends_on "node"
  depends_on "pnpm"

  def install
    # Focus on the core package
    cd "packages/core" do
      # Use pnpm to bypass local npm corruption
      system "pnpm", "install"
      system "pnpm", "run", "build"
      
      # Copy artifacts
      libexec.install "dist"
      libexec.install "package.json"
      # Config loader needs node_modules
      libexec.install "node_modules"
    end

    # Symlink the CLI entrypoint
    bin.install_symlink libexec/"dist/cli/index.js" => "abs"
  end


  test do
    system "#{bin}/abs", "--version"
  end
end
