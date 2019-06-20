"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const gcc_1 = require("./gcc");
const path = require("path");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const folder = vscode.workspace.rootPath;
    const toolchain = new gcc_1.GCC();
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('arm.build', () => {
        //config_json = JSON.parse();
        toolchain.build(fs.readFileSync(folder + "/.vscode/arm_toolchain.json", 'utf8').toString(), false);
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('arm.build_and_clean', () => {
        //config_json = JSON.parse();
        toolchain.build(fs.readFileSync(folder + "/.vscode/arm_toolchain.json", 'utf8').toString(), true);
    });
    context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand('arm.exclude-from-build', (uri) => {
        if (typeof uri === 'undefined') {
            if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            }
        }
        toolchain.addExcludePath(vscode.workspace.asRelativePath(uri));
    });
    disposable = vscode.commands.registerCommand('arm.project-settings', () => {
        const panel = vscode.window.createWebviewPanel('arm-toolchain-ui', 'Projects Settings', {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: true,
        }, {
            enableScripts: true,
        });
        const filePath = vscode.Uri.file(path.join(context.extensionPath, 'out', 'ui', 'ui.html'));
        var page = fs.readFileSync(filePath.fsPath, 'utf8');
        panel.webview.html = page.replace(/{{root}}/g, vscode.Uri.file(context.extensionPath).with({ scheme: 'vscode-resource' }).toString());
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'request-data':
                    panel.webview.postMessage({ command: "update-data-view", text: toolchain.getData() });
                    break;
                case 'update-data':
                    toolchain.update_data(message.data);
                    break;
            }
        });
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map