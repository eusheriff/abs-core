"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layout = void 0;
const html_1 = require("hono/html");
const Layout = (props) => (0, html_1.html) `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title} - ABS Core</title>
    ${props.head}
    <style>
        :root {
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --text-main: #c9d1d9;
            --text-secondary: #8b949e;
            --border-color: #30363d;
            --accent-color: #58a6ff;
            --success-color: #238636;
            --danger-color: #da3633;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 20px;
            line-height: 1.5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        h1 { margin: 0; font-size: 24px; color: var(--accent-color); }
        .badge {
            background: var(--border-color);
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card-bg);
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--border-color);
        }
        th, td {
            text-align: left;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }
        th {
            background-color: var(--bg-color);
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 14px;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover { background-color: #1c2128; }
        
        .status-ok { color: var(--success-color); }
        .status-error { color: var(--danger-color); }
        
        pre {
            background: #0d1117;
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 0;
            font-size: 12px;
            border: 1px solid var(--border-color);
        }
    </style>
</head>
<body>
    <div class="container">
        ${props.children}
    </div>
</body>
</html>
`;
exports.Layout = Layout;
