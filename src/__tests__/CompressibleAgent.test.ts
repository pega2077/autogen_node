import { CompressibleAgent, CompressionStrategy } from '../agents/CompressibleAgent';
import { IMessage } from '../core/IAgent';

describe('CompressibleAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default configuration', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        systemMessage: 'You are a helpful assistant'
      });

      expect(agent.getName()).toBe('compressor');
      expect(agent.getCompressionStrategy()).toBe('summarize');
    });

    it('should create an agent with custom compression strategy', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        compressionStrategy: 'truncate',
        maxMessages: 50
      });

      expect(agent.getCompressionStrategy()).toBe('truncate');
    });
  });

  describe('setCompressionStrategy', () => {
    it('should update compression strategy', () => {
      const agent = new CompressibleAgent({
        name: 'compressor'
      });

      expect(agent.getCompressionStrategy()).toBe('summarize');
      
      agent.setCompressionStrategy('truncate');
      expect(agent.getCompressionStrategy()).toBe('truncate');
      
      agent.setCompressionStrategy('sliding_window');
      expect(agent.getCompressionStrategy()).toBe('sliding_window');
    });
  });

  describe('setMaxMessages', () => {
    it('should update max messages threshold', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        maxMessages: 100
      });

      agent.setMaxMessages(50);
      
      const stats = agent.getCompressionStats();
      expect(stats.maxMessages).toBe(50);
    });
  });

  describe('setCompressionTrigger', () => {
    it('should update compression trigger threshold', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        compressionTrigger: 50
      });

      agent.setCompressionTrigger(30);
      
      const stats = agent.getCompressionStats();
      expect(stats.compressionTrigger).toBe(30);
    });
  });

  describe('getCompressionStats', () => {
    it('should return compression statistics', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        compressionStrategy: 'truncate',
        maxMessages: 100,
        compressionTrigger: 50
      });

      const stats = agent.getCompressionStats();
      expect(stats.compressionCount).toBe(0);
      expect(stats.currentMessageCount).toBeGreaterThanOrEqual(0);
      expect(stats.strategy).toBe('truncate');
      expect(stats.maxMessages).toBe(100);
      expect(stats.compressionTrigger).toBe(50);
    });
  });

  describe('resetCompressionCount', () => {
    it('should reset compression count', () => {
      const agent = new CompressibleAgent({
        name: 'compressor'
      });

      // Simulate compression by accessing private property (for testing)
      agent['compressionCount'] = 5;
      
      agent.resetCompressionCount();
      
      const stats = agent.getCompressionStats();
      expect(stats.compressionCount).toBe(0);
    });
  });

  describe('setPreserveRecentMessages', () => {
    it('should update the number of recent messages to preserve', () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        preserveRecentMessages: 10
      });

      expect(agent.getPreserveRecentMessages()).toBe(10);
      
      agent.setPreserveRecentMessages(20);
      expect(agent.getPreserveRecentMessages()).toBe(20);
    });
  });

  describe('manual compression', () => {
    it('should allow manual compression trigger', async () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        compressionStrategy: 'truncate',
        maxMessages: 10,
        defaultAutoReply: 'Acknowledged'
      });

      // Add some messages to history
      for (let i = 0; i < 15; i++) {
        agent['conversationHistory'].push({
          role: 'user',
          content: `Message ${i}`
        });
      }

      expect(agent.getConversationHistory().length).toBe(15);

      await agent.compress();
      
      // After truncate compression, should have at most maxMessages
      expect(agent.getConversationHistory().length).toBeLessThanOrEqual(10);
      
      const stats = agent.getCompressionStats();
      expect(stats.compressionCount).toBe(1);
    });
  });

  describe('compression strategies', () => {
    describe('truncate strategy', () => {
      it('should truncate old messages', async () => {
        const agent = new CompressibleAgent({
          name: 'compressor',
          compressionStrategy: 'truncate',
          maxMessages: 5,
          preserveSystemMessage: false
        });

        // Add 10 messages
        for (let i = 0; i < 10; i++) {
          agent['conversationHistory'].push({
            role: 'user',
            content: `Message ${i}`
          });
        }

        await agent.compress();
        
        const history = agent.getConversationHistory();
        expect(history.length).toBeLessThanOrEqual(5);
        // Should keep the most recent messages
        expect(history[history.length - 1].content).toBe('Message 9');
      });
    });

    describe('sliding_window strategy', () => {
      it('should use sliding window compression', async () => {
        const agent = new CompressibleAgent({
          name: 'compressor',
          compressionStrategy: 'sliding_window',
          maxMessages: 10,
          preserveSystemMessage: false
        });

        // Add 20 messages
        for (let i = 0; i < 20; i++) {
          agent['conversationHistory'].push({
            role: 'user',
            content: `Message ${i}`
          });
        }

        await agent.compress();
        
        const history = agent.getConversationHistory();
        // Sliding window keeps 70% of maxMessages
        expect(history.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('system message preservation', () => {
    it('should preserve system message when configured', async () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        systemMessage: 'You are a helpful assistant',
        compressionStrategy: 'truncate',
        maxMessages: 5,
        preserveSystemMessage: true
      });

      // Add system message
      agent['conversationHistory'] = [
        { role: 'system', content: 'You are a helpful assistant' }
      ];

      // Add many user messages
      for (let i = 0; i < 10; i++) {
        agent['conversationHistory'].push({
          role: 'user',
          content: `Message ${i}`
        });
      }

      await agent.compress();
      
      const history = agent.getConversationHistory();
      expect(history[0].role).toBe('system');
      expect(history[0].content).toBe('You are a helpful assistant');
    });

    it('should not preserve system message when disabled', async () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        systemMessage: 'You are a helpful assistant',
        compressionStrategy: 'truncate',
        maxMessages: 5,
        preserveSystemMessage: false
      });

      // Add system message
      agent['conversationHistory'] = [
        { role: 'system', content: 'You are a helpful assistant' }
      ];

      // Add many user messages
      for (let i = 0; i < 10; i++) {
        agent['conversationHistory'].push({
          role: 'user',
          content: `Message ${i}`
        });
      }

      await agent.compress();
      
      const history = agent.getConversationHistory();
      // System message might not be preserved
      const systemMessages = history.filter(m => m.role === 'system' && m.content === 'You are a helpful assistant');
      expect(systemMessages.length).toBe(0);
    });
  });

  describe('automatic compression on generateReply', () => {
    it('should automatically compress when threshold is reached', async () => {
      const agent = new CompressibleAgent({
        name: 'compressor',
        compressionStrategy: 'truncate',
        compressionTrigger: 5,
        maxMessages: 3,
        defaultAutoReply: 'OK',
        preserveSystemMessage: false
      });

      // Add messages to reach the trigger
      for (let i = 0; i < 6; i++) {
        agent['conversationHistory'].push({
          role: 'user',
          content: `Message ${i}`
        });
      }

      const messages: IMessage[] = [
        { role: 'user', content: 'Test message' }
      ];

      await agent.generateReply(messages);
      
      // Should have triggered compression
      const stats = agent.getCompressionStats();
      expect(stats.compressionCount).toBeGreaterThan(0);
    });
  });
});
