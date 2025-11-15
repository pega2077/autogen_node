/**
 * Tests for SwarmChat
 */

import { SwarmChat, TaskStatus } from '../core/SwarmChat';
import { RandomSelector, RoundRobinSelector } from '../core/SpeakerSelectors';
import { IAgent, IMessage } from '../core/IAgent';

// Mock agent for testing
class MockAgent implements IAgent {
  name: string;
  
  constructor(
    name: string,
    private shouldComplete: boolean = true,
    private maxRounds: number = 1
  ) {
    this.name = name;
  }

  private roundCount = 0;

  getName(): string {
    return this.name;
  }

  async generateReply(messages: IMessage[]): Promise<IMessage> {
    this.roundCount++;
    
    const content = this.shouldComplete && this.roundCount >= this.maxRounds
      ? `${this.name} completed the task. TERMINATE`
      : `${this.name} working on it (round ${this.roundCount})`;
    
    return {
      role: 'assistant',
      content,
      name: this.name
    };
  }

  reset() {
    this.roundCount = 0;
  }
}

describe('SwarmChat', () => {
  let agents: IAgent[];

  beforeEach(() => {
    agents = [
      new MockAgent('agent1'),
      new MockAgent('agent2'),
      new MockAgent('agent3')
    ];
  });

  describe('Initialization', () => {
    it('should create swarm with agents', () => {
      const swarm = new SwarmChat({ agents });
      expect(swarm.getAgents()).toHaveLength(3);
    });

    it('should throw error when no agents provided', () => {
      expect(() => new SwarmChat({ agents: [] })).toThrow(
        'SwarmChat requires at least 1 agent'
      );
    });

    it('should accept custom configuration', () => {
      const swarm = new SwarmChat({
        agents,
        maxRoundsPerTask: 3,
        maxTotalRounds: 20,
        taskAssignmentSelector: new RoundRobinSelector(),
        allowDynamicAgents: false
      });
      expect(swarm.getAgents()).toHaveLength(3);
    });
  });

  describe('Dynamic Agents', () => {
    it('should allow adding agents when enabled', () => {
      const swarm = new SwarmChat({ agents, allowDynamicAgents: true });
      const newAgent = new MockAgent('agent4');
      
      swarm.addAgent(newAgent);
      expect(swarm.getAgents()).toHaveLength(4);
    });

    it('should not add duplicate agents', () => {
      const swarm = new SwarmChat({ agents, allowDynamicAgents: true });
      
      swarm.addAgent(agents[0]);
      expect(swarm.getAgents()).toHaveLength(3);
    });

    it('should throw error when adding agents is disabled', () => {
      const swarm = new SwarmChat({ agents, allowDynamicAgents: false });
      const newAgent = new MockAgent('agent4');
      
      expect(() => swarm.addAgent(newAgent)).toThrow(
        'Dynamic agent addition is not allowed'
      );
    });

    it('should allow removing agents when enabled', () => {
      const swarm = new SwarmChat({ agents, allowDynamicAgents: true });
      
      swarm.removeAgent('agent2');
      expect(swarm.getAgents()).toHaveLength(2);
      expect(swarm.getAgents().find(a => a.getName() === 'agent2')).toBeUndefined();
    });

    it('should throw error when removing agents is disabled', () => {
      const swarm = new SwarmChat({ agents, allowDynamicAgents: false });
      
      expect(() => swarm.removeAgent('agent2')).toThrow(
        'Dynamic agent removal is not allowed'
      );
    });
  });

  describe('Task Management', () => {
    it('should create tasks', () => {
      const swarm = new SwarmChat({ agents });
      const task = swarm.createTask('Test task');
      
      expect(task).toBeDefined();
      expect(task.description).toBe('Test task');
      expect(task.status).toBe(TaskStatus.PENDING);
      expect(task.id).toContain('task_');
    });

    it('should track multiple tasks', () => {
      const swarm = new SwarmChat({ agents });
      
      swarm.createTask('Task 1');
      swarm.createTask('Task 2');
      swarm.createTask('Task 3');
      
      expect(swarm.getTasks()).toHaveLength(3);
    });
  });

  describe('Task Execution', () => {
    it('should execute single task', async () => {
      const swarm = new SwarmChat({ agents });
      const result = await swarm.runSingleTask('Complete this task');
      
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.assignedAgent).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should execute multiple tasks', async () => {
      const swarm = new SwarmChat({ agents });
      const taskDescriptions = [
        'Task 1',
        'Task 2',
        'Task 3'
      ];
      
      const result = await swarm.run(taskDescriptions);
      
      expect(result.tasks).toHaveLength(3);
      expect(result.completedTasks.length).toBeGreaterThan(0);
    });

    it('should assign tasks to agents', async () => {
      const swarm = new SwarmChat({
        agents,
        taskAssignmentSelector: new RoundRobinSelector()
      });
      
      const result = await swarm.run(['Task 1', 'Task 2', 'Task 3']);
      
      result.tasks.forEach(task => {
        expect(task.assignedAgent).toBeDefined();
      });
    });

    it('should allow assigning specific agent to task', async () => {
      const swarm = new SwarmChat({ agents });
      const specificAgent = agents[1]; // agent2
      
      const result = await swarm.runSingleTask('Specific task', specificAgent);
      
      expect(result.assignedAgent?.getName()).toBe('agent2');
    });

    it('should detect task completion', async () => {
      const agents = [new MockAgent('completer', true, 1)];
      const swarm = new SwarmChat({ agents });
      
      const result = await swarm.runSingleTask('Complete quickly');
      
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.result).toBeDefined();
    });

    it('should handle max rounds per task', async () => {
      const agents = [new MockAgent('worker', false, 10)]; // Never completes
      const swarm = new SwarmChat({ agents, maxRoundsPerTask: 3 });
      
      const result = await swarm.runSingleTask('Long task');
      
      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.messages.length).toBeLessThanOrEqual(3 * 2 + 1); // rounds * 2 + initial
    });

    it('should handle max total rounds', async () => {
      const agents = [new MockAgent('worker', false, 10)];
      const swarm = new SwarmChat({ 
        agents, 
        maxRoundsPerTask: 5,
        maxTotalRounds: 10
      });
      
      const result = await swarm.run(['Task 1', 'Task 2', 'Task 3', 'Task 4']);
      
      expect(result.totalRounds).toBeLessThanOrEqual(10);
      expect(result.failedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle agent errors gracefully', async () => {
      const errorAgent: IAgent = {
        name: 'error_agent',
        getName: () => 'error_agent',
        generateReply: async () => {
          throw new Error('Agent failed');
        }
      };
      
      const swarm = new SwarmChat({ agents: [errorAgent] });
      const result = await swarm.runSingleTask('Failing task');
      
      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error).toContain('Agent failed');
    });
  });

  describe('Results', () => {
    it('should provide comprehensive results', async () => {
      const swarm = new SwarmChat({ agents });
      const result = await swarm.run(['Task 1', 'Task 2']);
      
      expect(result.tasks).toBeDefined();
      expect(result.totalRounds).toBeGreaterThan(0);
      expect(result.allMessages.length).toBeGreaterThan(0);
      expect(result.completedTasks).toBeDefined();
      expect(result.failedTasks).toBeDefined();
    });

    it('should separate completed and failed tasks', async () => {
      const goodAgent = new MockAgent('good', true, 1);
      const errorAgent: IAgent = {
        name: 'bad',
        getName: () => 'bad',
        generateReply: async () => {
          throw new Error('Failed');
        }
      };
      
      const swarm = new SwarmChat({ 
        agents: [goodAgent, errorAgent],
        taskAssignmentSelector: new RoundRobinSelector()
      });
      
      const result = await swarm.run(['Task 1', 'Task 2']);
      
      expect(result.completedTasks.length).toBeGreaterThan(0);
      expect(result.failedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should clear all tasks on reset', async () => {
      const swarm = new SwarmChat({ agents });
      
      await swarm.run(['Task 1', 'Task 2']);
      expect(swarm.getTasks().length).toBeGreaterThan(0);
      
      swarm.reset();
      expect(swarm.getTasks()).toHaveLength(0);
    });
  });

  describe('Task Assignment Strategies', () => {
    it('should use random selector', async () => {
      const swarm = new SwarmChat({
        agents,
        taskAssignmentSelector: new RandomSelector()
      });
      
      const result = await swarm.run(['Task 1', 'Task 2', 'Task 3']);
      
      // With random selection, we might get different agents
      const assignedAgents = new Set(
        result.tasks.map(t => t.assignedAgent?.getName())
      );
      expect(assignedAgents.size).toBeGreaterThan(0);
    });

    it('should use round-robin selector', async () => {
      const swarm = new SwarmChat({
        agents,
        taskAssignmentSelector: new RoundRobinSelector()
      });
      
      const result = await swarm.run(['Task 1', 'Task 2', 'Task 3']);
      
      // With round-robin, should cycle through agents
      expect(result.tasks[0].assignedAgent?.getName()).toBe('agent1');
      expect(result.tasks[1].assignedAgent?.getName()).toBe('agent2');
      expect(result.tasks[2].assignedAgent?.getName()).toBe('agent3');
    });
  });
});
