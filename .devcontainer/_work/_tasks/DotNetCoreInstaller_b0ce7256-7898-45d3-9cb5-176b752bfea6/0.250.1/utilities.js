"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setFileAttribute = exports.getCurrentDir = void 0;
const fs_1 = require("fs");
function getCurrentDir() {
    return __dirname;
}
exports.getCurrentDir = getCurrentDir;
function setFileAttribute(file, mode) {
    (0, fs_1.chmodSync)(file, mode);
}
exports.setFileAttribute = setFileAttribute;
//# sourceMappingURL=utilities.js.map