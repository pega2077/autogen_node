import OpenAI from 'openai';
import { IMessage } from '../core/IAgent';
import { ILLMProvider, LLMProviderConfig } from './ILLMProvider';
import { IFunctionDefinition } from '../core/IFunctionCall';

/**
 * Ollama provider implementation
 * Ollama provides a local LLM server with OpenAI-compatible API
 */
export class OllamaProvider implements ILLMProvider {
  private client: OpenAI;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
    
    // Ollama uses OpenAI-compatible API with local base URL
    // Default Ollama URL is http://localhost:11434/v1
    this.client = new OpenAI({
      apiKey: config.apiKey || 'ollama', // Ollama doesn't require API key but OpenAI client needs one
      baseURL: config.baseURL || 'http://localhost:11434/v1'
    });
  }

  async generateCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const ollamaMessages = this.convertMessages(messages);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: ollamaMessages,
      temperature: this.config.temperature ?? 0,
      ...(this.config.maxTokens && { max_tokens: this.config.maxTokens })
    }, {
      signal: cancellationToken
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateReplyWithFunctions(
    messages: IMessage[],
    tools?: IFunctionDefinition[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const ollamaMessages = this.convertMessages(messages);

    const requestParams: any = {
      model: this.config.model,
      messages: ollamaMessages,
      temperature: this.config.temperature ?? 0
    };

    if (this.config.maxTokens) {
      requestParams.max_tokens = this.config.maxTokens;
    }

    // Note: Ollama's function calling support varies by model
    // Some newer models support it, some don't
    if (tools && tools.length > 0) {
      requestParams.tools = tools;
      requestParams.tool_choice = 'auto';
    }

    const response = await this.client.chat.completions.create(
      requestParams,
      { signal: cancellationToken }
    );

    const choice = response.choices[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('No message in response');
    }

    const result: IMessage = {
      role: 'assistant',
      content: message.content || ''
    };

    // Handle tool calls if supported
    if (message.tool_calls && message.tool_calls.length > 0) {
      result.toolCalls = message.tool_calls.map((tc: any) => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
    }

    return result;
  }

  private convertMessages(messages: IMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      const base: any = {
        role: msg.role,
        content: msg.content
      };

      if (msg.name) {
        base.name = msg.name;
      }

      if (msg.toolCallId) {
        base.tool_call_id = msg.toolCallId;
      }

      if (msg.toolCalls) {
        base.tool_calls = msg.toolCalls;
      }

      return base;
    });
  }

  getProviderName(): string {
    return 'Ollama';
  }

  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
