import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryType } from '@prisma/client';
import { AgentMessage, AgentMemoryEntry } from '../interfaces/tool.interface';

/**
 * Memory Manager Service
 * 
 * Manages agent memory including:
 * - Conversation history (full message log)
 * - Working memory (current task context)
 * - Summary memory (compressed context for long conversations)
 */
@Injectable()
export class MemoryManagerService {
  private readonly logger = new Logger(MemoryManagerService.name);
  
  // In-memory cache for active tasks
  private readonly conversationCache = new Map<string, AgentMessage[]>();
  private readonly workingMemoryCache = new Map<string, Map<string, any>>();
  
  // Maximum messages before summarization
  private readonly MAX_MESSAGES = 50;
  private readonly SUMMARY_THRESHOLD = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a message to conversation history
   */
  async addMessage(taskId: string, message: AgentMessage): Promise<void> {
    // Get or create conversation cache
    if (!this.conversationCache.has(taskId)) {
      this.conversationCache.set(taskId, []);
    }
    
    const messages = this.conversationCache.get(taskId)!;
    messages.push(message);
    
    // Check if we need to summarize
    if (messages.length >= this.SUMMARY_THRESHOLD) {
      await this.summarizeAndTruncate(taskId);
    }
  }

  /**
   * Get conversation history for a task
   */
  getConversation(taskId: string): AgentMessage[] {
    return this.conversationCache.get(taskId) || [];
  }

  /**
   * Set a value in working memory
   */
  setWorkingMemory(taskId: string, key: string, value: any): void {
    if (!this.workingMemoryCache.has(taskId)) {
      this.workingMemoryCache.set(taskId, new Map());
    }
    this.workingMemoryCache.get(taskId)!.set(key, value);
  }

  /**
   * Get a value from working memory
   */
  getWorkingMemory<T = any>(taskId: string, key: string): T | undefined {
    return this.workingMemoryCache.get(taskId)?.get(key);
  }

  /**
   * Get all working memory for a task
   */
  getAllWorkingMemory(taskId: string): Record<string, any> {
    const memory = this.workingMemoryCache.get(taskId);
    if (!memory) return {};
    return Object.fromEntries(memory);
  }

  /**
   * Clear all memory for a task (after completion)
   */
  clearTaskMemory(taskId: string): void {
    this.conversationCache.delete(taskId);
    this.workingMemoryCache.delete(taskId);
    this.logger.debug(`Cleared memory for task ${taskId}`);
  }

  /**
   * Persist memory to database
   */
  async persistMemory(taskId: string): Promise<void> {
    const conversation = this.conversationCache.get(taskId);
    const workingMemory = this.workingMemoryCache.get(taskId);

    const memoriesToCreate: Array<{
      taskId: string;
      type: MemoryType;
      content: string;
      metadata: any;
    }> = [];

    if (conversation && conversation.length > 0) {
      memoriesToCreate.push({
        taskId,
        type: MemoryType.CONVERSATION,
        content: JSON.stringify(conversation),
        metadata: { messageCount: conversation.length },
      });
    }

    if (workingMemory && workingMemory.size > 0) {
      memoriesToCreate.push({
        taskId,
        type: MemoryType.WORKING,
        content: JSON.stringify(Object.fromEntries(workingMemory)),
        metadata: { keyCount: workingMemory.size },
      });
    }

    if (memoriesToCreate.length > 0) {
      await this.prisma.$transaction(
        memoriesToCreate.map(memory =>
          this.prisma.agentMemory.create({ data: memory })
        )
      );
      this.logger.debug(`Persisted ${memoriesToCreate.length} memory entries for task ${taskId}`);
    }
  }

  /**
   * Restore memory from database
   */
  async restoreMemory(taskId: string): Promise<void> {
    const memories = await this.prisma.agentMemory.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 10, // Get latest entries
    });

    for (const memory of memories) {
      try {
        if (memory.type === MemoryType.CONVERSATION) {
          const messages = JSON.parse(memory.content) as AgentMessage[];
          this.conversationCache.set(taskId, messages);
        } else if (memory.type === MemoryType.WORKING) {
          const working = JSON.parse(memory.content) as Record<string, any>;
          this.workingMemoryCache.set(taskId, new Map(Object.entries(working)));
        }
      } catch (error) {
        this.logger.warn(`Failed to restore memory ${memory.id}:`, error);
      }
    }
  }

  /**
   * Get formatted context for LLM
   */
  getContextForLLM(taskId: string): string {
    const conversation = this.getConversation(taskId);
    const workingMemory = this.getAllWorkingMemory(taskId);

    let context = '';

    // Add working memory context
    if (Object.keys(workingMemory).length > 0) {
      context += '## Working Context\n';
      for (const [key, value] of Object.entries(workingMemory)) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        context += `- **${key}**: ${valueStr.substring(0, 500)}\n`;
      }
      context += '\n';
    }

    // Add recent conversation summary
    if (conversation.length > 0) {
      context += '## Recent Actions\n';
      const recentMessages = conversation.slice(-10);
      for (const msg of recentMessages) {
        if (msg.role === 'assistant' && msg.content.includes('tool_call')) {
          context += `- Tool call: ${this.extractToolName(msg.content)}\n`;
        } else if (msg.role === 'tool') {
          context += `- Tool result: ${msg.content.substring(0, 100)}...\n`;
        }
      }
    }

    return context;
  }

  /**
   * Summarize conversation and truncate old messages
   */
  private async summarizeAndTruncate(taskId: string): Promise<void> {
    const messages = this.conversationCache.get(taskId);
    if (!messages || messages.length < this.SUMMARY_THRESHOLD) return;

    // Keep the last N messages, discard older ones
    // In production, we would call LLM to summarize before discarding
    const toKeep = messages.slice(-20);
    const toSummarize = messages.slice(0, -20);

    // Create a simple summary (in production, use LLM)
    const summary = this.createSimpleSummary(toSummarize);

    // Store summary
    await this.prisma.agentMemory.create({
      data: {
        taskId,
        type: MemoryType.SUMMARY,
        content: summary,
        metadata: { summarizedMessages: toSummarize.length },
      },
    });

    // Update cache with only recent messages
    this.conversationCache.set(taskId, toKeep);
    
    this.logger.debug(`Summarized ${toSummarize.length} messages for task ${taskId}`);
  }

  /**
   * Create a simple summary of messages
   */
  private createSimpleSummary(messages: AgentMessage[]): string {
    const toolCalls = messages.filter(m => 
      m.role === 'assistant' && m.content.includes('tool_call')
    );
    
    const summary = `Summary of ${messages.length} previous interactions:
- ${toolCalls.length} tool calls were made
- Tools used: ${toolCalls.map(m => this.extractToolName(m.content)).join(', ')}`;
    
    return summary;
  }

  /**
   * Extract tool name from assistant message
   */
  private extractToolName(content: string): string {
    const match = content.match(/<name>([^<]+)<\/name>/);
    return match ? match[1] : 'unknown';
  }
}
