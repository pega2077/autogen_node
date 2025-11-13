import OpenAI from 'openai';
import { IMessage } from '../core/IAgent';
import { ILLMProvider, LLMProviderConfig, StreamingChunk } from './ILLMProvider';
import { IFunctionDefinition } from '../core/IFunctionCall';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey
    });
  }

  async generateCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const openAIMessages = this.convertMessages(messages);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: openAIMessages,
      temperature: this.config.temperature ?? 0,
      max_tokens: this.config.maxTokens || 1000
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
    const openAIMessages = this.convertMessages(messages);

    const requestParams: any = {
      model: this.config.model,
      messages: openAIMessages,
      temperature: this.config.temperature ?? 0,
      max_tokens: this.config.maxTokens || 1000
    };

    // Add tools if provided
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

    // Handle tool calls
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

    // Handle legacy function_call
    if (message.function_call) {
      result.functionCall = {
        name: message.function_call.name,
        arguments: message.function_call.arguments
      };
    }

    return result;
  }

  /**
   * Generate a streaming completion
   */
  async* generateStreamingCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): AsyncIterableIterator<StreamingChunk> {
    const openAIMessages = this.convertMessages(messages);

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: openAIMessages,
      temperature: this.config.temperature ?? 0,
      max_tokens: this.config.maxTokens || 1000,
      stream: true
    }, {
      signal: cancellationToken
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      const isComplete = chunk.choices[0]?.finish_reason !== null;
      
      yield {
        delta,
        isComplete
      };
    }
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

      if (msg.functionCall) {
        base.function_call = msg.functionCall;
      }

      return base;
    });
  }

  getProviderName(): string {
    return 'OpenAI';
  }

  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
