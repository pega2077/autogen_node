import { SocietyOfMindAgent, InnerAgentConfig } from '../agents/SocietyOfMindAgent';
import { IMessage, IAgent } from '../core/IAgent';

// Mock agent for testing
class MockInnerAgent implements IAgent {
  private mockResponse: string;

  constructor(private agentName: string, mockResponse: string = 'Mock response') {
    this.mockResponse = mockResponse;
  }

  getName(): string {
    return this.agentName;
  }

  async generateReply(messages: IMessage[], cancellationToken?: AbortSignal): Promise<IMessage> {
    return {
      role: 'assistant',
      content: this.mockResponse,
      name: this.agentName
    };
  }

  setMockResponse(response: string): void {
    this.mockResponse = response;
  }
}

describe('SocietyOfMindAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default configuration', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        systemMessage: 'You are a society of mind agent'
      });

      expect(agent.getName()).toBe('society');
      expect(agent.getOrchestrationStrategy()).toBe('sequential');
    });

    it('should create an agent with custom orchestration strategy', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        orchestrationStrategy: 'parallel'
      });

      expect(agent.getOrchestrationStrategy()).toBe('parallel');
    });

    it('should initialize with inner agents', () => {
      const innerAgent1 = new MockInnerAgent('agent1', 'Response 1');
      const innerAgent2 = new MockInnerAgent('agent2', 'Response 2');

      const agent = new SocietyOfMindAgent({
        name: 'society',
        innerAgents: [
          { agent: innerAgent1, role: 'Analyst', priority: 1 },
          { agent: innerAgent2, role: 'Critic', priority: 2 }
        ]
      });

      const innerAgents = agent.getInnerAgents();
      expect(innerAgents).toHaveLength(2);
      // Should be sorted by priority (highest first)
      expect(innerAgents[0].agent.getName()).toBe('agent2');
      expect(innerAgents[1].agent.getName()).toBe('agent1');
    });
  });

  describe('addInnerAgent and removeInnerAgent', () => {
    it('should add inner agents', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society'
      });

      const innerAgent = new MockInnerAgent('analyst', 'Analysis result');
      
      agent.addInnerAgent({
        agent: innerAgent,
        role: 'Analyst',
        expertise: 'Data analysis'
      });

      const innerAgents = agent.getInnerAgents();
      expect(innerAgents).toHaveLength(1);
      expect(innerAgents[0].role).toBe('Analyst');
    });

    it('should remove inner agents', () => {
      const innerAgent1 = new MockInnerAgent('agent1', 'Response 1');
      const innerAgent2 = new MockInnerAgent('agent2', 'Response 2');

      const agent = new SocietyOfMindAgent({
        name: 'society',
        innerAgents: [
          { agent: innerAgent1, role: 'Analyst' },
          { agent: innerAgent2, role: 'Critic' }
        ]
      });

      expect(agent.getInnerAgents()).toHaveLength(2);
      
      agent.removeInnerAgent('agent1');
      
      expect(agent.getInnerAgents()).toHaveLength(1);
      expect(agent.getInnerAgents()[0].agent.getName()).toBe('agent2');
    });

    it('should sort agents by priority when adding', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society'
      });

      const agent1 = new MockInnerAgent('low-priority', 'Response');
      const agent2 = new MockInnerAgent('high-priority', 'Response');
      const agent3 = new MockInnerAgent('medium-priority', 'Response');

      agent.addInnerAgent({ agent: agent1, role: 'Low', priority: 1 });
      agent.addInnerAgent({ agent: agent2, role: 'High', priority: 10 });
      agent.addInnerAgent({ agent: agent3, role: 'Medium', priority: 5 });

      const innerAgents = agent.getInnerAgents();
      expect(innerAgents[0].agent.getName()).toBe('high-priority');
      expect(innerAgents[1].agent.getName()).toBe('medium-priority');
      expect(innerAgents[2].agent.getName()).toBe('low-priority');
    });
  });

  describe('getInnerAgents', () => {
    it('should return all inner agents', () => {
      const innerAgent1 = new MockInnerAgent('agent1', 'Response 1');
      const innerAgent2 = new MockInnerAgent('agent2', 'Response 2');

      const agent = new SocietyOfMindAgent({
        name: 'society',
        innerAgents: [
          { agent: innerAgent1, role: 'Analyst' },
          { agent: innerAgent2, role: 'Critic' }
        ]
      });

      const innerAgents = agent.getInnerAgents();
      expect(innerAgents).toHaveLength(2);
    });
  });

  describe('orchestration strategies', () => {
    describe('sequential strategy', () => {
      it('should process agents sequentially', async () => {
        const agent1 = new MockInnerAgent('analyst', 'Initial analysis');
        const agent2 = new MockInnerAgent('critic', 'Critical review');

        const agent = new SocietyOfMindAgent({
          name: 'society',
          orchestrationStrategy: 'sequential',
          innerAgents: [
            { agent: agent1, role: 'Analyst' },
            { agent: agent2, role: 'Critic' }
          ],
          defaultAutoReply: 'Final answer'
        });

        const messages: IMessage[] = [
          { role: 'user', content: 'Analyze this problem' }
        ];

        const reply = await agent.generateReply(messages);
        expect(reply).toBeDefined();
        expect(reply.name).toBe('society');
      });
    });

    describe('parallel strategy', () => {
      it('should process agents in parallel', async () => {
        const agent1 = new MockInnerAgent('analyst', 'Analysis perspective');
        const agent2 = new MockInnerAgent('designer', 'Design perspective');

        const agent = new SocietyOfMindAgent({
          name: 'society',
          orchestrationStrategy: 'parallel',
          innerAgents: [
            { agent: agent1, role: 'Analyst' },
            { agent: agent2, role: 'Designer' }
          ],
          defaultAutoReply: 'Combined answer'
        });

        const messages: IMessage[] = [
          { role: 'user', content: 'Design a solution' }
        ];

        const reply = await agent.generateReply(messages);
        expect(reply).toBeDefined();
        expect(reply.name).toBe('society');
      });
    });
  });

  describe('setOrchestrationStrategy', () => {
    it('should update orchestration strategy', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        orchestrationStrategy: 'sequential'
      });

      expect(agent.getOrchestrationStrategy()).toBe('sequential');
      
      agent.setOrchestrationStrategy('parallel');
      expect(agent.getOrchestrationStrategy()).toBe('parallel');
      
      agent.setOrchestrationStrategy('debate');
      expect(agent.getOrchestrationStrategy()).toBe('debate');
    });
  });

  describe('setMaxInnerRounds and getMaxInnerRounds', () => {
    it('should set and get max inner rounds', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        maxInnerRounds: 5
      });

      expect(agent.getMaxInnerRounds()).toBe(5);
      
      agent.setMaxInnerRounds(10);
      expect(agent.getMaxInnerRounds()).toBe(10);
    });
  });

  describe('debate mode', () => {
    it('should enable and disable debate mode', () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        enableDebate: true
      });

      expect(agent.isDebateEnabled()).toBe(true);
      
      agent.setEnableDebate(false);
      expect(agent.isDebateEnabled()).toBe(false);
    });
  });

  describe('getSocietyStats', () => {
    it('should return society statistics', () => {
      const agent1 = new MockInnerAgent('agent1', 'Response 1');
      const agent2 = new MockInnerAgent('agent2', 'Response 2');
      const agent3 = new MockInnerAgent('agent3', 'Response 3');

      const agent = new SocietyOfMindAgent({
        name: 'society',
        orchestrationStrategy: 'parallel',
        maxInnerRounds: 7,
        innerAgents: [
          { agent: agent1, role: 'Analyst' },
          { agent: agent2, role: 'Critic' },
          { agent: agent3, role: 'Designer' }
        ]
      });

      const stats = agent.getSocietyStats();
      expect(stats.innerAgentCount).toBe(3);
      expect(stats.orchestrationStrategy).toBe('parallel');
      expect(stats.maxInnerRounds).toBe(7);
      expect(stats.agentRoles).toContain('Analyst');
      expect(stats.agentRoles).toContain('Critic');
      expect(stats.agentRoles).toContain('Designer');
    });
  });

  describe('fallback to parent when no inner agents', () => {
    it('should use parent generateReply when no inner agents', async () => {
      const agent = new SocietyOfMindAgent({
        name: 'society',
        defaultAutoReply: 'Direct reply'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Direct reply');
    });
  });

  describe('complex orchestration', () => {
    it('should handle multiple inner agents with different expertise', async () => {
      const analyst = new MockInnerAgent('analyst', 'Data shows positive trend');
      const critic = new MockInnerAgent('critic', 'Consider edge cases');
      const designer = new MockInnerAgent('designer', 'UI should be simple');

      const agent = new SocietyOfMindAgent({
        name: 'society',
        orchestrationStrategy: 'sequential',
        innerAgents: [
          { agent: analyst, role: 'Data Analyst', expertise: 'Statistics', priority: 3 },
          { agent: critic, role: 'Critical Thinker', expertise: 'Logic', priority: 2 },
          { agent: designer, role: 'UX Designer', expertise: 'Design', priority: 1 }
        ],
        defaultAutoReply: 'Synthesized response'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Design a new feature' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply).toBeDefined();
      expect(reply.role).toBe('assistant');
    });
  });
});
