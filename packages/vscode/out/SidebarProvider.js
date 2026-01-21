"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = void 0;
const vscode = require("vscode");
class SidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'onQuickScan': {
                    if (!data.value) {
                        return;
                    }
                    const files = data.value; // Array of strings
                    vscode.window.showInformationMessage(`Starting Quick Scan for: ${Array.isArray(files) ? files.join(', ') : 'Active File'}`);
                    // In a real implementation, we would pass 'files' to the CLI command.
                    // For now, we trigger the default scan to prove connectivity.
                    vscode.commands.executeCommand('abs.scanFile', files);
                    break;
                }
                case 'onInfo': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }
    revive(panel) {
        this._view = panel;
    }
    _getHtmlForWebview(webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        // ABS Core Style (Dark + Orange #E65100)
        // Using inline styles for simplicity in this artifact, but ideally would be in a separate CSS file
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ABS Core</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 0;
                        margin: 0;
                        background-color: var(--vscode-editor-background); 
                        color: var(--vscode-editor-foreground);
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        padding: 10px;
                        font-weight: bold;
                        border-bottom: 1px solid var(--vscode-widget-border);
                        margin-bottom: 15px;
                    }
                    .header img {
                        width: 24px;
                        height: 24px;
                        margin-right: 10px;
                    }
                    .header span {
                        color: #E65100; /* ABS Core Orange */
                        font-size: 1.1em;
                        letter-spacing: 0.5px;
                    }
                    
                    .section {
                        padding: 0 15px 15px 15px;
                    }
                    .section-title {
                        font-size: 0.85em;
                        text-transform: uppercase;
                        color: var(--vscode-descriptionForeground);
                        margin-bottom: 10px;
                        font-weight: 600;
                    }

                    .card {
                        background-color: var(--vscode-sideBar-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 15px;
                        margin-bottom: 10px;
                    }

                    .scan-zone {
                        border: 1px dashed var(--vscode-widget-border);
                        border-radius: 4px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    
                    .file-item {
                        display: flex;
                        align-items: center;
                        margin-bottom: 5px;
                        font-size: 0.9em;
                    }
                    .file-item input {
                        margin-right: 8px;
                    }

                    button.primary-btn {
                        width: 100%;
                        background-color: #a0420d; /* Darker Orange for better contrast/button feel */
                        color: white !important;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: 500;
                        margin-top: 5px;
                    }
                    button.primary-btn:hover {
                         background-color: #E65100;
                    }

                    button.secondary-btn {
                        width: 100%;
                        background-color: transparent;
                        border: 1px solid #E65100;
                        color: var(--vscode-editor-foreground);
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 5px;
                        text-align: left;
                    }
                    button.secondary-btn:hover {
                        background-color: rgba(230, 81, 0, 0.1);
                    }
                    
                    .tool-desc {
                        font-size: 0.8em;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 2px;
                        display: block;
                    }

                    .user-profile {
                        display: flex;
                        align-items: center;
                        background-color: #E65100;
                        color: white;
                        padding: 10px;
                        border-radius: 6px;
                        margin-bottom: 20px;
                    }
                    .user-avatar {
                        width: 32px;
                        height: 32px;
                        background: rgba(255,255,255,0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 10px;
                        font-weight: bold;
                    }
                    .user-info div:first-child {
                        font-weight: bold;
                    }
                    .user-info div:last-child {
                        font-size: 0.8em;
                        opacity: 0.9;
                    }
                    .badge {
                         background: rgba(255,255,255,0.3);
                         padding: 2px 6px;
                         border-radius: 3px;
                         font-size: 0.7em;
                         float: right;
                         margin-left: auto;
                    }

                </style>
            </head>
            <body>
                <div class="header">
                     <!-- ABS Core Shield Icon (SVG) -->
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 10px;">
                        <path d="M12 2L3 7V12C3 17.52 6.84 22.74 12 24C17.16 22.74 21 17.52 21 12V7L12 2Z" fill="#E65100"/>
                        <path d="M12 6L5.5 9.6V12.6C5.5 16.4 8.3 19.8 12 20.9C15.7 19.8 18.5 16.4 18.5 12.6V9.6L12 6Z" fill="white" fill-opacity="0.3"/>
                     </svg>
                     <span>ABS Core</span>
                </div>

                <div class="section">
                    <div class="user-profile">
                        <div class="user-avatar">D</div>
                        <div class="user-info">
                            <div>Developer</div>
                            <div>dev.oconnector@gmail.com</div>
                        </div>
                        <span class="badge">Unlimited</span>
                    </div>

                    <div class="section-title">Scanner (Local / Free)</div>
                    <div class="card">
                         <div style="margin-bottom: 10px; font-size: 0.9em;">Select Files Or Folders To Scan:</div>
                         
                         <!-- Mock Tree View for Demo -->
                         <div class="scan-zone">
                             <div class="file-item">
                                 <input type="checkbox" id="selectAll" checked> 
                                 <span>Select All Files</span>
                             </div>
                              <div class="file-item" style="margin-left: 15px;">
                                 <input type="checkbox" class="file-cb" data-path=".devcontainer/" checked> 
                                 <span>.devcontainer/</span>
                             </div>
                             <div class="file-item" style="margin-left: 15px;">
                                 <input type="checkbox" class="file-cb" data-path=".github/" checked> 
                                 <span>.github/</span>
                             </div>
                             <div class="file-item" style="margin-left: 15px;">
                                 <input type="checkbox" class="file-cb" data-path="dist-examples/"> 
                                 <span>dist-examples/</span>
                             </div>
                         </div>
                         
                         <button class="primary-btn" onclick="quickScan()">Scans Selected Files</button>
                    </div>

                    <div class="section-title">Additional Tools</div>
                     <button class="secondary-btn" onclick="openLink('server')">
                        <div>Scan Live Server (Enterprise)</div>
                        <span class="tool-desc">Test Running MCP Endpoint Security</span>
                    </button>
                    
                    <button class="secondary-btn" onclick="openLink('history')">
                        <div>Account & History</div>
                        <span class="tool-desc">View Scan History And Settings</span>
                    </button>
                    
                    <div style="text-align: right; margin-top: 10px;">
                        <a href="#" style="color: #E65100; text-decoration: none; font-size: 0.9em;">Sign Out</a>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    const selectAllCb = document.getElementById('selectAll');
                    const fileCbs = document.querySelectorAll('.file-cb');

                    // Handle "Select All" toggle
                    selectAllCb.addEventListener('change', (e) => {
                        const isChecked = e.target.checked;
                        fileCbs.forEach(cb => cb.checked = isChecked);
                    });

                    // Handle individual toggle to update "Select All" state
                    fileCbs.forEach(cb => {
                        cb.addEventListener('change', () => {
                            const allChecked = Array.from(fileCbs).every(c => c.checked);
                            selectAllCb.checked = allChecked;
                            // Select All is indeterminate if some but not all are checked? 
                            // For simplicity, just strict check matching for now.
                        });
                    });

                    function quickScan() {
                        // Gather selected paths
                        const selected = [];
                        fileCbs.forEach(cb => {
                            if (cb.checked) {
                                selected.push(cb.getAttribute('data-path'));
                            }
                        });

                        if (selected.length === 0) {
                             // Flash error or shake?
                             vscode.postMessage({ type: 'onError', value: 'No files selected for scan.' });
                             return;
                        }

                        vscode.postMessage({ type: 'onQuickScan', value: selected });
                    }
                    
                    function openLink(target) {
                         vscode.postMessage({ type: 'onInfo', value: 'Opening: ' + target });
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=SidebarProvider.js.map