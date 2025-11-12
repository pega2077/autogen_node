import { IMessage } from '../core/IAgent';
import { IFunctionDefinition } from '../core/IFunctionCall';

/**
 * Configuration for LLM provider
 */
export interface LLMProviderConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseURL?: string;
  tools?: IFunctionDefinition[];
}

/**
 * Interface for LLM providers
 */
export interface ILLMProvider {
  /**
   * Generate a completion based on messages
   */
  generateCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string>;

  /**
   * Generate a reply with potential function calls
   */
  generateReplyWithFunctions(
    messages: IMessage[],
    tools?: IFunctionDefinition[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage>;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMProviderConfig>): void;
}
