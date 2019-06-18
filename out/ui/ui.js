"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class UI {
    constructor() {
        vscode_1.window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            switch (message.command) {
                case 'refactor':
                    count = Math.ceil(count * 0.5);
                    counter.textContent = count;
                    break;
            }
        });
    }
    context_changed() {
    }
    update_context() {
    }
}
module.exports = UI;
//# sourceMappingURL=ui.js.map