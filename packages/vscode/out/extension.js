"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const SidebarProvider_1 = require("./SidebarProvider");
const ABS_API_URL = "https://api.abscore.app";
// Helper to recursively get files excluding ignored directories
// Helper to identify "Smart Targets" (High Value Config Files)
function isSmartTarget(relativePath) {
    const filename = path.basename(relativePath);
    const lowercasePath = relativePath.toLowerCase();
    // 1. IDE Configuration
    if (lowercasePath.includes(".vscode/") || lowercasePath.includes(".idea/"))
        return true;
    if (filename === ".cursorrules" || filename === ".windsurfrules")
        return true;
    // 2. AI/LLM Rules
    if (lowercasePath.includes("prompts/") ||
        lowercasePath.includes("instructions/"))
        return true;
    if (filename.includes("copilot") || filename.includes("ai_config"))
        return true;
    // 3. Infrastructure & CI/CD
    if (lowercasePath.includes(".github/") || lowercasePath.includes(".gitlab/"))
        return true;
    if (filename === "Dockerfile" ||
        filename === "docker-compose.yml" ||
        filename === "wrangler.toml")
        return true;
    if (filename === "Jenkinsfile" || filename === "Makefile")
        return true;
    // 4. Critical Package Managers & Secrets
    if (filename === "package.json" ||
        filename === "go.mod" ||
        filename === "cargo.toml")
        return true;
    if (filename.startsWith(".env") || filename === ".npmrc")
        return true;
    return false;
}
// Optimized recursive scanner
function getSmartFiles(dirPath, rootPath, arrayOfFiles = []) {
    if (!fs.existsSync(dirPath))
        return arrayOfFiles;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        // Ignore noise
        if ([
            "node_modules",
            ".git",
            ".DS_Store",
            "dist",
            "out",
            "coverage",
            "build",
        ].includes(file))
            continue;
        const fullPath = path.join(dirPath, file);
        const relativePath = path.relative(rootPath, fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
            getSmartFiles(fullPath, rootPath, arrayOfFiles);
        }
        else {
            // Prioritize Smart Targets
            if (isSmartTarget(relativePath)) {
                arrayOfFiles.unshift(fullPath); // Add to TOP of list
            }
            else {
                // Should we include others? For now, add them at the end if space permits
                // But generally we rely on the smart filter.
                // Let's add everything but order matters.
                arrayOfFiles.push(fullPath);
            }
        }
    }
    return arrayOfFiles;
}
function activate(context) {
    console.log("ABS Core extension is now active!");
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("absSidebar", sidebarProvider));
    let outputChannel;
    let disposable = vscode.commands.registerCommand("abs.scanWorkspace", async () => {
        // Create output channel if it doesn't exist
        if (!outputChannel) {
            outputChannel = vscode.window.createOutputChannel("ABS Scan");
        }
        const channel = outputChannel;
        channel.show(true); // Show output
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage("ABS: No workspace open.");
            return;
        }
        // 1. Scan Strategy Info
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        channel.appendLine(`[ABS Core] Starting Smart Scan at ${new Date().toISOString()}`);
        channel.appendLine(`[INFO] Root: ${workspaceRoot}`);
        channel.appendLine(`[INFO] Strategy: Prioritizing Config/IDE/AI Files (.cursorrules, .env, .vscode, etc)`);
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "ABS: Scanning for Critical Configs...",
            cancellable: false,
        }, async () => {
            try {
                // Collect Files with Smart Priority
                let allFiles = getSmartFiles(workspaceRoot, workspaceRoot);
                // Filter duplicates just in case
                allFiles = [...new Set(allFiles)];
                // Limit execution (Updated to 100 for Smart Scan)
                const MAX_FILES = 100;
                let finalFilesToScan = allFiles;
                if (allFiles.length > MAX_FILES) {
                    channel.appendLine(`[WARN] Found ${allFiles.length} files. Optimizing to top ${MAX_FILES} high-value targets.`);
                    finalFilesToScan = allFiles.slice(0, MAX_FILES);
                }
                else {
                    channel.appendLine(`[INFO] Total target files found: ${finalFilesToScan.length}`);
                }
                channel.appendLine("---");
                // Audit Report Header
                let auditReport = `# ABS Core - Security Audit Report\n`;
                auditReport += `**Date:** ${new Date().toISOString()}\n`;
                auditReport += `**Workspace:** ${workspaceRoot}\n`;
                auditReport += `**Files Scanned:** ${finalFilesToScan.length}\n\n`;
                auditReport += `| File | Status | Details |\n`;
                auditReport += `|------|--------|---------|\n`;
                // For each path, read content and send to API
                let issuesFound = 0;
                for (const fileToScan of finalFilesToScan) {
                    let content = "";
                    try {
                        content = fs.readFileSync(fileToScan, "utf-8");
                    }
                    catch (err) {
                        channel.appendLine(`[ERROR] Could not read ${path.basename(fileToScan)}: ${err}`);
                        auditReport += `| ${path.basename(fileToScan)} | **ERROR** | Read Failed |\n`;
                        continue;
                    }
                    // Send to ABS API for analysis
                    channel.appendLine(`[SCAN] Analyzing: ${path.basename(fileToScan)}`);
                    try {
                        const config = vscode.workspace.getConfiguration("abs");
                        const apiUrl = config.get("apiUrl") || ABS_API_URL;
                        const apiKey = config.get("apiKey") || "sk-producer-v0";
                        // FIX: Endpoint is /v1/events (no /ingest suffix based on routes/events.ts)
                        // FIX: Payload MUST match EventEnvelopeSchema (core/schemas.ts)
                        const uuidv4 = () => {
                            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                                var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
                                return v.toString(16);
                            });
                        };
                        const response = await fetch(`${apiUrl}/v1/events`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${apiKey}`,
                                "X-ABS-Mode": "scanner",
                            },
                            body: JSON.stringify({
                                event_id: uuidv4(),
                                event_type: "code.scan",
                                source: "vscode-extension",
                                tenant_id: "default",
                                correlation_id: uuidv4(),
                                occurred_at: new Date().toISOString(),
                                payload: {
                                    input: content.substring(0, 10000), // Limit payload size per file
                                    policy: "code_safety",
                                    metadata: {
                                        file: fileToScan,
                                        source: "vscode-extension",
                                        timestamp: new Date().toISOString(),
                                    },
                                },
                            }),
                        });
                        if (response.ok) {
                            const result = (await response.json());
                            if (result.decision === "DENY" || result.allowed === false) {
                                channel.appendLine(`[VIOLATION] ${path.basename(fileToScan)}: DENIED`);
                                auditReport += `| ${path.basename(fileToScan)} | 🔴 **DENIED** | Policy Violation |\n`;
                                issuesFound++;
                            }
                            else {
                                channel.appendLine(`[OK] ${path.basename(fileToScan)}`);
                                auditReport += `| ${path.basename(fileToScan)} | 🟢 OK | Passed |\n`;
                            }
                        }
                        else {
                            let errorDetails = "";
                            try {
                                const text = await response.text();
                                // Try to parse as JSON if possible for cleaner log, otherwise use raw text
                                try {
                                    const json = JSON.parse(text);
                                    errorDetails = JSON.stringify(json, null, 2);
                                }
                                catch {
                                    errorDetails = text;
                                }
                            }
                            catch (e) {
                                errorDetails = "(Could not read response body)";
                            }
                            channel.appendLine(`[WARN] API returned ${response.status} for ${path.basename(fileToScan)}`);
                            channel.appendLine(`[DEBUG] Error Details: ${errorDetails}`);
                            auditReport += `| ${path.basename(fileToScan)} | ⚠️ WARN | API ${response.status} |\n`;
                        }
                    }
                    catch (apiErr) {
                        channel.appendLine(`[ERROR] API Call failed for ${path.basename(fileToScan)}: ${apiErr}`);
                        auditReport += `| ${path.basename(fileToScan)} | 💥 ERROR | API Call Failed |\n`;
                    }
                }
                channel.appendLine("---");
                // Write Audit Report
                const reportPath = path.join(workspaceRoot, "ABS_AUDIT.md");
                fs.writeFileSync(reportPath, auditReport);
                channel.appendLine(`[INFO] Audit report saved to: ${reportPath}`);
                if (issuesFound > 0) {
                    vscode.window.showWarningMessage(`ABS: Found ${issuesFound} issues. Report saved to ABS_AUDIT.md`);
                    channel.appendLine(`[RESULT] Scan complete. ${issuesFound} issues found.`);
                }
                else {
                    vscode.window.showInformationMessage("ABS: Scan complete. Clean. Report saved to ABS_AUDIT.md");
                    channel.appendLine(`[RESULT] Scan complete. Clean.`);
                }
            }
            catch (err) {
                channel.appendLine(`[ERROR] Scan process failed: ${err}`);
                vscode.window.showErrorMessage(`ABS Scan Error: ${err}`);
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map