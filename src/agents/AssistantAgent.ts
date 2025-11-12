import OpenAI from 'openai';
import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig } from '../core/IAgent';

/**
 * Configuration for OpenAI-based agent
 */
export interface OpenAIAgentConfig extends IAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * An agent that uses OpenAI's API to generate responses
 * Similar to .NET's AssistantAgent with OpenAI integration
 */
export class AssistantAgent extends BaseAgent {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: OpenAIAgentConfig) {
    super(config);
    
    this.client = new OpenAI({
      apiKey: config.apiKey
    });
    
    this.model = config.model || 'gpt-3.5-turbo';
    this.temperature = config.temperature ?? 0;
    this.maxTokens = config.maxTokens || 1000;
  }

  /**
   * Generate a reply using OpenAI's chat completion API
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    try {
      // Convert our message format to OpenAI's format
      const openAIMessages = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        ...(msg.name && { name: msg.name })
      }));

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openAIMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      }, {
        signal: cancellationToken
      });

      const reply: IMessage = {
        role: 'assistant',
        content: response.choices[0]?.message?.content || '',
        name: this.name
      };

      this.addToHistory(reply);
      return reply;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate reply: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update the model configuration
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Update the temperature
   */
  setTemperature(temperature: number): void {
    this.temperature = temperature;
  }
}
