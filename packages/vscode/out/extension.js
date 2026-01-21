"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const child_process_1 = require("child_process");
const path = require("path");
const SidebarProvider_1 = require("./SidebarProvider");
function activate(context) {
    console.log('ABS Core extension is now active!');
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("absSidebar", sidebarProvider));
    let disposable = vscode.commands.registerCommand('abs.scanFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to scan.');
            return;
        }
        const filePath = editor.document.fileName;
        vscode.window.showInformationMessage(`Scanning ${path.basename(filePath)}...`);
        // Execute abs-scan CLI (assuming it's installed globally or via npx)
        // In a real extension, we would bundle the logic or allow path configuration.
        (0, child_process_1.exec)(`npx @abs/scan "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Scan Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.error(`ABS Stderr: ${stderr}`);
            }
            // For now, just show the output in a channel
            const channel = vscode.window.createOutputChannel("ABS Scan");
            channel.appendLine(stdout);
            channel.show();
            if (stdout.includes('"allowed": false')) {
                vscode.window.showErrorMessage('ABS: Policy Violation Detected!');
            }
            else {
                vscode.window.showInformationMessage('ABS: Scan Passed.');
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map