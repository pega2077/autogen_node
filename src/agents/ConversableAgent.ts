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
 * Configuration for ConversableAgent
 * More flexible than BaseAgent, allowing optional LLM configuration
 */
export interface ConversableAgentConfig extends IAgentConfig {
  provider?: LLMProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
  functions?: IFunction[];
  humanInputMode?: 'ALWAYS' | 'TERMINATE' | 'NEVER';
  isTerminationMsg?: (message: IMessage) => boolean;
  maxConsecutiveAutoReply?: number;
  defaultAutoReply?: string;
  codeExecution?: boolean;
}

/**
 * A more flexible conversable agent that can optionally use LLM or provide custom reply logic
 * This is a higher-level abstraction than BaseAgent, similar to Microsoft AutoGen's ConversableAgent
 * 
 * ConversableAgent provides:
 * - Optional LLM integration (can work without LLM)
 * - Configurable human input modes
 * - Auto-reply limits
 * - Function calling support
 * - Termination message detection
 * - More flexible than AssistantAgent or UserProxyAgent
 */
export class ConversableAgent extends BaseAgent {
  private llmProvider?: ILLMProvider;
  private model?: string;
  private temperature: number;
  private maxTokens: number;
  private functionMiddleware?: FunctionCallMiddleware;
  private humanInputMode: 'ALWAYS' | 'TERMINATE' | 'NEVER';
  private customIsTerminationMsg?: (message: IMessage) => boolean;
  private maxConsecutiveAutoReply: number;
  private consecutiveAutoReplyCounter: number = 0;
  private defaultAutoReply: string;

  constructor(config: ConversableAgentConfig) {
    super(config);
    
    this.humanInputMode = config.humanInputMode || 'NEVER';
    this.customIsTerminationMsg = config.isTerminationMsg;
    this.maxConsecutiveAutoReply = config.maxConsecutiveAutoReply ?? Infinity;
    this.defaultAutoReply = config.defaultAutoReply || '';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens || 1000;

    // LLM configuration is optional
    if (config.provider && config.apiKey) {
      const providerType = config.provider;
      this.model = config.model || this.getDefaultModel(providerType);
      
      this.llmProvider = this.createProvider(
        providerType,
        config.apiKey,
        config.baseURL
      );
    }

    // Set up function calling if functions are provided
    if (config.functions && config.functions.length > 0) {
      this.functionMiddleware = new FunctionCallMiddleware(config.functions);
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
      model: this.model!,
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
   * Generate a reply - flexible implementation supporting multiple modes
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    try {
      // Check consecutive auto-reply limit
      if (this.consecutiveAutoReplyCounter >= this.maxConsecutiveAutoReply) {
        this.consecutiveAutoReplyCounter = 0;
        return {
          role: 'assistant',
          content: 'Maximum consecutive auto-replies reached.',
          name: this.name
        };
      }

      // Apply memory to messages before processing
      const messagesWithMemory = await this.applyMemoryToMessages(messages);

      // If LLM is available, use it
      if (this.llmProvider) {
        this.consecutiveAutoReplyCounter++;
        return await this.generateLLMReply(messagesWithMemory, cancellationToken);
      }

      // Otherwise, use default auto-reply
      this.consecutiveAutoReplyCounter++;
      const reply: IMessage = {
        role: 'assistant',
        content: this.defaultAutoReply || 'I received your message.',
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
   * Generate LLM-based reply
   */
  private async generateLLMReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not configured');
    }

    // If we have functions registered, use function calling
    if (this.functionMiddleware && this.functionMiddleware.getFunctions().length > 0) {
      const tools = this.getFunctionDefinitions();
      const reply = await this.llmProvider.generateReplyWithFunctions(
        messages,
        tools,
        cancellationToken
      );
      
      reply.name = this.name;
      this.addToHistory(reply);
      
      // If the reply contains tool calls, execute them and continue
      if (this.functionMiddleware.hasToolCalls(reply)) {
        const functionResults = await this.functionMiddleware.processToolCalls(reply);
        
        // Add function results to history
        functionResults.forEach(result => this.addToHistory(result));
        
        // Generate a follow-up response with function results
        const allMessages = [...messages, reply, ...functionResults];
        const finalReply = await this.llmProvider.generateReplyWithFunctions(
          allMessages,
          tools,
          cancellationToken
        );
        
        finalReply.name = this.name;
        this.addToHistory(finalReply);
        return finalReply;
      }
      
      return reply;
    }
    
    // Otherwise, use standard completion
    const content = await this.llmProvider.generateCompletion(
      messages,
      cancellationToken
    );

    const reply: IMessage = {
      role: 'assistant',
      content,
      name: this.name
    };

    this.addToHistory(reply);
    return reply;
  }

  /**
   * Reset consecutive auto-reply counter
   */
  resetConsecutiveAutoReplyCounter(): void {
    this.consecutiveAutoReplyCounter = 0;
  }

  /**
   * Check if a message indicates termination
   */
  protected isTerminationMessage(message: IMessage): boolean {
    if (this.customIsTerminationMsg) {
      return this.customIsTerminationMsg(message);
    }
    return super.isTerminationMessage(message);
  }

  /**
   * Register a function for this agent
   */
  registerFunction(fn: IFunction): void {
    if (!this.functionMiddleware) {
      this.functionMiddleware = new FunctionCallMiddleware();
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
   * Update the model configuration (if LLM is configured)
   */
  setModel(model: string): void {
    this.model = model;
    this.llmProvider?.updateConfig({ model });
  }

  /**
   * Update the temperature (if LLM is configured)
   */
  setTemperature(temperature: number): void {
    this.temperature = temperature;
    this.llmProvider?.updateConfig({ temperature });
  }

  /**
   * Get the current provider name (if LLM is configured)
   */
  getProviderName(): string | undefined {
    return this.llmProvider?.getProviderName();
  }

  /**
   * Check if this agent has LLM configured
   */
  hasLLM(): boolean {
    return this.llmProvider !== undefined;
  }

  /**
   * Generate a streaming reply (if LLM supports it)
   */
  async* generateReplyStream(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): AsyncIterableIterator<StreamingChunk> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not configured for streaming');
    }

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
