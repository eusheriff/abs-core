require "language/node"

class Abs < Formula
  desc "ABS Core Runtime & CLI (Autonomous Business System)"
  homepage "https://abscore.app"
  license "Apache-2.0"
  head "https://github.com/eusheriff/abs-core.git", branch: "main"

  depends_on "node"

  def install
    # Install dependencies
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    
    # Link the CLI manually since we are using workspaces
    # Pointing to the pre-compiled dist/cli/index.js
    bin.install_symlink Dir["#{libexec}/lib/node_modules/@abs/core/packages/core/dist/cli/index.js"].first => "abs"
  end

  test do
    system "#{bin}/abs", "--version"
  end
end
