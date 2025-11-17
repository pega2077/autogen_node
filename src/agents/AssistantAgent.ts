import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig, StreamingChunk } from '../core/IAgent';
import { ILLMProvider, OpenAIProvider, OpenRouterProvider, OllamaProvider, AnthropicProvider, GeminiProvider } from '../providers';
import { IFunction, IFunctionDefinition } from '../core/IFunctionCall';
import { FunctionCallMiddleware } from '../core/FunctionCallMiddleware';

/**
 * LLM Provider types
 */
export type LLMProviderType = 'openai' | 'openrouter' | 'ollama' | 'anthropic' | 'gemini';

/**
 * Configuration for Assistant Agent with LLM provider
 */
export interface AssistantAgentConfig extends IAgentConfig {
  provider?: LLMProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
  functions?: IFunction[];
  debug?: boolean;
}

/**
 * Legacy configuration for backward compatibility
 */
export interface OpenAIAgentConfig extends IAgentConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * An agent that uses LLM providers (OpenAI, OpenRouter, Ollama) to generate responses
 * Similar to .NET's AssistantAgent with multiple LLM provider support
 */
export class AssistantAgent extends BaseAgent {
  private llmProvider: ILLMProvider;
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private functionMiddleware?: FunctionCallMiddleware;
  private debug: boolean;

  constructor(config: AssistantAgentConfig) {
    super(config);
    
    // Determine provider type (default to openai for backward compatibility)
    const providerType = config.provider || 'openai';
    this.model = config.model || this.getDefaultModel(providerType);
    this.temperature = config.temperature ?? 0;
    this.maxTokens = config.maxTokens || 1000;
    this.debug = config.debug ?? false;

    // Create the appropriate provider
    this.llmProvider = this.createProvider(
      providerType,
      config.apiKey,
      config.baseURL
    );

    // Set up function calling if functions are provided
    if (config.functions && config.functions.length > 0) {
      this.functionMiddleware = new FunctionCallMiddleware(config.functions, {
        debug: this.debug,
        scope: `AssistantAgent:${this.name}`
      });
    }
  }

  private logDebug(message: string, data?: unknown): void {
    if (!this.debug) {
      return;
    }
    const prefix = `[AssistantAgent:${this.name}] ${message}`;
    if (data !== undefined) {
      console.log(prefix, data);
    } else {
      console.log(prefix);
    }
  }

  /**
   * Get default model for each provider
   */
  private getDefaultModel(provider: LLMProviderType): string {
    switch (provider) {
      case 'openai':
        return 'gpt-3.5-turbo';
      case 'openrouter':
        return 'openai/gpt-3.5-turbo';
      case 'ollama':
        return 'llama2';
      case 'anthropic':
        return 'claude-3-5-sonnet-20241022';
      case 'gemini':
        return 'gemini-1.5-flash';
      default:
        return 'gpt-3.5-turbo';
    }
  }

  /**
   * Create LLM provider instance
   */
  private createProvider(
    type: LLMProviderType,
    apiKey?: string,
    baseURL?: string
  ): ILLMProvider {
    const config = {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      apiKey,
      baseURL
    };

    switch (type) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      default:
        throw new Error(`Unsupported provider: ${type}`);
    }
  }

  /**
   * Generate a reply using the configured LLM provider
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    try {
      this.logDebug('generateReply invoked', {
        incomingMessages: messages.length,
        provider: this.llmProvider.getProviderName()
      });
      // Apply memory to messages before processing
      const messagesWithMemory = await this.applyMemoryToMessages(messages);
      this.logDebug('memory applied', {
        totalMessages: messagesWithMemory.length
      });

      // If we have functions registered, use function calling
      if (this.functionMiddleware && this.functionMiddleware.getFunctions().length > 0) {
        const tools = this.getFunctionDefinitions();
        this.logDebug('function calling enabled', {
          toolCount: tools.length,
          toolNames: tools.map(tool => tool.function.name)
        });
        let currentMessages = [...messagesWithMemory];
        let loopGuard = 0;
        const maxIterations = 8;

        while (loopGuard < maxIterations) {
          loopGuard++;
          const reply = await this.llmProvider.generateReplyWithFunctions(
            currentMessages,
            tools,
            cancellationToken
          );
          this.logDebug('LLM reply received', {
            contentPreview: reply.content?.slice(0, 200) ?? '',
            toolCalls: reply.toolCalls?.map(tc => tc.function.name) ?? [],
            functionCall: reply.functionCall?.name ?? null,
            iteration: loopGuard
          });

          reply.name = this.name;
          this.addToHistory(reply);
          currentMessages.push(reply);

          if (!this.functionMiddleware.hasToolCalls(reply)) {
            this.logDebug('returning reply without further tool execution', {
              contentPreview: reply.content?.slice(0, 200) ?? '',
              iteration: loopGuard
            });
            return reply;
          }

          this.logDebug('tool calls detected', {
            toolCalls: reply.toolCalls?.map(tc => ({
              id: tc.id,
              name: tc.function.name
            })) ?? (reply.functionCall ? [{ name: reply.functionCall.name }] : []),
            iteration: loopGuard
          });

          const functionResults = await this.functionMiddleware.processToolCalls(reply);
          this.logDebug('tool call results',
            functionResults.map(result => ({
              role: result.role,
              name: result.name,
              contentPreview: result.content.slice(0, 200)
            }))
          );

          functionResults.forEach(result => {
            this.addToHistory(result);
            currentMessages.push(result);
          });
        }

        throw new Error('Exceeded maximum tool-call iterations without final response');
      }
      
      // Otherwise, use standard completion
      this.logDebug('using standard completion');
      const content = await this.llmProvider.generateCompletion(
        messagesWithMemory,
        cancellationToken
      );
      this.logDebug('standard completion received', {
        contentPreview: content.slice(0, 200)
      });

      const reply: IMessage = {
        role: 'assistant',
        content,
        name: this.name
      };

      this.addToHistory(reply);
      return reply;

    } catch (error) {
      this.logDebug('generateReply failed', error);
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
    this.llmProvider.updateConfig({ model });
  }

  /**
   * Update the temperature
   */
  setTemperature(temperature: number): void {
    this.temperature = temperature;
    this.llmProvider.updateConfig({ temperature });
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.llmProvider.getProviderName();
  }

  /**
   * Register a function for this agent
   */
  registerFunction(fn: IFunction): void {
    if (!this.functionMiddleware) {
      this.functionMiddleware = new FunctionCallMiddleware(undefined, {
        debug: this.debug,
        scope: `AssistantAgent:${this.name}`
      });
    }
    this.functionMiddleware.registerFunction(fn);
  }

  /**
   * Unregister a function
   */
  unregisterFunction(name: string): void {
    this.functionMiddleware?.unregisterFunction(name);
  }

  /**
   * Get all registered functions
   */
  getFunctions(): IFunction[] {
    return this.functionMiddleware?.getFunctions() || [];
  }

  /**
   * Get function definitions for LLM provider
   */
  getFunctionDefinitions(): IFunctionDefinition[] {
    if (!this.functionMiddleware) {
      return [];
    }

    const functions = this.functionMiddleware.getFunctions();
    return functions.map(fn => {
      // Convert to OpenAI format
      const properties: Record<string, any> = {};
      const required: string[] = [];

      if (fn.contract.parameters) {
        for (const param of fn.contract.parameters) {
          properties[param.name] = {
            type: param.type,
            description: param.description
          };

          if (param.type === 'object' && param.properties) {
            properties[param.name].properties = param.properties;
          }

          if (param.type === 'array' && param.items) {
            properties[param.name].items = param.items;
          }

          if (param.required) {
            required.push(param.name);
          }
        }
      }

      return {
        type: 'function',
        function: {
          name: fn.contract.name,
          description: fn.contract.description,
          parameters: {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined
          }
        }
      };
    });
  }

  /**
   * Process function calls in a message
   */
  async processFunctionCalls(message: IMessage): Promise<IMessage[]> {
    if (!this.functionMiddleware) {
      return [];
    }
    return this.functionMiddleware.processToolCalls(message);
  }

  /**
   * Generate a streaming reply
   * Note: Function calling is not supported in streaming mode
   */
  async* generateReplyStream(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): AsyncIterableIterator<StreamingChunk> {
    try {
      // Apply memory to messages before processing
      const messagesWithMemory = await this.applyMemoryToMessages(messages);

      // Check if provider supports streaming
      if (!this.llmProvider.generateStreamingCompletion) {
        throw new Error(`Provider ${this.llmProvider.getProviderName()} does not support streaming`);
      }

      // Generate streaming completion
      for await (const chunk of this.llmProvider.generateStreamingCompletion(messagesWithMemory, cancellationToken)) {
        yield chunk;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate streaming reply: ${error.message}`);
      }
      throw error;
    }
  }
}
