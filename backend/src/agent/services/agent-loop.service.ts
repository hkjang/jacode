import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../ai/ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolRegistryService } from './tool-registry.service';
import { MemoryManagerService } from './memory-manager.service';
import { AgentGateway } from '../agent.gateway';
import { AgentStep, AgentStepType, AgentLoopOptions, ToolContext, AgentMessage } from '../interfaces/tool.interface';
import { randomUUID } from 'crypto';

/**
 * Agent Loop Service
 * 
 * Implements the ReAct (Reason-Act-Observe) pattern for autonomous agent execution.
 * 
 * The loop follows this pattern:
 * 1. REASON: Agent analyzes the task and decides what to do
 * 2. ACT: Agent selects and executes a tool
 * 3. OBSERVE: Agent processes the tool result
 * 4. Repeat until task is complete or max iterations reached
 */
@Injectable()
export class AgentLoopService {
  private readonly logger = new Logger(AgentLoopService.name);

  // ReAct prompt template
  private readonly REACT_SYSTEM_PROMPT = `You are an intelligent AI assistant that solves tasks step by step.

You operate in a loop of Thought, Action, and Observation.

## Process
1. **Thought**: Analyze the current situation and decide what to do next
2. **Action**: Choose a tool and execute it with appropriate arguments
3. **Observation**: Review the result and determine if the task is complete

## Response Format

When you need to use a tool, respond with:

<thought>
[Your reasoning about what to do next]
</thought>

<tool_call>
<name>[tool_name]</name>
<arguments>
{
  "param1": "value1"
}
</arguments>
</tool_call>

When you have completed the task, respond with:

<thought>
[Your final analysis]
</thought>

<final_answer>
[Your complete response to the user]
</final_answer>

## Important Rules
- Always think before acting
- Use tools when you need external information or to perform actions
- If a tool fails, analyze the error and try a different approach
- Don't repeat the same failed action
- Complete the task as efficiently as possible

`;

  constructor(
    private readonly aiService: AIService,
    private readonly prisma: PrismaService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly memoryManager: MemoryManagerService,
    private readonly agentGateway: AgentGateway,
  ) {}

  /**
   * Execute the agent loop for a task
   */
  async *executeLoop(
    taskId: string,
    userPrompt: string,
    context: ToolContext,
    options: AgentLoopOptions,
  ): AsyncGenerator<AgentStep> {
    const startTime = Date.now();
    let stepNumber = 0;
    let isComplete = false;
    let finalOutput = '';

    this.logger.log(`Starting agent loop for task ${taskId} with ${options.maxIterations} max iterations`);

    // Build system prompt with tool descriptions
    const toolDescriptions = this.toolRegistry.getToolDescriptions(options.tools);
    const systemPrompt = options.systemPrompt 
      ? `${options.systemPrompt}\n\n${toolDescriptions}`
      : `${this.REACT_SYSTEM_PROMPT}\n\n${toolDescriptions}`;

    // Initialize conversation
    this.memoryManager.addMessage(taskId, {
      role: 'system',
      content: systemPrompt,
    });

    this.memoryManager.addMessage(taskId, {
      role: 'user',
      content: userPrompt,
    });

    // Store original prompt in working memory
    this.memoryManager.setWorkingMemory(taskId, 'originalPrompt', userPrompt);
    this.memoryManager.setWorkingMemory(taskId, 'projectId', context.projectId);

    // Main ReAct loop
    while (!isComplete && stepNumber < options.maxIterations) {
      stepNumber++;
      const iterationStart = Date.now();

      try {
        // Get LLM response
        const conversation = this.memoryManager.getConversation(taskId);
        const response = await this.aiService.chat(
          conversation.map(m => ({ role: m.role as any, content: m.content })),
          {
            temperature: options.temperature || 0.2,
            maxTokens: options.maxTokens || 4096,
          }
        );

        const assistantMessage = response.content;
        this.memoryManager.addMessage(taskId, {
          role: 'assistant',
          content: assistantMessage,
        });

        // Parse the response
        const parsed = this.parseAgentResponse(assistantMessage);

        // REASON step
        if (parsed.thought) {
          const reasonStep: AgentStep = {
            id: randomUUID(),
            taskId,
            stepNumber,
            type: AgentStepType.REASON,
            thought: parsed.thought,
            durationMs: Date.now() - iterationStart,
            createdAt: new Date(),
          };
          await this.recordStep(reasonStep);
          yield reasonStep;
        }

        // Check for final answer
        if (parsed.finalAnswer) {
          isComplete = true;
          finalOutput = parsed.finalAnswer;

          const completeStep: AgentStep = {
            id: randomUUID(),
            taskId,
            stepNumber,
            type: AgentStepType.REFLECT,
            thought: 'Task completed',
            observation: parsed.finalAnswer,
            durationMs: Date.now() - iterationStart,
            createdAt: new Date(),
          };
          await this.recordStep(completeStep);
          yield completeStep;
          break;
        }

        // ACT step - execute tool if requested
        if (parsed.toolCall) {
          const actStep: AgentStep = {
            id: randomUUID(),
            taskId,
            stepNumber,
            type: AgentStepType.ACT,
            toolName: parsed.toolCall.name,
            toolInput: parsed.toolCall.arguments,
            durationMs: 0,
            createdAt: new Date(),
          };

          const toolStart = Date.now();

          // Execute the tool
          const toolResult = await this.toolRegistry.executeTool(
            parsed.toolCall.name,
            parsed.toolCall.arguments,
            context,
          );

          actStep.durationMs = Date.now() - toolStart;
          actStep.toolOutput = toolResult.success 
            ? toolResult.output 
            : `Error: ${toolResult.error}`;

          await this.recordStep(actStep);
          yield actStep;

          // OBSERVE step
          const observeStep: AgentStep = {
            id: randomUUID(),
            taskId,
            stepNumber,
            type: AgentStepType.OBSERVE,
            observation: toolResult.success 
              ? `Tool executed successfully. Result: ${toolResult.output.substring(0, 1000)}`
              : `Tool failed with error: ${toolResult.error}`,
            durationMs: Date.now() - iterationStart - actStep.durationMs,
            createdAt: new Date(),
          };
          await this.recordStep(observeStep);
          yield observeStep;

          // Add tool result to conversation
          this.memoryManager.addMessage(taskId, {
            role: 'tool',
            content: toolResult.success
              ? `Tool "${parsed.toolCall.name}" returned:\n${toolResult.output}`
              : `Tool "${parsed.toolCall.name}" failed:\n${toolResult.error}`,
            name: parsed.toolCall.name,
          });
        }

        // Notify progress
        const progress = Math.min(Math.round((stepNumber / options.maxIterations) * 100), 99);
        await this.updateTaskProgress(taskId, progress, `Step ${stepNumber}: ${parsed.thought?.substring(0, 50) || 'Processing...'}`);

      } catch (error) {
        this.logger.error(`Error in agent loop step ${stepNumber}:`, error);
        
        const errorStep: AgentStep = {
          id: randomUUID(),
          taskId,
          stepNumber,
          type: AgentStepType.OBSERVE,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - iterationStart,
          createdAt: new Date(),
        };
        await this.recordStep(errorStep);
        yield errorStep;

        // Add error to conversation for recovery
        this.memoryManager.addMessage(taskId, {
          role: 'system',
          content: `An error occurred: ${error instanceof Error ? error.message : String(error)}. Please try a different approach.`,
        });
      }
    }

    // Persist memory for future reference
    await this.memoryManager.persistMemory(taskId);

    // If we hit max iterations without completing
    if (!isComplete) {
      this.logger.warn(`Task ${taskId} reached max iterations (${options.maxIterations}) without completing`);
      finalOutput = 'Task did not complete within the maximum number of steps.';
    }

    this.logger.log(`Agent loop completed for task ${taskId} in ${Date.now() - startTime}ms with ${stepNumber} steps`);
  }

  /**
   * Parse agent response to extract thought, tool call, or final answer
   */
  private parseAgentResponse(response: string): {
    thought?: string;
    toolCall?: { name: string; arguments: Record<string, any> };
    finalAnswer?: string;
  } {
    const result: {
      thought?: string;
      toolCall?: { name: string; arguments: Record<string, any> };
      finalAnswer?: string;
    } = {};

    // Extract thought
    const thoughtMatch = response.match(/<thought>([\s\S]*?)<\/thought>/);
    if (thoughtMatch) {
      result.thought = thoughtMatch[1].trim();
    }

    // Extract final answer
    const finalMatch = response.match(/<final_answer>([\s\S]*?)<\/final_answer>/);
    if (finalMatch) {
      result.finalAnswer = finalMatch[1].trim();
      return result;
    }

    // Extract tool call
    const toolMatch = response.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
    if (toolMatch) {
      const toolContent = toolMatch[1];
      const nameMatch = toolContent.match(/<name>([^<]+)<\/name>/);
      const argsMatch = toolContent.match(/<arguments>([\s\S]*?)<\/arguments>/);

      if (nameMatch) {
        result.toolCall = {
          name: nameMatch[1].trim(),
          arguments: {},
        };

        if (argsMatch) {
          try {
            result.toolCall.arguments = JSON.parse(argsMatch[1].trim());
          } catch (e) {
            this.logger.warn('Failed to parse tool arguments:', e);
          }
        }
      }
    }

    return result;
  }

  /**
   * Record a step in the database
   */
  private async recordStep(step: AgentStep): Promise<void> {
    try {
      await this.prisma.agentStep.create({
        data: {
          id: step.id,
          taskId: step.taskId,
          stepNumber: step.stepNumber,
          type: step.type,
          thought: step.thought,
          toolName: step.toolName,
          toolInput: step.toolInput || undefined,
          toolOutput: step.toolOutput,
          observation: step.observation,
          durationMs: step.durationMs,
          error: step.error,
        },
      });
    } catch (error) {
      // Table might not exist yet, log but don't fail
      this.logger.warn('Failed to record step (table may not exist):', error);
    }
  }

  /**
   * Update task progress
   */
  private async updateTaskProgress(taskId: string, progress: number, currentStep: string): Promise<void> {
    try {
      const task = await this.prisma.agentTask.update({
        where: { id: taskId },
        data: { progress, currentStep },
      });

      this.agentGateway.notifyTaskProgress({
        id: taskId,
        userId: task.userId,
        projectId: task.projectId,
        progress,
        currentStep,
      });
    } catch (error) {
      this.logger.warn('Failed to update task progress:', error);
    }
  }
}
