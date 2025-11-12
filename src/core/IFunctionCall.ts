/**
 * Represents a function parameter definition
 */
export interface IFunctionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  properties?: Record<string, IFunctionParameter>;
  items?: IFunctionParameter;
}

/**
 * Represents a function contract that can be called by agents
 * Similar to .NET AutoGen's FunctionContract
 */
export interface IFunctionContract {
  name: string;
  description?: string;
  parameters?: IFunctionParameter[];
}

/**
 * Represents a function call with arguments
 */
export interface IFunctionCall {
  name: string;
  arguments: string | Record<string, any>;
  id?: string;
}

/**
 * Represents the result of a function execution
 */
export interface IFunctionResult {
  name: string;
  content: string;
  callId?: string;
}

/**
 * Function definition for OpenAI-style tool calling
 */
export interface IFunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Type for a function that can be executed
 */
export type FunctionExecutor = (...args: any[]) => Promise<string> | string;

/**
 * Function implementation with contract
 */
export interface IFunction {
  contract: IFunctionContract;
  executor: FunctionExecutor;
}
