export declare enum AIProvider {
    OLLAMA = "ollama",
    VLLM = "vllm"
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface ChatOptions {
    model: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    stream?: boolean;
    stop?: string[];
}
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
export interface ChatStreamChunk {
    id: string;
    content: string;
    done: boolean;
}
export interface CodeGenerationRequest {
    prompt: string;
    context?: string;
    language?: string;
    filePath?: string;
    options?: ChatOptions;
}
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
export interface ModelInfo {
    id: string;
    name: string;
    provider: AIProvider;
    description?: string;
    contextLength: number;
    capabilities: string[];
}
export interface AIProviderConfig {
    provider: AIProvider;
    baseUrl: string;
    defaultModel: string;
    models: ModelInfo[];
    apiKey?: string;
}
export interface PromptTemplate {
    id: string;
    name: string;
    description?: string;
    template: string;
    variables: string[];
    category: 'code_generation' | 'code_modification' | 'review' | 'test' | 'documentation';
}
export declare const DEFAULT_PROMPTS: {
    CODE_GENERATION: string;
    CODE_MODIFICATION: string;
    CODE_REVIEW: string;
};
