import { IFunctionContract, IFunctionParameter, IFunctionDefinition, IFunction, FunctionExecutor } from './IFunctionCall';

/**
 * Helper class to build function contracts
 * Similar to .NET AutoGen's FunctionContract
 */
export class FunctionContract {
  private contract: IFunctionContract;
  private executor?: FunctionExecutor;

  constructor(name: string, description?: string) {
    this.contract = {
      name,
      description,
      parameters: []
    };
  }

  /**
   * Add a parameter to the function
   */
  addParameter(param: IFunctionParameter): FunctionContract {
    if (!this.contract.parameters) {
      this.contract.parameters = [];
    }
    this.contract.parameters.push(param);
    return this;
  }

  /**
   * Set the function executor
   */
  setExecutor(executor: FunctionExecutor): FunctionContract {
    this.executor = executor;
    return this;
  }

  /**
   * Get the contract
   */
  getContract(): IFunctionContract {
    return this.contract;
  }

  /**
   * Get the executor
   */
  getExecutor(): FunctionExecutor | undefined {
    return this.executor;
  }

  /**
   * Convert to OpenAI function definition format
   */
  toOpenAIFunction(): IFunctionDefinition {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (this.contract.parameters) {
      for (const param of this.contract.parameters) {
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
        name: this.contract.name,
        description: this.contract.description,
        parameters: {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined
        }
      }
    };
  }

  /**
   * Create a complete function with executor
   */
  build(): IFunction {
    if (!this.executor) {
      throw new Error(`Function ${this.contract.name} has no executor`);
    }
    return {
      contract: this.contract,
      executor: this.executor
    };
  }

  /**
   * Create a function contract from a simple function
   */
  static fromFunction(
    name: string,
    description: string,
    parameters: IFunctionParameter[],
    executor: FunctionExecutor
  ): IFunction {
    const builder = new FunctionContract(name, description);
    parameters.forEach(param => builder.addParameter(param));
    builder.setExecutor(executor);
    return builder.build();
  }
}
