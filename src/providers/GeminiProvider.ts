import { GoogleGenerativeAI, GenerativeModel, Content, Part, FunctionDeclaration, Tool } from '@google/generative-ai';
import { IMessage } from '../core/IAgent';
import { ILLMProvider, LLMProviderConfig } from './ILLMProvider';
import { IFunctionDefinition } from '../core/IFunctionCall';

/**
 * Google Gemini provider implementation
 * Supports Gemini models via the Google Generative AI SDK
 */
export class GeminiProvider implements ILLMProvider {
  private client: GoogleGenerativeAI;
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.config = config;
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async generateCompletion(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const model = this.client.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature ?? 0,
        maxOutputTokens: this.config.maxTokens || 1000
      }
    });

    const { history, currentMessage } = this.convertMessages(messages);

    // Start chat with history
    const chat = model.startChat({
      history
    });

    // Send the current message
    const result = await chat.sendMessage(currentMessage);
    const response = result.response;
    return response.text();
  }

  async generateReplyWithFunctions(
    messages: IMessage[],
    tools?: IFunctionDefinition[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const modelConfig: any = {
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature ?? 0,
        maxOutputTokens: this.config.maxTokens || 1000
      }
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      modelConfig.tools = this.convertTools(tools);
    }

    const model = this.client.getGenerativeModel(modelConfig);

    const { history, currentMessage } = this.convertMessages(messages);

    // Start chat with history
    const chat = model.startChat({
      history
    });

    // Send the current message
    const result = await chat.sendMessage(currentMessage);
    const response = result.response;

    const resultMessage: IMessage = {
      role: 'assistant',
      content: ''
    };

    // Check for function calls
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Convert Gemini function calls to OpenAI-compatible format
      resultMessage.toolCalls = functionCalls.map((fc, index) => ({
        id: `call_${Date.now()}_${index}`,
        type: 'function' as const,
        function: {
          name: fc.name,
          arguments: JSON.stringify(fc.args)
        }
      }));
      
      // Get text content if any
      try {
        resultMessage.content = response.text() || '';
      } catch (e) {
        // If no text is available (only function calls), that's fine
        resultMessage.content = '';
      }
    } else {
      // No function calls, just get the text
      resultMessage.content = response.text();
    }

    return resultMessage;
  }

  /**
   * Convert internal messages to Gemini format
   */
  private convertMessages(messages: IMessage[]): { history: Content[], currentMessage: string } {
    const history: Content[] = [];
    let systemInstruction = '';

    // Extract system messages
    const systemMessages = messages.filter(msg => msg.role === 'system');
    if (systemMessages.length > 0) {
      systemInstruction = systemMessages.map(msg => msg.content).join('\n');
    }

    // Filter non-system messages
    const nonSystemMessages = messages.filter(msg => msg.role !== 'system');

    // Convert messages to Gemini format
    for (let i = 0; i < nonSystemMessages.length - 1; i++) {
      const msg = nonSystemMessages[i];
      
      // Handle tool/function results
      if (msg.role === 'tool' && msg.toolCallId) {
        // Add function response
        history.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.name || 'function',
              response: {
                result: msg.content
              }
            }
          }]
        });
        continue;
      }

      // Handle messages with tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: Part[] = [];
        
        // Add text if present
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        // Add function calls
        for (const toolCall of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments)
            }
          });
        }

        history.push({
          role: 'model',
          parts
        });
        continue;
      }

      // Standard message
      const role = msg.role === 'assistant' ? 'model' : 'user';
      history.push({
        role,
        parts: [{ text: msg.content }]
      });
    }

    // The last message is the current message
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    const currentMessage = lastMessage?.content || '';

    // Prepend system instruction to first user message if exists
    if (systemInstruction && history.length > 0) {
      const firstUserIndex = history.findIndex(h => h.role === 'user');
      if (firstUserIndex !== -1 && history[firstUserIndex].parts[0]) {
        const firstPart = history[firstUserIndex].parts[0];
        if ('text' in firstPart) {
          firstPart.text = systemInstruction + '\n\n' + firstPart.text;
        }
      }
    } else if (systemInstruction && nonSystemMessages.length === 1) {
      // If only one message (the current), prepend to it
      return { 
        history, 
        currentMessage: systemInstruction + '\n\n' + currentMessage 
      };
    }

    return { history, currentMessage };
  }

  /**
   * Convert OpenAI-style tools to Gemini format
   */
  private convertTools(tools: IFunctionDefinition[]): Tool[] {
    const functionDeclarations: FunctionDeclaration[] = tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description || '',
      parameters: tool.function.parameters as any
    }));

    return [{
      functionDeclarations
    }];
  }

  getProviderName(): string {
    return 'Gemini';
  }

  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
