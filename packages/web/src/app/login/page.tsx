
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("https://auth-worker.dev-oconnector.workers.dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error("Invalid credentials");

      const data = await res.json();
      localStorage.setItem("abs_session", data.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Login failed. Check your credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8">
        <div className="flex items-center gap-2 font-bold text-2xl justify-center mb-8">
          <Shield className="w-8 h-8 text-orange-500" />
          <span>ABS<span className="text-zinc-500">Core</span></span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-orange-500 outline-none"
              placeholder="dev@oconnector.tech"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-white focus:border-orange-500 outline-none"
              placeholder="••••••••"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" className="w-full bg-white text-black font-bold py-2 rounded hover:bg-zinc-200 transition-colors">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
