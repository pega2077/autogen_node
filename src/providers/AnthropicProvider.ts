import Anthropic from '@anthropic-ai/sdk';
import { IMessage } from '../core/IAgent';
import { ILLMProvider, LLMProviderConfig } from './ILLMProvider';
import { IFunctionDefinition } from '../core/IFunctionCall';

/**
 * Anthropic provider implementation
 * Supports Claude models via the Anthropic SDK
 */
export class AnthropicProvider implements ILLMProvider {
  private client: Anthropic;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }

  async generateCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const anthropicMessages = this.convertMessages(messages);
    const systemMessage = this.extractSystemMessage(messages);

    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature ?? 0,
      system: systemMessage,
      messages: anthropicMessages
    }, {
      signal: cancellationToken
    });

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
  }

  async generateReplyWithFunctions(
    messages: IMessage[],
    tools?: IFunctionDefinition[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const anthropicMessages = this.convertMessages(messages);
    const systemMessage = this.extractSystemMessage(messages);

    const requestParams: Anthropic.MessageCreateParams = {
      model: this.config.model,
      max_tokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature ?? 0,
      system: systemMessage,
      messages: anthropicMessages
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestParams.tools = this.convertTools(tools);
    }

    const response = await this.client.messages.create(
      requestParams,
      { signal: cancellationToken }
    );

    const result: IMessage = {
      role: 'assistant',
      content: ''
    };

    // Process content blocks
    const textBlocks: string[] = [];
    const toolCalls: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      } else if (block.type === 'tool_use') {
        // Convert Anthropic tool_use to OpenAI-compatible format
        toolCalls.push({
          id: block.id,
          type: 'function' as const,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input)
          }
        });
      }
    }

    result.content = textBlocks.join('\n');

    // Add tool calls if present
    if (toolCalls.length > 0) {
      result.toolCalls = toolCalls;
    }

    return result;
  }

  /**
   * Extract system message from messages array
   */
  private extractSystemMessage(messages: IMessage[]): string | undefined {
    const systemMessages = messages.filter(msg => msg.role === 'system');
    if (systemMessages.length === 0) {
      return undefined;
    }
    return systemMessages.map(msg => msg.content).join('\n');
  }

  /**
   * Convert internal messages to Anthropic format
   */
  private convertMessages(messages: IMessage[]): Anthropic.MessageParam[] {
    // Filter out system messages as they're handled separately in Anthropic
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

    return nonSystemMessages.map(msg => {
      // Handle tool results
      if (msg.role === 'tool' && msg.toolCallId) {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: msg.toolCallId,
              content: msg.content
            }
          ]
        };
      }

      // Handle messages with tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const content: any[] = [];
        
        // Add text content if present
        if (msg.content) {
          content.push({
            type: 'text' as const,
            text: msg.content
          });
        }

        // Add tool uses
        for (const toolCall of msg.toolCalls) {
          content.push({
            type: 'tool_use' as const,
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments)
          });
        }

        return {
          role: 'assistant' as const,
          content
        };
      }

      // Standard message
      return {
        role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: msg.content
      };
    });
  }

  /**
   * Convert OpenAI-style tools to Anthropic format
   */
  private convertTools(tools: IFunctionDefinition[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description || '',
      input_schema: {
        type: 'object' as const,
        properties: tool.function.parameters?.properties || {},
        required: tool.function.parameters?.required || []
      }
    }));
  }

  getProviderName(): string {
    return 'Anthropic';
  }

  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
