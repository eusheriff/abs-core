#!/usr/bin/env node
import { Command } from "commander";
import { spawn } from "child_process";
import { resolve } from "path";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const program = new Command();

program
  .name("abs")
  .description("Autonomous Business Systems - Unified CLI")
  .version("0.5.0");

// Subcommand: SCAN
program
  .command("scan [path]")
  .description("Scan repository for governance risks")
  .action((path = ".") => {
    // Delegate to @abs/scan
    // We use spawn to run the binary from the sibling package for now
    // or directly require if we built it.
    // For dev simplicity (tsx), let's spawn tsx pointing to the scan package.

    const scanScript = resolve(__dirname, "../../scan/src/index.ts");

    console.log(`🚀 Delegating to ABS Scan...`);
    const child = spawn("npx", ["tsx", scanScript, path], {
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      process.exit(code || 0);
    });
  });

// Subcommand: SERVE (Core)
program
  .command("serve")
  .description("Start the ABS Core Runtime")
  .action(() => {
    const coreScript = resolve(__dirname, "../../core/src/api/server.ts");
    console.log(`🚀 Starting ABS Core Runtime...`);
    const child = spawn("npx", ["tsx", coreScript], {
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => {
      process.exit(code || 0);
    });
  });

program
  .command("simulate <event_type>")
  .description("Simulate an event through the runtime")
  .option("-f, --file <file>", "Payload file")
  .action((eventType, options) => {
    const cliScript = resolve(__dirname, "../../core/src/cli/index.ts");
    const args = ["tsx", cliScript, "simulate", eventType];
    if (options.file) {
      args.push("-f", options.file);
    }

    const child = spawn("npx", args, { stdio: "inherit", shell: true });
    child.on("exit", (code) => process.exit(code || 0));
  });

// -----------------------------------------------------------------------------
// 9. SHIMS CLEANUP (Legacy)
// -----------------------------------------------------------------------------
program
  .command("shims")
  .description("Manage legacy global shims")
  .command("remove")
  .description("Removes global shims (npm, node, etc) and cleans PATH")
  .action(async () => {
    const homeDir = os.homedir();
    const shimsDir = path.join(homeDir, ".abs", "shims");
    const absBinDir = path.join(homeDir, ".abs", "bin");

    console.log("🧹 Cleaning up legacy shims...");

    // 1. Remove Shims Directory
    if (fs.existsSync(shimsDir)) {
      console.log(`- Removing ${shimsDir}`);
      fs.rmSync(shimsDir, { recursive: true, force: true });
    }

    // 2. Remove Symlinks in bin
    const binInterceptors = ["npm", "node", "python", "python3", "pip", "git"];
    for (const tool of binInterceptors) {
      const linkPath = path.join(absBinDir, tool);
      if (fs.existsSync(linkPath)) {
        console.log(`- Removing interceptor: ${linkPath}`);
        try {
          fs.unlinkSync(linkPath);
        } catch (e) {}
      }
    }

    // 3. Clean Shell Configs
    const configs = [".zshrc", ".bashrc", ".profile", ".zshenv"];

    for (const cfg of configs) {
      const cfgPath = path.join(homeDir, cfg);
      if (fs.existsSync(cfgPath)) {
        let content = fs.readFileSync(cfgPath, "utf-8");
        const originalLines = content.split("\n");
        const newLines: string[] = [];
        let changed = false;

        for (const line of originalLines) {
          if (line.includes(".abs/shims")) {
            console.log(`- Removing line from ${cfg}: "${line.trim()}"`);
            changed = true;
          } else {
            newLines.push(line);
          }
        }

        if (changed) {
          fs.writeFileSync(cfgPath, newLines.join("\n"));
          console.log(`✅ Updated ${cfg}`);
        }
      }
    }

    console.log("\n✨ Cleanup complete. Please restart your terminal.");
  });

program.parse(process.argv);
