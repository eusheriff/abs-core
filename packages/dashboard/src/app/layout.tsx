import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABS Governance Dashboard",
  description: "Enterprise Control Plane for AI Decisions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <nav className="border-b border-white/10 bg-slate-900 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                     <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        ABS Enterprise
                     </span>
                     <span className="px-2 py-0.5 text-xs bg-cyan-950 text-cyan-400 rounded border border-cyan-800">
                        v0.6-alpha
                     </span>
                </div>
            </div>
        </nav>
        <main className="max-w-7xl mx-auto p-6">
            {children}
        </main>
      </body>
    </html>
  );
}
