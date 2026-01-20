
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, Copy, LogOut, Shield } from "lucide-react";

export default function DashboardPage() {
  const [token, setToken] = useState("");
  const [cmd, setCmd] = useState("");
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("abs_session");
    if (!session) router.push("/login");
  }, [router]);

  const generateToken = async () => {
    const session = localStorage.getItem("abs_session");
    const res = await fetch("https://auth-worker.dev-oconnector.workers.dev/token", {
      method: "POST",
      headers: { "Authorization": `Bearer ${session}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      setToken(data.accessToken);
      setCmd(data.dummy_cmd);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <nav className="border-b border-zinc-800 bg-black/50 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="w-5 h-5 text-orange-500" />
            <span>ABS Console</span>
          </div>
          <button onClick={() => { localStorage.removeItem("abs_session"); router.push("/"); }} className="text-zinc-500 hover:text-white">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 mt-8">
        <h1 className="text-2xl font-bold mb-2">Developer Settings</h1>
        <p className="text-zinc-400 mb-8">Manage your access tokens for the CLI and MCP Runtime.</p>

        <div className="bg-black border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-4">Personal Access Tokens</h2>
          
          {!token ? (
            <button onClick={generateToken} className="bg-white text-black px-4 py-2 rounded hover:bg-zinc-200 font-medium">
              Generate New Token
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="p-4 bg-zinc-900 rounded border border-zinc-800">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Your Token (Copy Config)</label>
                <div className="mt-2 flex items-center justify-between text-green-400 font-mono text-sm">
                  <span className="break-all">{token}</span>
                  <Copy className="w-4 h-4 cursor-pointer hover:text-white" />
                </div>
              </div>
              
              <div className="p-4 bg-zinc-900 rounded border border-zinc-800">
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Quick Setup</label>
                <div className="mt-2 text-zinc-300 font-mono text-sm max-w-full overflow-x-auto whitespace-nowrap">
                  {cmd}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
