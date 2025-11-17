import { PlannerAgent, Task, TaskPlan } from '../agents/PlannerAgent';
import { IMessage } from '../core/IAgent';

// Mock LLM provider for testing
class MockLLMProvider {
  async generateReply(messages: IMessage[]): Promise<IMessage> {
    // Return a mock plan response
    return {
      role: 'assistant',
      content: `Goal: Complete the user requirement

Tasks:
1. Research the topic and gather information
2. Create a draft document
3. Review and refine the content
4. Finalize the deliverable`,
      name: 'planner'
    };
  }
}

describe('PlannerAgent', () => {
  describe('constructor', () => {
    it('should create a planner agent with default configuration', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      expect(planner.getName()).toBe('test_planner');
    });

    it('should create a planner agent with custom planning prompt', () => {
      const customPrompt = 'Break down this requirement into tasks:';
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key',
        planningPrompt: customPrompt
      });

      expect(planner.getName()).toBe('test_planner');
    });
  });

  describe('parsePlan', () => {
    it('should parse a numbered list plan', async () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      // Use reflection to access private method for testing
      const parsePlan = (planner as any).parsePlan.bind(planner);
      
      const planText = `Goal: Build a website

Tasks:
1. Design the homepage
2. Implement the backend API
3. Connect frontend to backend
4. Deploy to production`;

      const plan: TaskPlan = parsePlan(planText, 'Build a website');

      expect(plan.tasks.length).toBe(4);
      expect(plan.tasks[0].description).toContain('Design the homepage');
      expect(plan.tasks[0].status).toBe('pending');
      expect(plan.tasks[0].id).toBe(1);
    });

    it('should parse tasks with different numbering formats', async () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parsePlan = (planner as any).parsePlan.bind(planner);
      
      const planText = `1) First task
2) Second task
3) Third task`;

      const plan: TaskPlan = parsePlan(planText, 'Test requirement');

      expect(plan.tasks.length).toBe(3);
      expect(plan.tasks[1].description).toContain('Second task');
    });
  });

  describe('task management', () => {
    it('should update task status', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      // Manually create a plan for testing
      const parsePlan = (planner as any).parsePlan.bind(planner);
      const plan = parsePlan('1. Task one\n2. Task two', 'Test');
      (planner as any).currentPlan = plan;

      planner.updateTaskStatus(1, 'in_progress');
      const currentPlan = planner.getCurrentPlan();
      
      expect(currentPlan?.tasks[0].status).toBe('in_progress');
    });

    it('should assign task to agent', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parsePlan = (planner as any).parsePlan.bind(planner);
      const plan = parsePlan('1. Task one\n2. Task two', 'Test');
      (planner as any).currentPlan = plan;

      planner.assignTask(1, 'worker_agent');
      const currentPlan = planner.getCurrentPlan();
      
      expect(currentPlan?.tasks[0].assignedTo).toBe('worker_agent');
    });

    it('should check if all tasks are completed', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parsePlan = (planner as any).parsePlan.bind(planner);
      const plan = parsePlan('1. Task one\n2. Task two', 'Test');
      (planner as any).currentPlan = plan;

      expect(planner.isAllTasksCompleted()).toBe(false);

      planner.updateTaskStatus(1, 'completed');
      expect(planner.isAllTasksCompleted()).toBe(false);

      planner.updateTaskStatus(2, 'completed');
      expect(planner.isAllTasksCompleted()).toBe(true);
    });
  });

  describe('getPlanSummary', () => {
    it('should generate a formatted plan summary', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parsePlan = (planner as any).parsePlan.bind(planner);
      const plan = parsePlan('1. Task one\n2. Task two', 'Test requirement');
      (planner as any).currentPlan = plan;

      planner.updateTaskStatus(1, 'completed');
      planner.assignTask(2, 'worker');

      const summary = planner.getPlanSummary();

      expect(summary).toContain('Test requirement');
      expect(summary).toContain('✓'); // Completed task
      expect(summary).toContain('[worker]'); // Assigned agent
    });

    it('should return message when no plan exists', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const summary = planner.getPlanSummary();
      expect(summary).toContain('No plan created yet');
    });
  });

  describe('getCurrentPlan', () => {
    it('should return undefined when no plan is created', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      expect(planner.getCurrentPlan()).toBeUndefined();
    });

    it('should return the current plan after creation', () => {
      const planner = new PlannerAgent({
        name: 'test_planner',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parsePlan = (planner as any).parsePlan.bind(planner);
      const plan = parsePlan('1. Task one', 'Test');
      (planner as any).currentPlan = plan;

      const currentPlan = planner.getCurrentPlan();
      expect(currentPlan).toBeDefined();
      expect(currentPlan?.tasks.length).toBe(1);
    });
  });
});
