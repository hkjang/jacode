"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PROMPTS = exports.AIProvider = void 0;
var AIProvider;
(function (AIProvider) {
    AIProvider["OLLAMA"] = "ollama";
    AIProvider["VLLM"] = "vllm";
})(AIProvider || (exports.AIProvider = AIProvider = {}));
exports.DEFAULT_PROMPTS = {
    CODE_GENERATION: `You are an expert software developer. Generate code based on the following requirements.

Requirements:
{{prompt}}

{{#if context}}
Context:
{{context}}
{{/if}}

{{#if language}}
Language: {{language}}
{{/if}}

Please provide clean, well-documented code following best practices.`,
    CODE_MODIFICATION: `You are an expert software developer. Modify the following code according to the requirements.

Original Code:
\`\`\`{{language}}
{{code}}
\`\`\`

Modification Requirements:
{{prompt}}

Please provide the modified code with explanations for the changes made.`,
    CODE_REVIEW: `You are an expert code reviewer. Review the following code for issues, improvements, and best practices.

Code:
\`\`\`{{language}}
{{code}}
\`\`\`

{{#if context}}
Context: {{context}}
{{/if}}

Please provide a detailed review covering:
1. Code quality and readability
2. Potential bugs or issues
3. Performance considerations
4. Security concerns
5. Suggestions for improvement`,
};
//# sourceMappingURL=ai.js.map