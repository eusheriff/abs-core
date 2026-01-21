import {
  Terminal,
  Shield,
  Zap,
  Lock,
  Github,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur fixed w-full z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <Shield className="w-6 h-6 text-orange-500" />
            <span>
              ABS<span className="text-zinc-500">Core</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a
              href="https://github.com/eusheriff/abs-core"
              className="hover:text-orange-500 transition-colors flex items-center gap-2"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
            <a
              href="https://oconnector.tech/abs"
              className="bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
            >
              Get Enterprise
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-6">
          v2.7.0 is now available
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          Execution Governance <br /> for AI Agents.
        </h1>
        ABS Core is a <b>runtime safety layer</b> that prevents LLMs from executing
        dangerous actions.
        <br className="hidden md:block" />
        Protects Business Agents <b>AND</b> Coding Assistants (Cursor, Copilot)
        from destruction.
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-0 rounded-lg bg-zinc-900 border border-zinc-800 p-1 pl-4 pr-1">
            <span className="text-zinc-400 font-mono text-sm mr-4">
              $ npm install @abs/scan
            </span>
            <button
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded transition-colors"
              title="Copy"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>
          <a
            href="#compare"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            Compare Editions <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Protection Everywhere */}
      <section className="px-6 max-w-6xl mx-auto mb-32">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 flex flex-col justify-center">
            <h3 className="text-2xl font-bold mb-2">Available for VS Code</h3>
            <p className="text-zinc-400 mb-6 max-w-md">
              Install the official extension to supervise your AI Coding Agents
              (Cursor, Copilot) directly in the editor.
            </p>
            <div className="flex gap-4">
              <a
                href="https://marketplace.visualstudio.com/items?itemName=oconnector.abs-vscode"
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg"
                  className="w-5 h-5"
                  alt="VS Code"
                />
                Install Extension
              </a>
              <a
                href="https://github.com/eusheriff/abs-core"
                className="border border-zinc-700 hover:bg-zinc-800 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Source
              </a>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-bold">Latency &lt; 10ms</h3>
            <p className="text-sm text-zinc-500 mt-2">
              Powered by Cloudflare Workers & D1 on the Edge.
            </p>
          </div>
        </div>
      </section>

      {/* Code Demo */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl shadow-orange-500/10">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
            </div>
            <span className="ml-2 text-xs text-zinc-500 font-mono">
              scanner-demo.ts
            </span>
          </div>
          <div className="p-6 font-mono text-sm overflow-x-auto">
            <div className="text-zinc-400">
              import <span className="text-white">{`{ ABS }`}</span> from{" "}
              <span className="text-green-400">'@abs/scan'</span>;
            </div>
            <div className="h-4" />
            <div className="text-zinc-500">// 1. Initialize local scanner</div>
            <div className="text-zinc-400">
              const abs = new <span className="text-orange-400">ABS</span>(
              {`{ mode: 'scanner' }`});
            </div>
            <div className="h-4" />
            <div className="text-zinc-500">
              // 2. Log AI interactions (Non-blocking)
            </div>
            <div className="text-purple-400">
              await <span className="text-blue-400">abs.log</span>({`{`}
            </div>
            <div className="text-zinc-300 pl-4">
              input:{" "}
              <span className="text-green-400">
                "Delete production database"
              </span>
              ,
            </div>
            <div className="text-zinc-300 pl-4">
              output:{" "}
              <span className="text-green-400">
                "Executing DELETE schema..."
              </span>
              ,
            </div>
            <div className="text-zinc-300 pl-4">
              policy: <span className="text-green-400">"strict-safety"</span>
            </div>
            <div className="text-purple-400">{"}"});</div>
            <div className="h-4" />
            <div className="text-zinc-500">
              // Output: [ABS Scanner 🛡️] Policy Violation Detected!
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="px-6 max-w-6xl mx-auto mb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Choose your Protection Level
          </h2>
          <p className="text-zinc-400">
            Start with visibility, upgrade to enforcement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Community */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-zinc-800">
                <Terminal className="w-6 h-6 text-zinc-300" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Community Scanner</h3>
                <p className="text-sm text-zinc-400">Local Development SDK</p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <FeatureItem text="Local Console Logging" check={true} />
              <FeatureItem text="Basic Policy Syntax" check={true} />
              <FeatureItem text="'Shadow Mode' Auditing" check={true} />
              <FeatureItem text="Real-time Blocking" check={false} />
              <FeatureItem text="Centralized Dashboard" check={false} />
              <FeatureItem text="MCP / Agent Integration" check={false} />
            </div>
            <div className="mt-auto">
              <div className="text-2xl font-bold mb-1">Free</div>
              <p className="text-xs text-zinc-500 mb-6">Open Source (Apache 2.0)</p>
              <button className="w-full py-3 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors font-medium">
                View Documentation
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/5 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMMENDED
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-orange-500/20">
                <Lock className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Enterprise Runtime
                </h3>
                <p className="text-sm text-orange-200">
                  Production Enforcement
                </p>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              <FeatureItem
                text="Everything in Scanner"
                check={true}
                highlight
              />
              <FeatureItem
                text="Real-time Blocking (MCP)"
                check={true}
                highlight
              />
              <FeatureItem text="Forensic Audit Logs" check={true} highlight />
              <FeatureItem
                text="Coding Agent Safeguards 🛡️"
                check={true}
                highlight
              />
              <FeatureItem
                text="Cloudflare Edge Deploy"
                check={true}
                highlight
              />
              <FeatureItem text="SSO & RBAC" check={true} highlight />
              <FeatureItem text="SLA & Support" check={true} highlight />
            </div>
            <div className="mt-auto">
              <div className="text-2xl font-bold mb-1">Custom</div>
              <p className="text-xs text-orange-200/60 mb-6">
                Volume-based licensing
              </p>
              <a
                href="https://oconnector.tech/abs"
                className="block w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-500 transition-colors font-medium text-center"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 text-center text-zinc-500 text-sm">
        <p>
          &copy; {new Date().getFullYear()} OConnector. All rights reserved.
        </p>
        <p className="mt-2">ABS Core is an open-source initiative.</p>
      </footer>
    </div>
  );
}

function FeatureItem({
  text,
  check,
  highlight,
}: {
  text: string;
  check: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {check ? (
        <Check
          className={`w-5 h-5 ${highlight ? "text-orange-500" : "text-zinc-500"}`}
        />
      ) : (
        <X className="w-5 h-5 text-zinc-700" />
      )}
      <span className={check ? "text-zinc-300" : "text-zinc-600"}>{text}</span>
    </div>
  );
}
