/**
 * AI Provider Types
 */
export enum AIProvider {
  OLLAMA = 'ollama',
  VLLM = 'vllm',
}

/**
 * Chat Message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Chat Options
 */
export interface ChatOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  stop?: string[];
}

/**
 * Chat Response
 */
export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: 'stop' | 'length' | 'error';
}

/**
 * Chat Stream Chunk
 */
export interface ChatStreamChunk {
  id: string;
  content: string;
  done: boolean;
}

/**
 * Code Generation Request
 */
export interface CodeGenerationRequest {
  prompt: string;
  context?: string;
  language?: string;
  filePath?: string;
  options?: ChatOptions;
}

/**
 * Code Generation Response
 */
export interface CodeGenerationResponse {
  code: string;
  language: string;
  explanation?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Model Information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  description?: string;
  contextLength: number;
  capabilities: string[];
}

/**
 * AI Provider Configuration
 */
export interface AIProviderConfig {
  provider: AIProvider;
  baseUrl: string;
  defaultModel: string;
  models: ModelInfo[];
  apiKey?: string;
}

/**
 * Prompt Template
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables: string[];
  category: 'code_generation' | 'code_modification' | 'review' | 'test' | 'documentation';
}

/**
 * Default Prompt Templates
 */
export const DEFAULT_PROMPTS = {
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
