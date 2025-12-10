"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_PREFERENCES = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.DEFAULT_USER_PREFERENCES = {
    theme: 'system',
    editor: {
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        minimap: true,
        lineNumbers: 'on',
    },
    ai: {
        defaultModel: 'codellama:13b',
        autoComplete: true,
        showSuggestions: true,
    },
    notifications: {
        email: true,
        desktop: true,
        taskUpdates: true,
    },
    locale: 'en',
};
//# sourceMappingURL=user.js.map