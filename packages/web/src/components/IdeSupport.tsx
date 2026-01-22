"use client";

import { motion } from "framer-motion";

const ides = [
  {
    name: "VS Code",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg",
    status: "Native",
  },
  {
    name: "Cursor",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e1/Cursor_Inc._logo.svg",
    status: "Verified",
    custom: true
  },
  {
    name: "Windsurf",
    logo: "https://codeium.com/static/brand/windsurf_logo.svg", 
    status: "Compatible",
    custom: true
  },
  {
    name: "VSCodium",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/18/VSCodium_logo.svg",
    status: "Supported",
  },
];

export default function IdeSupport() {
  return (
    <div className="w-full pt-6 border-t border-zinc-800">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mr-2">Supported:</span>
        {ides.map((ide, index) => (
          <motion.div
            key={ide.name}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2 group cursor-default opacity-70 hover:opacity-100 transition-opacity"
            title={`${ide.name} (${ide.status})`}
          >
            <div className="relative w-6 h-6 grayscale group-hover:grayscale-0 transition-all duration-300">
              <img 
                src={ide.logo} 
                alt={ide.name}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
              {ide.name}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
