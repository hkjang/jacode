"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactStatus = exports.ArtifactType = void 0;
var ArtifactType;
(function (ArtifactType) {
    ArtifactType["PLAN"] = "PLAN";
    ArtifactType["CODE"] = "CODE";
    ArtifactType["DIFF"] = "DIFF";
    ArtifactType["TEST_RESULT"] = "TEST_RESULT";
    ArtifactType["LOG"] = "LOG";
    ArtifactType["SCREENSHOT"] = "SCREENSHOT";
    ArtifactType["REVIEW"] = "REVIEW";
    ArtifactType["DOCUMENTATION"] = "DOCUMENTATION";
})(ArtifactType || (exports.ArtifactType = ArtifactType = {}));
var ArtifactStatus;
(function (ArtifactStatus) {
    ArtifactStatus["DRAFT"] = "DRAFT";
    ArtifactStatus["APPROVED"] = "APPROVED";
    ArtifactStatus["REJECTED"] = "REJECTED";
    ArtifactStatus["APPLIED"] = "APPLIED";
})(ArtifactStatus || (exports.ArtifactStatus = ArtifactStatus = {}));
//# sourceMappingURL=artifact.js.map