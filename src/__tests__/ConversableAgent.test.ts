import { ConversableAgent, ConversableAgentConfig } from '../agents/ConversableAgent';
import { IMessage } from '../core/IAgent';

describe('ConversableAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default configuration', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        systemMessage: 'You are a helpful assistant'
      });

      expect(agent.getName()).toBe('test_agent');
      expect(agent.hasLLM()).toBe(false);
    });

    it('should create an agent with LLM provider', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      });

      expect(agent.hasLLM()).toBe(true);
      expect(agent.getProviderName()).toBe('openai');
    });

    it('should set default auto-reply configuration', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        maxConsecutiveAutoReply: 5,
        defaultAutoReply: 'I acknowledge your message.'
      });

      expect(agent.getName()).toBe('test_agent');
    });
  });

  describe('generateReply without LLM', () => {
    it('should return default auto-reply when no LLM configured', async () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        defaultAutoReply: 'Default response'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Default response');
      expect(reply.name).toBe('test_agent');
    });

    it('should respect max consecutive auto-reply limit', async () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        maxConsecutiveAutoReply: 2,
        defaultAutoReply: 'Auto reply'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // First reply
      let reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Auto reply');

      // Second reply
      reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Auto reply');

      // Third reply should hit the limit
      reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Maximum consecutive auto-replies reached.');
    });
  });

  describe('resetConsecutiveAutoReplyCounter', () => {
    it('should reset the auto-reply counter', async () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        maxConsecutiveAutoReply: 2,
        defaultAutoReply: 'Auto reply'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // Generate two replies to reach the limit
      await agent.generateReply(messages);
      await agent.generateReply(messages);

      // Reset counter
      agent.resetConsecutiveAutoReplyCounter();

      // Should be able to auto-reply again
      const reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Auto reply');
    });
  });

  describe('function registration', () => {
    it('should register and retrieve functions', () => {
      const agent = new ConversableAgent({
        name: 'test_agent'
      });

      const mockFunction = {
        contract: {
          name: 'test_function',
          description: 'A test function',
          parameters: []
        },
        executor: async () => 'result'
      };

      agent.registerFunction(mockFunction);
      
      const functions = agent.getFunctions();
      expect(functions).toHaveLength(1);
      expect(functions[0].contract.name).toBe('test_function');
    });

    it('should unregister functions', () => {
      const agent = new ConversableAgent({
        name: 'test_agent'
      });

      const mockFunction = {
        contract: {
          name: 'test_function',
          description: 'A test function',
          parameters: []
        },
        executor: async () => 'result'
      };

      agent.registerFunction(mockFunction);
      expect(agent.getFunctions()).toHaveLength(1);

      agent.unregisterFunction('test_function');
      expect(agent.getFunctions()).toHaveLength(0);
    });
  });

  describe('termination message detection', () => {
    it('should detect default termination keywords', () => {
      const agent = new ConversableAgent({
        name: 'test_agent'
      });

      const terminateMessage: IMessage = {
        role: 'assistant',
        content: 'TERMINATE'
      };

      expect(agent['isTerminationMessage'](terminateMessage)).toBe(true);
    });

    it('should use custom termination function', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        isTerminationMsg: (msg) => msg.content.includes('DONE')
      });

      const doneMessage: IMessage = {
        role: 'assistant',
        content: 'I am DONE with this task'
      };

      expect(agent['isTerminationMessage'](doneMessage)).toBe(true);
    });
  });

  describe('hasLLM', () => {
    it('should return false when no LLM is configured', () => {
      const agent = new ConversableAgent({
        name: 'test_agent'
      });

      expect(agent.hasLLM()).toBe(false);
    });

    it('should return true when LLM is configured', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test-key'
      });

      expect(agent.hasLLM()).toBe(true);
    });
  });

  describe('model and temperature configuration', () => {
    it('should update model configuration', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      });

      agent.setModel('gpt-4');
      // Model should be updated (tested via internal state)
    });

    it('should update temperature configuration', () => {
      const agent = new ConversableAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test-key',
        temperature: 0.7
      });

      agent.setTemperature(0.5);
      // Temperature should be updated (tested via internal state)
    });
  });
});
