import { IMessage } from '../core/IAgent';
import {
  ContextManager,
  CompressionStrategy,
  ContextManagerConfig
} from '../core/ContextManager';

// Helper to create test messages
function createMessage(role: 'user' | 'assistant' | 'system' | 'function', content: string): IMessage {
  return { role, content };
}

describe('ContextManager', () => {
  describe('Basic Compression', () => {
    it('should not compress if under limits', () => {
      const manager = new ContextManager({
        maxMessages: 10,
        maxTokens: 10000
      });

      const messages: IMessage[] = [
        createMessage('system', 'You are helpful'),
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi there!')
      ];

      const result = manager.compress(messages);

      expect(result.messages).toEqual(messages);
      expect(result.messagesRemoved).toBe(0);
      expect(result.tokensSaved).toBe(0);
    });

    it('should detect when compression is needed', () => {
      const manager = new ContextManager({
        maxMessages: 5
      });

      const messages: IMessage[] = Array(10).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      expect(manager.needsCompression(messages)).toBe(true);
    });

    it('should provide accurate stats', () => {
      const manager = new ContextManager({
        maxMessages: 5,
        maxTokens: 100
      });

      const messages: IMessage[] = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi')
      ];

      const stats = manager.getStats(messages);

      expect(stats.messageCount).toBe(2);
      expect(stats.estimatedTokens).toBeGreaterThan(0);
      expect(stats.needsCompression).toBe(false);
    });
  });

  describe('Truncate Oldest Strategy', () => {
    it('should remove oldest messages when limit exceeded', () => {
      const manager = new ContextManager({
        maxMessages: 5,
        strategy: CompressionStrategy.TRUNCATE_OLDEST
      });

      const messages: IMessage[] = Array(10).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      const result = manager.compress(messages);

      expect(result.messages.length).toBeLessThanOrEqual(5);
      expect(result.messagesRemoved).toBeGreaterThan(0);
      // Should keep the most recent messages
      expect(result.messages[result.messages.length - 1].content).toBe('Message 9');
    });

    it('should preserve system messages', () => {
      const manager = new ContextManager({
        maxMessages: 5,
        strategy: CompressionStrategy.TRUNCATE_OLDEST,
        preserveSystem: true
      });

      const messages: IMessage[] = [
        createMessage('system', 'System prompt'),
        ...Array(10).fill(null).map((_, i) => createMessage('user', `Message ${i}`))
      ];

      const result = manager.compress(messages);

      // System message should be preserved
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('System prompt');
    });

    it('should preserve function messages', () => {
      const manager = new ContextManager({
        maxMessages: 5,
        strategy: CompressionStrategy.TRUNCATE_OLDEST,
        preserveFunctions: true
      });

      const messages: IMessage[] = [
        ...Array(10).fill(null).map((_, i) => createMessage('user', `Message ${i}`)),
        createMessage('function', 'Function result')
      ];

      const result = manager.compress(messages);

      // Function message should be preserved
      const hasFunctionMessage = result.messages.some(m => m.role === 'function');
      expect(hasFunctionMessage).toBe(true);
    });
  });

  describe('Selective Strategy', () => {
    it('should keep important messages', () => {
      const manager = new ContextManager({
        maxMessages: 20,
        strategy: CompressionStrategy.SELECTIVE
      });

      const messages: IMessage[] = [
        createMessage('system', 'System message'),
        createMessage('user', 'M1'),
        createMessage('user', 'M2'),
        createMessage('user', 'M3'),
        createMessage('user', 'M4'),
        createMessage('user', 'M5'),
        createMessage('user', 'M6'),
        createMessage('user', 'M7'),
        createMessage('user', 'M8'),
        createMessage('user', 'M9'),
        createMessage('user', 'M10'),
        createMessage('assistant', 'This is a very long and important message with lots of content that exceeds the threshold for being considered significant and should definitely be preserved during compression'),
        createMessage('user', 'M12'),
        createMessage('user', 'M13'),
        createMessage('user', 'M14'),
        createMessage('user', 'M15')
      ];

      const result = manager.compress(messages);

      // Should keep system message and long message
      const hasSystem = result.messages.some(m => m.role === 'system');
      const hasLongMessage = result.messages.some(m => m.content.length > 100);
      expect(hasSystem).toBe(true);
      expect(hasLongMessage).toBe(true);
    });

    it('should keep recent messages', () => {
      const manager = new ContextManager({
        maxMessages: 15,
        strategy: CompressionStrategy.SELECTIVE
      });

      const messages: IMessage[] = Array(20).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      const result = manager.compress(messages);

      // Should keep the last 10 messages (within threshold)
      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.content).toBe('Message 19');
    });
  });

  describe('Bookend Strategy', () => {
    it('should keep first and last messages', () => {
      const manager = new ContextManager({
        maxMessages: 6,
        strategy: CompressionStrategy.BOOKEND
      });

      const messages: IMessage[] = Array(10).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      const result = manager.compress(messages);

      // Should have summary message
      expect(result.summary).toBeDefined();
      // Should keep first and last messages
      expect(result.messages[0].content).toBe('Message 0');
      expect(result.messages[result.messages.length - 1].content).toBe('Message 9');
    });

    it('should create summary for compressed messages', () => {
      const manager = new ContextManager({
        maxMessages: 4,
        strategy: CompressionStrategy.BOOKEND
      });

      const messages: IMessage[] = Array(10).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      const result = manager.compress(messages);

      expect(result.summary).toContain('compressed');
      expect(result.messagesRemoved).toBeGreaterThan(0);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly', () => {
      const manager = new ContextManager({
        maxTokens: 10  // Very low limit
      });

      const messages: IMessage[] = [
        createMessage('user', 'This is a message with enough content to exceed a very low token limit')
      ];

      const stats = manager.getStats(messages);
      expect(stats.estimatedTokens).toBeGreaterThan(10);
      expect(stats.needsCompression).toBe(true);
    });

    it('should compress based on token limit', () => {
      const manager = new ContextManager({
        maxMessages: 100,  // High message limit
        maxTokens: 50      // Low token limit
      });

      const messages: IMessage[] = Array(10).fill(null).map(() =>
        createMessage('user', 'This is a moderately long message that will contribute to token count')
      );

      expect(manager.needsCompression(messages)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const manager = new ContextManager();
      const stats = manager.getStats([]);

      expect(stats.messageCount).toBe(0);
      expect(stats.needsCompression).toBe(false);
    });

    it('should allow updating configuration', () => {
      const manager = new ContextManager({
        maxMessages: 10
      });

      const messages: IMessage[] = Array(15).fill(null).map((_, i) =>
        createMessage('user', `Message ${i}`)
      );

      expect(manager.needsCompression(messages)).toBe(true);

      manager.updateConfig({ maxMessages: 20 });

      expect(manager.needsCompression(messages)).toBe(false);
    });

    it('should respect preserveSystem flag', () => {
      const managerWithPreserve = new ContextManager({
        maxMessages: 3,
        preserveSystem: true
      });

      const managerWithoutPreserve = new ContextManager({
        maxMessages: 3,
        preserveSystem: false
      });

      const messages: IMessage[] = [
        createMessage('system', 'System'),
        createMessage('user', 'M1'),
        createMessage('user', 'M2'),
        createMessage('user', 'M3'),
        createMessage('user', 'M4')
      ];

      const resultWith = managerWithPreserve.compress(messages);
      const resultWithout = managerWithoutPreserve.compress(messages);

      expect(resultWith.messages[0].role).toBe('system');
      // Without preserve, system might be removed depending on strategy
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message list', () => {
      const manager = new ContextManager();
      const result = manager.compress([]);

      expect(result.messages).toEqual([]);
      expect(result.messagesRemoved).toBe(0);
    });

    it('should handle single message', () => {
      const manager = new ContextManager({
        maxMessages: 5
      });

      const messages: IMessage[] = [
        createMessage('user', 'Only message')
      ];

      const result = manager.compress(messages);

      expect(result.messages).toEqual(messages);
      expect(result.messagesRemoved).toBe(0);
    });

    it('should handle messages with tool calls', () => {
      const manager = new ContextManager({
        maxMessages: 3,
        preserveFunctions: true
      });

      const messages: IMessage[] = [
        createMessage('user', 'M1'),
        createMessage('user', 'M2'),
        {
          role: 'assistant',
          content: '',
          toolCalls: [{
            id: '1',
            type: 'function',
            function: { name: 'test', arguments: '{}' }
          }]
        },
        createMessage('user', 'M3')
      ];

      const result = manager.compress(messages);

      // Message with tool calls should be preserved
      const hasToolCalls = result.messages.some(m => m.toolCalls);
      expect(hasToolCalls).toBe(true);
    });
  });
});
