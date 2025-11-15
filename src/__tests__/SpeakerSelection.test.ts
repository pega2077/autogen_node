/**
 * Tests for speaker selection strategies
 */

import {
  RoundRobinSelector,
  RandomSelector,
  ManualSelector,
  ConstrainedSelector
} from '../core/SpeakerSelectors';
import { IAgent, IMessage } from '../core/IAgent';

// Mock agent class for testing
class MockAgent implements IAgent {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  async generateReply(messages: IMessage[]): Promise<IMessage> {
    return {
      role: 'assistant',
      content: `Mock response from ${this.name}`,
      name: this.name
    };
  }
}

describe('Speaker Selection Strategies', () => {
  let agents: IAgent[];
  let messages: IMessage[];

  beforeEach(() => {
    agents = [
      new MockAgent('agent1'),
      new MockAgent('agent2'),
      new MockAgent('agent3')
    ];
    messages = [
      { role: 'user', content: 'Hello' }
    ];
  });

  describe('RoundRobinSelector', () => {
    it('should select first agent when no last speaker', async () => {
      const selector = new RoundRobinSelector();
      const selected = await selector.selectSpeaker(agents, messages);
      expect(selected.getName()).toBe('agent1');
    });

    it('should cycle through agents in order', async () => {
      const selector = new RoundRobinSelector();
      
      let lastSpeaker = agents[0];
      let selected = await selector.selectSpeaker(agents, messages, lastSpeaker);
      expect(selected.getName()).toBe('agent2');

      lastSpeaker = selected;
      selected = await selector.selectSpeaker(agents, messages, lastSpeaker);
      expect(selected.getName()).toBe('agent3');

      lastSpeaker = selected;
      selected = await selector.selectSpeaker(agents, messages, lastSpeaker);
      expect(selected.getName()).toBe('agent1'); // Wraps around
    });

    it('should throw error when no agents available', async () => {
      const selector = new RoundRobinSelector();
      await expect(selector.selectSpeaker([], messages)).rejects.toThrow(
        'No agents available for selection'
      );
    });

    it('should have correct description', () => {
      const selector = new RoundRobinSelector();
      expect(selector.getDescription()).toContain('Round-robin');
    });
  });

  describe('RandomSelector', () => {
    it('should select an agent from available agents', async () => {
      const selector = new RandomSelector();
      const selected = await selector.selectSpeaker(agents, messages);
      expect(agents.map(a => a.getName())).toContain(selected.getName());
    });

    it('should avoid selecting the same agent consecutively when possible', async () => {
      const selector = new RandomSelector();
      const lastSpeaker = agents[0];
      
      // Run multiple times to check randomness
      const selections = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const selected = await selector.selectSpeaker(agents, messages, lastSpeaker);
        selections.add(selected.getName());
      }
      
      // Should have selected at least one other agent
      expect(selections.size).toBeGreaterThan(1);
    });

    it('should allow same agent when only one available', async () => {
      const selector = new RandomSelector();
      const singleAgent = [new MockAgent('solo')];
      const selected = await selector.selectSpeaker(singleAgent, messages);
      expect(selected.getName()).toBe('solo');
    });

    it('should throw error when no agents available', async () => {
      const selector = new RandomSelector();
      await expect(selector.selectSpeaker([], messages)).rejects.toThrow(
        'No agents available for selection'
      );
    });

    it('should have correct description', () => {
      const selector = new RandomSelector();
      expect(selector.getDescription()).toContain('Random');
    });
  });

  describe('ManualSelector', () => {
    it('should select agent by name when set', async () => {
      const selector = new ManualSelector();
      selector.setNextSpeaker('agent2');
      
      const selected = await selector.selectSpeaker(agents, messages);
      expect(selected.getName()).toBe('agent2');
    });

    it('should default to first agent when no speaker set', async () => {
      const selector = new ManualSelector();
      const selected = await selector.selectSpeaker(agents, messages);
      expect(selected.getName()).toBe('agent1');
    });

    it('should clear selection after use', async () => {
      const selector = new ManualSelector();
      selector.setNextSpeaker('agent3');
      
      await selector.selectSpeaker(agents, messages);
      
      // Second call should default to first agent
      const secondSelected = await selector.selectSpeaker(agents, messages);
      expect(secondSelected.getName()).toBe('agent1');
    });

    it('should throw error when selected agent not found', async () => {
      const selector = new ManualSelector();
      selector.setNextSpeaker('nonexistent');
      
      await expect(selector.selectSpeaker(agents, messages)).rejects.toThrow(
        "Agent 'nonexistent' not found"
      );
    });

    it('should throw error when no agents available', async () => {
      const selector = new ManualSelector();
      await expect(selector.selectSpeaker([], messages)).rejects.toThrow(
        'No agents available for selection'
      );
    });

    it('should have correct description', () => {
      const selector = new ManualSelector();
      expect(selector.getDescription()).toContain('Manual');
    });
  });

  describe('ConstrainedSelector', () => {
    it('should only select from allowed agents', async () => {
      const selector = new ConstrainedSelector(['agent1', 'agent3']);
      
      // Run multiple times to check constraint
      for (let i = 0; i < 5; i++) {
        const selected = await selector.selectSpeaker(agents, messages);
        expect(['agent1', 'agent3']).toContain(selected.getName());
        expect(selected.getName()).not.toBe('agent2');
      }
    });

    it('should use fallback selector for selection from allowed agents', async () => {
      const fallback = new RoundRobinSelector();
      const selector = new ConstrainedSelector(['agent1', 'agent2'], fallback);
      
      const allowedAgents = agents.filter(a => 
        ['agent1', 'agent2'].includes(a.getName())
      );
      
      let lastSpeaker = allowedAgents[0];
      const selected = await selector.selectSpeaker(agents, messages, lastSpeaker);
      expect(selected.getName()).toBe('agent2'); // Round-robin from allowed
    });

    it('should allow updating allowed speakers', async () => {
      const selector = new ConstrainedSelector(['agent1']);
      
      let selected = await selector.selectSpeaker(agents, messages);
      expect(selected.getName()).toBe('agent1');
      
      selector.setAllowedSpeakers(['agent2', 'agent3']);
      selected = await selector.selectSpeaker(agents, messages);
      expect(['agent2', 'agent3']).toContain(selected.getName());
    });

    it('should support adding and removing allowed speakers', async () => {
      const selector = new ConstrainedSelector(['agent1']);
      
      selector.addAllowedSpeaker('agent2');
      let selected = await selector.selectSpeaker(agents, messages);
      expect(['agent1', 'agent2']).toContain(selected.getName());
      
      selector.removeAllowedSpeaker('agent1');
      selected = await selector.selectSpeaker(agents, messages);
      expect(selected.getName()).toBe('agent2');
    });

    it('should throw error when no allowed agents found', async () => {
      const selector = new ConstrainedSelector(['nonexistent']);
      
      await expect(selector.selectSpeaker(agents, messages)).rejects.toThrow(
        'No allowed agents found'
      );
    });

    it('should throw error when no agents available', async () => {
      const selector = new ConstrainedSelector(['agent1']);
      await expect(selector.selectSpeaker([], messages)).rejects.toThrow(
        'No agents available for selection'
      );
    });

    it('should have correct description', () => {
      const selector = new ConstrainedSelector(['agent1', 'agent2']);
      const description = selector.getDescription();
      expect(description).toContain('Constrained');
      expect(description).toContain('agent1');
      expect(description).toContain('agent2');
    });
  });
});
