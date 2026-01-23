require "language/node"

class Abs < Formula
  desc "ABS Core Runtime & CLI (Autonomous Business System)"
  homepage "https://abscore.app"
  license "Apache-2.0"
  head "https://github.com/eusheriff/abs-core.git", branch: "main"

  depends_on "node"

  def install
    # 1. Install dependencies (including devDeps for build)
    system "npm", "install", *Language::Node.local_npm_install_args

    # 2. Build the project (TypeScript -> JS)
    system "npm", "run", "build"

    # 3. Clean up dev dependencies to reduce size (Optional, avoiding for now to be safe)
    # system "npm", "prune", "--production"

    # 4. Copy everything to libexec (Homebrew's private directory for this formula)
    libexec.install Dir["*"]

    # 5. Symlink the CLI entrypoint
    # Note: 'local_npm_install_args' keeps the repo structure as is.
    # So we point to packages/core/dist/cli/index.js
    bin.install_symlink libexec/"packages/core/dist/cli/index.js" => "abs"
  end


  test do
    system "#{bin}/abs", "--version"
  end
end
