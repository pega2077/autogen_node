import { FunctionContract, FunctionCallMiddleware, IFunction } from '../index';

describe('FunctionContract', () => {
  describe('Builder pattern', () => {
    it('should create a function contract with parameters', () => {
      const contract = new FunctionContract('testFunction', 'A test function');
      contract.addParameter({
        name: 'param1',
        type: 'string',
        description: 'First parameter',
        required: true
      });

      const result = contract.getContract();
      expect(result.name).toBe('testFunction');
      expect(result.description).toBe('A test function');
      expect(result.parameters).toHaveLength(1);
      expect(result.parameters![0].name).toBe('param1');
    });

    it('should set executor', () => {
      const executor = async (x: number) => `Result: ${x}`;
      const contract = new FunctionContract('multiply', 'Multiply numbers');
      contract.setExecutor(executor);

      expect(contract.getExecutor()).toBe(executor);
    });

    it('should build complete function', () => {
      const executor = async (x: number, y: number) => `${x + y}`;
      const fn = new FunctionContract('add', 'Add two numbers')
        .addParameter({ name: 'x', type: 'number', required: true })
        .addParameter({ name: 'y', type: 'number', required: true })
        .setExecutor(executor)
        .build();

      expect(fn.contract.name).toBe('add');
      expect(fn.executor).toBe(executor);
    });

    it('should throw error when building without executor', () => {
      const contract = new FunctionContract('test', 'Test');
      expect(() => contract.build()).toThrow('has no executor');
    });
  });

  describe('fromFunction static method', () => {
    it('should create complete function from parameters', () => {
      const executor = async (name: string) => `Hello, ${name}!`;
      const fn = FunctionContract.fromFunction(
        'greet',
        'Greet a person',
        [{ name: 'name', type: 'string', required: true }],
        executor
      );

      expect(fn.contract.name).toBe('greet');
      expect(fn.contract.description).toBe('Greet a person');
      expect(fn.executor).toBe(executor);
    });
  });

  describe('toOpenAIFunction', () => {
    it('should convert to OpenAI function definition format', () => {
      const contract = new FunctionContract('getWeather', 'Get weather')
        .addParameter({
          name: 'location',
          type: 'string',
          description: 'City name',
          required: true
        })
        .addParameter({
          name: 'unit',
          type: 'string',
          description: 'Temperature unit',
          required: false
        });

      const openAIFormat = contract.toOpenAIFunction();

      expect(openAIFormat.type).toBe('function');
      expect(openAIFormat.function.name).toBe('getWeather');
      expect(openAIFormat.function.description).toBe('Get weather');
      expect(openAIFormat.function.parameters?.type).toBe('object');
      expect(openAIFormat.function.parameters?.properties.location).toBeDefined();
      expect(openAIFormat.function.parameters?.required).toEqual(['location']);
    });
  });
});

describe('FunctionCallMiddleware', () => {
  let middleware: FunctionCallMiddleware;
  let testFunction: IFunction;

  beforeEach(() => {
    testFunction = FunctionContract.fromFunction(
      'add',
      'Add two numbers',
      [
        { name: 'a', type: 'number', required: true },
        { name: 'b', type: 'number', required: true }
      ],
      async (a: number, b: number) => `${a + b}`
    );

    middleware = new FunctionCallMiddleware([testFunction]);
  });

  describe('Function registration', () => {
    it('should register functions on initialization', () => {
      const fns = middleware.getFunctions();
      expect(fns).toHaveLength(1);
      expect(fns[0].contract.name).toBe('add');
    });

    it('should register function manually', () => {
      const newFn = FunctionContract.fromFunction(
        'subtract',
        'Subtract numbers',
        [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true }
        ],
        async (a: number, b: number) => `${a - b}`
      );

      middleware.registerFunction(newFn);
      expect(middleware.getFunctions()).toHaveLength(2);
    });

    it('should unregister function', () => {
      middleware.unregisterFunction('add');
      expect(middleware.getFunctions()).toHaveLength(0);
    });

    it('should get function by name', () => {
      const fn = middleware.getFunction('add');
      expect(fn).toBeDefined();
      expect(fn!.contract.name).toBe('add');
    });
  });

  describe('Function execution', () => {
    it('should execute function with arguments', async () => {
      const result = await middleware.executeFunction('add', { a: 5, b: 3 });
      expect(result).toBe('8');
    });

    it('should throw error for non-existent function', async () => {
      await expect(
        middleware.executeFunction('nonexistent', {})
      ).rejects.toThrow('Function nonexistent not found');
    });

    it('should throw error for missing required parameter', async () => {
      await expect(
        middleware.executeFunction('add', { a: 5 })
      ).rejects.toThrow('Required parameter b is missing');
    });

    it('should handle function execution errors', async () => {
      const errorFn = FunctionContract.fromFunction(
        'error',
        'Throws error',
        [],
        async () => {
          throw new Error('Test error');
        }
      );

      middleware.registerFunction(errorFn);

      await expect(
        middleware.executeFunction('error', {})
      ).rejects.toThrow('Error executing function error: Test error');
    });
  });

  describe('Tool call processing', () => {
    it('should process tool calls in message', async () => {
      const message = {
        role: 'assistant' as const,
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: {
              name: 'add',
              arguments: JSON.stringify({ a: 10, b: 20 })
            }
          }
        ]
      };

      const results = await middleware.processToolCalls(message);

      expect(results).toHaveLength(1);
      expect(results[0].role).toBe('tool');
      expect(results[0].content).toBe('30');
      expect(results[0].toolCallId).toBe('call_1');
      expect(results[0].name).toBe('add');
    });

    it('should handle errors in tool call execution', async () => {
      const message = {
        role: 'assistant' as const,
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: {
              name: 'add',
              arguments: JSON.stringify({ a: 10 }) // Missing required param
            }
          }
        ]
      };

      const results = await middleware.processToolCalls(message);

      expect(results).toHaveLength(1);
      expect(results[0].role).toBe('tool');
      expect(results[0].content).toContain('Error');
      expect(results[0].toolCallId).toBe('call_1');
    });

    it('should process legacy function calls', async () => {
      const message = {
        role: 'assistant' as const,
        content: '',
        functionCall: {
          name: 'add',
          arguments: JSON.stringify({ a: 7, b: 3 })
        }
      };

      const results = await middleware.processToolCalls(message);

      expect(results).toHaveLength(1);
      expect(results[0].role).toBe('function');
      expect(results[0].content).toBe('10');
      expect(results[0].name).toBe('add');
    });

    it('should detect tool calls in message', () => {
      const messageWithToolCalls = {
        role: 'assistant' as const,
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function' as const,
            function: { name: 'test', arguments: '{}' }
          }
        ]
      };

      const messageWithFunctionCall = {
        role: 'assistant' as const,
        content: '',
        functionCall: { name: 'test', arguments: '{}' }
      };

      const messageWithoutCalls = {
        role: 'assistant' as const,
        content: 'Just text'
      };

      expect(middleware.hasToolCalls(messageWithToolCalls)).toBe(true);
      expect(middleware.hasToolCalls(messageWithFunctionCall)).toBe(true);
      expect(middleware.hasToolCalls(messageWithoutCalls)).toBe(false);
    });
  });
});
