import { IMessage } from './IAgent';
import { IFunction, IFunctionResult } from './IFunctionCall';

/**
 * Middleware for handling function calls
 * Similar to .NET AutoGen's FunctionCallMiddleware
 */
export class FunctionCallMiddleware {
  private functions: Map<string, IFunction>;
  private debug: boolean;
  private scope: string;

  constructor(functions?: IFunction[], options?: { debug?: boolean; scope?: string }) {
    this.functions = new Map();
    this.debug = options?.debug ?? false;
    this.scope = options?.scope ?? 'FunctionCallMiddleware';
    if (functions) {
      functions.forEach(fn => this.registerFunction(fn));
    }
  }

  private logDebug(message: string, data?: unknown): void {
    if (!this.debug) {
      return;
    }
    const prefix = `[${this.scope}] ${message}`;
    if (data !== undefined) {
      console.log(prefix, data);
    } else {
      console.log(prefix);
    }
  }

  /**
   * Register a function for execution
   */
  registerFunction(fn: IFunction): void {
    this.functions.set(fn.contract.name, fn);
    this.logDebug('registered function', fn.contract.name);
  }

  /**
   * Unregister a function
   */
  unregisterFunction(name: string): void {
    this.functions.delete(name);
    this.logDebug('unregistered function', name);
  }

  /**
   * Get all registered functions
   */
  getFunctions(): IFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get a function by name
   */
  getFunction(name: string): IFunction | undefined {
    return this.functions.get(name);
  }

  /**
   * Execute a function call
   */
  async executeFunction(name: string, args: Record<string, any>): Promise<string> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function ${name} not found`);
    }

    try {
      this.logDebug('executing function', { name, args });
      // Convert args object to array based on function parameters
      const argValues = this.extractArgumentValues(fn, args);
      const result = await fn.executor(...argValues);
      this.logDebug('function executed', {
        name,
        resultPreview: typeof result === 'string' ? result.slice(0, 200) : result
      });
      return typeof result === 'string' ? result : JSON.stringify(result);
    } catch (error) {
      this.logDebug('function execution failed', { name, error });
      if (error instanceof Error) {
        throw new Error(`Error executing function ${name}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extract argument values in the correct order
   */
  private extractArgumentValues(fn: IFunction, args: Record<string, any>): any[] {
    if (!fn.contract.parameters || fn.contract.parameters.length === 0) {
      return [];
    }

    return fn.contract.parameters.map(param => {
      const value = args[param.name];
      if (value === undefined && param.required) {
        throw new Error(`Required parameter ${param.name} is missing`);
      }
      return value;
    });
  }

  /**
   * Process a message with tool calls and execute functions
   */
  async processToolCalls(message: IMessage): Promise<IMessage[]> {
    const results: IMessage[] = [];

    // Handle new-style tool calls
    if (message.toolCalls && message.toolCalls.length > 0) {
      this.logDebug('processing tool calls', message.toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments
      })));
      for (const toolCall of message.toolCalls) {
        if (toolCall.type === 'function') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await this.executeFunction(toolCall.function.name, args);
            this.logDebug('tool call succeeded', {
              id: toolCall.id,
              name: toolCall.function.name,
              resultPreview: result.slice(0, 200)
            });
            
            results.push({
              role: 'tool',
              content: result,
              toolCallId: toolCall.id,
              name: toolCall.function.name
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            this.logDebug('tool call failed', {
              id: toolCall.id,
              name: toolCall.function.name,
              error: errorMsg
            });
            results.push({
              role: 'tool',
              content: `Error: ${errorMsg}`,
              toolCallId: toolCall.id,
              name: toolCall.function.name
            });
          }
        }
      }
    }
    // Handle legacy function call format
    else if (message.functionCall) {
      this.logDebug('processing legacy function call', {
        name: message.functionCall.name,
        arguments: message.functionCall.arguments
      });
      try {
        const args = JSON.parse(message.functionCall.arguments);
        const result = await this.executeFunction(message.functionCall.name, args);
        this.logDebug('legacy function call succeeded', {
          name: message.functionCall.name,
          resultPreview: result.slice(0, 200)
        });
        
        results.push({
          role: 'function',
          content: result,
          name: message.functionCall.name
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        this.logDebug('legacy function call failed', {
          name: message.functionCall.name,
          error: errorMsg
        });
        results.push({
          role: 'function',
          content: `Error: ${errorMsg}`,
          name: message.functionCall.name
        });
      }
    }

    if (results.length === 0) {
      this.logDebug('no tool calls to process');
    }

    return results;
  }

  /**
   * Check if a message contains function/tool calls
   */
  hasToolCalls(message: IMessage): boolean {
    return !!(message.toolCalls?.length || message.functionCall);
  }
}
