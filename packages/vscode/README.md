# ABS Core for VS Code

This extension integrates the **ABS Core Scanner** directly into your editor, allowing you to scan your current file for policy violations and security risks with a single command.

## Features

- **Scan Current File**: Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run `ABS: Scan Current File`.
- **Real-time Feedback**: View scan results directly in the output channel.
- **Policy Enforcement**: Checks your code against the active policies defined in your ABS Runtime.

## Requirements

- Node.js (v18+) installed.
- Internet connection (to fetch policies from ABS Runtime if configured, or run local checks).

## Installation (Local Development)

1. Clone the repository.
2. Navigate to `packages/vscode`.
3. Run `npm install`.
4. Press `F5` to open a new VS Code window with the extension loaded.

## Publishing to Marketplace

1. Install `vsce`: `npm install -g @vscode/vsce`.
2. Login: `vsce login <publisher id>`.
3. Package: `vsce package` (Creating .vsix).
4. Publish: `vsce publish`.

## License

MIT
