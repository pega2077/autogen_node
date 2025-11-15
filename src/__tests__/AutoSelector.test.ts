/**
 * Tests for AutoSelector (LLM-based speaker selection)
 */

import { AutoSelector } from '../core/AutoSelector';
import { IAgent, IMessage } from '../core/IAgent';

// Mock agent that returns predictable responses
class MockAgent implements IAgent {
  constructor(
    private name: string,
    private responseOverride?: string
  ) {}

  getName(): string {
    return this.name;
  }

  async generateReply(messages: IMessage[]): Promise<IMessage> {
    const content = this.responseOverride || `Response from ${this.name}`;
    return {
      role: 'assistant',
      content,
      name: this.name
    };
  }
}

describe('AutoSelector', () => {
  let agents: IAgent[];
  let messages: IMessage[];

  beforeEach(() => {
    messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there', name: 'agent1' }
    ];
  });

  describe('Selection Logic', () => {
    it('should select agent based on LLM response', async () => {
      const selectorAgent = new MockAgent('selector', 'agent2');
      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2'),
        new MockAgent('agent3')
      ];

      const autoSelector = new AutoSelector({ selectorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('agent2');
    });

    it('should handle case-insensitive agent name matching', async () => {
      const selectorAgent = new MockAgent('selector', 'AGENT2');
      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2'),
        new MockAgent('agent3')
      ];

      const autoSelector = new AutoSelector({ selectorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('agent2');
    });

    it('should handle partial name matches', async () => {
      const selectorAgent = new MockAgent('selector', 'The best choice is agent2');
      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2'),
        new MockAgent('agent3')
      ];

      const autoSelector = new AutoSelector({ selectorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('agent2');
    });

    it('should fallback to first agent on unclear response', async () => {
      const selectorAgent = new MockAgent('selector', 'I dont know');
      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2')
      ];

      const autoSelector = new AutoSelector({ selectorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('agent1');
    });

    it('should return single agent directly when only one available', async () => {
      const selectorAgent = new MockAgent('selector', 'anything');
      agents = [new MockAgent('solo')];

      const autoSelector = new AutoSelector({ selectorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('solo');
    });

    it('should handle errors gracefully and fallback', async () => {
      const errorAgent: IAgent = {
        getName: () => 'error_agent',
        generateReply: async () => {
          throw new Error('LLM error');
        }
      };

      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2')
      ];

      const autoSelector = new AutoSelector({ selectorAgent: errorAgent });
      const selected = await autoSelector.selectSpeaker(agents, messages);
      
      expect(selected.getName()).toBe('agent1'); // Fallback
    });
  });

  describe('Configuration', () => {
    it('should use custom system prompt', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [
        new MockAgent('agent1'),
        new MockAgent('agent2')
      ];

      const customPrompt = 'Select the best agent for coding tasks.';
      const autoSelector = new AutoSelector({ 
        selectorAgent,
        systemPrompt: customPrompt
      });

      const selected = await autoSelector.selectSpeaker(agents, messages);
      expect(selected).toBeDefined();
    });

    it('should allow updating system prompt', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [new MockAgent('agent1'), new MockAgent('agent2')];

      const autoSelector = new AutoSelector({ selectorAgent });
      autoSelector.setSystemPrompt('New prompt');
      
      const selected = await autoSelector.selectSpeaker(agents, messages);
      expect(selected).toBeDefined();
    });

    it('should respect includeFullHistory setting', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [new MockAgent('agent1'), new MockAgent('agent2')];

      const manyMessages = Array.from({ length: 20 }, (_, i) => ({
        role: 'user' as const,
        content: `Message ${i}`
      }));

      const autoSelector = new AutoSelector({ 
        selectorAgent,
        includeFullHistory: true
      });

      const selected = await autoSelector.selectSpeaker(agents, manyMessages);
      expect(selected).toBeDefined();
    });

    it('should respect maxRecentMessages setting', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [new MockAgent('agent1'), new MockAgent('agent2')];

      const autoSelector = new AutoSelector({ 
        selectorAgent,
        maxRecentMessages: 5
      });

      const selected = await autoSelector.selectSpeaker(agents, messages);
      expect(selected).toBeDefined();
    });

    it('should allow updating includeFullHistory', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [new MockAgent('agent1'), new MockAgent('agent2')];

      const autoSelector = new AutoSelector({ selectorAgent });
      autoSelector.setIncludeFullHistory(true);
      
      const selected = await autoSelector.selectSpeaker(agents, messages);
      expect(selected).toBeDefined();
    });

    it('should allow updating maxRecentMessages', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      agents = [new MockAgent('agent1'), new MockAgent('agent2')];

      const autoSelector = new AutoSelector({ selectorAgent });
      autoSelector.setMaxRecentMessages(3);
      
      const selected = await autoSelector.selectSpeaker(agents, messages);
      expect(selected).toBeDefined();
    });
  });

  describe('Description', () => {
    it('should have correct description', () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      const autoSelector = new AutoSelector({ selectorAgent });
      
      const description = autoSelector.getDescription();
      expect(description).toContain('Auto');
      expect(description).toContain('LLM');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty agent list', async () => {
      const selectorAgent = new MockAgent('selector', 'agent1');
      const autoSelector = new AutoSelector({ selectorAgent });
      
      await expect(autoSelector.selectSpeaker([], messages)).rejects.toThrow(
        'No agents available for selection'
      );
    });
  });
});
