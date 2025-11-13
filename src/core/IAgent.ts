import { IFunctionCall, IFunctionResult } from './IFunctionCall';
import { IMemory } from './memory';

/**
 * Represents a message in the agent communication system
 */
export interface IMessage {
  content: string;
  role: 'user' | 'assistant' | 'system' | 'function' | 'tool';
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolCallId?: string;
}

/**
 * Base interface for all agents
 */
export interface IAgent {
  name: string;
  
  /**
   * Generate a reply based on the received messages
   * @param messages - Array of messages in the conversation
   * @param cancellationToken - Token to cancel the operation
   * @returns The generated reply message
   */
  generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage>;

  /**
   * Get the agent's name
   */
  getName(): string;
}

/**
 * Configuration for an agent
 */
export interface IAgentConfig {
  name: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  memory?: IMemory[];
}
