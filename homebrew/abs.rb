class Abs < Formula
  desc "ABS Core Runtime & CLI (Autonomous Business System)"
  homepage "https://abscore.app"
  license "Apache-2.0"
  head "https://github.com/eusheriff/abs-core.git", branch: "main"

  depends_on "node@18" => :build

  def install
    # Installing dependencies
    system "npm", "install"
    
    # Building the optimized binary for Apple Silicon (arm64)
    system "npm", "run", "build:binary", "--workspace=@abs/core"

    # Install the binary
    bin.install "packages/core/dist/abs" => "abs"
  end

  test do
    system "#{bin}/abs", "--version"
  end
end
