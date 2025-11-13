import { AssistantAgent } from '../agents/AssistantAgent';
import { ListMemory, MemoryContent, MemoryMimeType } from '../core/memory';
import { IMessage } from '../core/IAgent';

describe('Memory Integration with Agents', () => {
  describe('AssistantAgent with Memory', () => {
    it('should accept memory in configuration', () => {
      const memory = new ListMemory({ name: 'test_memory' });
      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory]
      });

      expect(agent.getMemory()).toHaveLength(1);
      expect(agent.getMemory()[0].name).toBe('test_memory');
    });

    it('should add memory to agent after creation', () => {
      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key'
      });

      expect(agent.getMemory()).toHaveLength(0);

      const memory = new ListMemory({ name: 'test_memory' });
      agent.addMemory(memory);

      expect(agent.getMemory()).toHaveLength(1);
      expect(agent.getMemory()[0].name).toBe('test_memory');
    });

    it('should support multiple memory instances', () => {
      const memory1 = new ListMemory({ name: 'memory1' });
      const memory2 = new ListMemory({ name: 'memory2' });

      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory1]
      });

      agent.addMemory(memory2);

      expect(agent.getMemory()).toHaveLength(2);
      expect(agent.getMemory()[0].name).toBe('memory1');
      expect(agent.getMemory()[1].name).toBe('memory2');
    });

    it('should clear memory instances', () => {
      const memory = new ListMemory({ name: 'test_memory' });
      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory]
      });

      expect(agent.getMemory()).toHaveLength(1);
      agent.clearMemory();
      expect(agent.getMemory()).toHaveLength(0);
    });

    it('should inject memory context into messages', async () => {
      const memory = new ListMemory({ name: 'test_memory' });
      await memory.add({
        content: 'User prefers concise responses',
        mimeType: MemoryMimeType.TEXT
      });

      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory]
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      // Apply memory to messages
      const messagesWithMemory = await (agent as any).applyMemoryToMessages(messages);

      expect(messagesWithMemory.length).toBeGreaterThan(messages.length);
      const systemMessage = messagesWithMemory.find((m: IMessage) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toContain('User prefers concise responses');
      expect(systemMessage?.content).toContain('Relevant memory content');
    });

    it('should handle empty memory gracefully', async () => {
      const memory = new ListMemory({ name: 'empty_memory' });
      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory]
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const messagesWithMemory = await (agent as any).applyMemoryToMessages(messages);

      // Should not add anything when memory is empty
      expect(messagesWithMemory.length).toBe(messages.length);
    });

    it('should support memory with existing system message', async () => {
      const memory = new ListMemory({ name: 'test_memory' });
      await memory.add({
        content: 'Memory content',
        mimeType: MemoryMimeType.TEXT
      });

      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        systemMessage: 'Original system message',
        memory: [memory]
      });

      const messages: IMessage[] = [
        { role: 'system', content: 'Original system message' },
        { role: 'user', content: 'Hello' }
      ];

      const messagesWithMemory = await (agent as any).applyMemoryToMessages(messages);

      expect(messagesWithMemory).toHaveLength(2);
      const systemMessage = messagesWithMemory[0];
      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('Original system message');
      expect(systemMessage.content).toContain('Memory content');
    });

    it('should support multiple memory instances with different content', async () => {
      const userPreferences = new ListMemory({ name: 'preferences' });
      await userPreferences.add({
        content: 'User likes detailed explanations',
        mimeType: MemoryMimeType.TEXT
      });

      const conversationHistory = new ListMemory({ name: 'history' });
      await conversationHistory.add({
        content: 'Previously discussed TypeScript',
        mimeType: MemoryMimeType.TEXT
      });

      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [userPreferences, conversationHistory]
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Tell me about JavaScript' }
      ];

      const messagesWithMemory = await (agent as any).applyMemoryToMessages(messages);

      const systemMessage = messagesWithMemory.find((m: IMessage) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toContain('User likes detailed explanations');
      expect(systemMessage?.content).toContain('Previously discussed TypeScript');
    });

    it('should support JSON memory content', async () => {
      const memory = new ListMemory({ name: 'structured_memory' });
      await memory.add({
        content: { preference: 'formal', language: 'English' },
        mimeType: MemoryMimeType.JSON
      });

      const agent = new AssistantAgent({
        name: 'test_agent',
        provider: 'openai',
        apiKey: 'test_key',
        memory: [memory]
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const messagesWithMemory = await (agent as any).applyMemoryToMessages(messages);

      const systemMessage = messagesWithMemory.find((m: IMessage) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toContain('preference');
    });
  });
});
