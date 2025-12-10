"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPriority = exports.AgentType = exports.AgentStatus = void 0;
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["PENDING"] = "PENDING";
    AgentStatus["PLANNING"] = "PLANNING";
    AgentStatus["EXECUTING"] = "EXECUTING";
    AgentStatus["WAITING_APPROVAL"] = "WAITING_APPROVAL";
    AgentStatus["COMPLETED"] = "COMPLETED";
    AgentStatus["FAILED"] = "FAILED";
    AgentStatus["CANCELLED"] = "CANCELLED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var AgentType;
(function (AgentType) {
    AgentType["CODE_GENERATION"] = "CODE_GENERATION";
    AgentType["CODE_MODIFICATION"] = "CODE_MODIFICATION";
    AgentType["CODE_REVIEW"] = "CODE_REVIEW";
    AgentType["TEST_GENERATION"] = "TEST_GENERATION";
    AgentType["REFACTORING"] = "REFACTORING";
    AgentType["BUG_FIX"] = "BUG_FIX";
    AgentType["DOCUMENTATION"] = "DOCUMENTATION";
})(AgentType || (exports.AgentType = AgentType = {}));
var AgentPriority;
(function (AgentPriority) {
    AgentPriority[AgentPriority["LOW"] = 0] = "LOW";
    AgentPriority[AgentPriority["NORMAL"] = 1] = "NORMAL";
    AgentPriority[AgentPriority["HIGH"] = 2] = "HIGH";
    AgentPriority[AgentPriority["URGENT"] = 3] = "URGENT";
})(AgentPriority || (exports.AgentPriority = AgentPriority = {}));
//# sourceMappingURL=agent.js.map