require "language/node"

class Abs < Formula
  desc "ABS Core Runtime & CLI (Autonomous Business System)"
  homepage "https://abscore.app"
  license "Apache-2.0"
  head "https://github.com/eusheriff/abs-core.git", branch: "main"

  depends_on "node"

  def install
    # Focus on the core package
    cd "packages/core" do
      system "npm", "install", *Language::Node.local_npm_install_args
      system "npm", "run", "build"
      
      # Copy specific artifacts to libexec
      libexec.install "dist"
      libexec.install "package.json"
      libexec.install "node_modules"
    end

    # Symlink the CLI entrypoint
    bin.install_symlink libexec/"dist/cli/index.js" => "abs"
  end


  test do
    system "#{bin}/abs", "--version"
  end
end
