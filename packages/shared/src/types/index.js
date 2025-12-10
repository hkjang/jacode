"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WSEventType = void 0;
__exportStar(require("./agent"), exports);
__exportStar(require("./artifact"), exports);
__exportStar(require("./project"), exports);
__exportStar(require("./user"), exports);
__exportStar(require("./ai"), exports);
var WSEventType;
(function (WSEventType) {
    WSEventType["AGENT_CREATED"] = "agent:created";
    WSEventType["AGENT_UPDATED"] = "agent:updated";
    WSEventType["AGENT_PROGRESS"] = "agent:progress";
    WSEventType["AGENT_COMPLETED"] = "agent:completed";
    WSEventType["AGENT_FAILED"] = "agent:failed";
    WSEventType["ARTIFACT_CREATED"] = "artifact:created";
    WSEventType["ARTIFACT_UPDATED"] = "artifact:updated";
    WSEventType["FILE_CREATED"] = "file:created";
    WSEventType["FILE_UPDATED"] = "file:updated";
    WSEventType["FILE_DELETED"] = "file:deleted";
    WSEventType["CONNECTED"] = "connected";
    WSEventType["DISCONNECTED"] = "disconnected";
    WSEventType["ERROR"] = "error";
})(WSEventType || (exports.WSEventType = WSEventType = {}));
//# sourceMappingURL=index.js.map