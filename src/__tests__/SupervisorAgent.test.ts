import { SupervisorAgent, VerificationResult } from '../agents/SupervisorAgent';
import { TaskPlan } from '../agents/PlannerAgent';
import { IMessage } from '../core/IAgent';

describe('SupervisorAgent', () => {
  describe('constructor', () => {
    it('should create a supervisor agent with default configuration', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      expect(supervisor.getName()).toBe('test_supervisor');
      expect(supervisor.getCurrentIteration()).toBe(0);
    });

    it('should create a supervisor agent with custom max iterations', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key',
        maxIterations: 10
      });

      expect(supervisor.getName()).toBe('test_supervisor');
    });
  });

  describe('parseVerification', () => {
    it('should parse verification with COMPLETE: YES', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `COMPLETE: YES
FEEDBACK: All tasks have been completed successfully.
MISSING: None
SUGGESTIONS: Consider adding documentation.`;

      const result: VerificationResult = parseVerification(verificationText);

      expect(result.isComplete).toBe(true);
      expect(result.feedback).toContain('successfully');
    });

    it('should parse verification with COMPLETE: NO', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `COMPLETE: NO
FEEDBACK: Some tasks are incomplete.
MISSING: 
- Task 3 needs more detail
- Task 5 is not started
SUGGESTIONS: 
- Allocate more time to research
- Consider additional resources`;

      const result: VerificationResult = parseVerification(verificationText);

      expect(result.isComplete).toBe(false);
      expect(result.feedback).toContain('incomplete');
      expect(result.missingTasks.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle verification without structured format', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `The work is complete and meets all requirements. Good job!`;

      const result: VerificationResult = parseVerification(verificationText);

      expect(result.isComplete).toBe(true);
      expect(result.feedback).toContain('complete');
    });

    it('should detect incomplete status from keywords', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `The work is incomplete. Several tasks are missing.`;

      const result: VerificationResult = parseVerification(verificationText);

      expect(result.isComplete).toBe(false);
    });
  });

  describe('iteration management', () => {
    it('should track iteration count', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key',
        maxIterations: 3
      });

      expect(supervisor.getCurrentIteration()).toBe(0);
      expect(supervisor.hasReachedMaxIterations()).toBe(false);

      // Simulate verification calls by incrementing iteration
      (supervisor as any).currentIteration = 1;
      expect(supervisor.getCurrentIteration()).toBe(1);

      (supervisor as any).currentIteration = 3;
      expect(supervisor.hasReachedMaxIterations()).toBe(true);
    });

    it('should reset iteration counter', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      (supervisor as any).currentIteration = 5;
      expect(supervisor.getCurrentIteration()).toBe(5);

      supervisor.resetIterations();
      expect(supervisor.getCurrentIteration()).toBe(0);
    });
  });

  describe('generateFeedbackSummary', () => {
    it('should generate a formatted summary for complete verification', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const verification: VerificationResult = {
        isComplete: true,
        feedback: 'All requirements met',
        missingTasks: [],
        suggestions: ['Add unit tests']
      };

      const summary = supervisor.generateFeedbackSummary(verification);

      expect(summary).toContain('✓ COMPLETE');
      expect(summary).toContain('All requirements met');
      expect(summary).toContain('Add unit tests');
    });

    it('should generate a formatted summary for incomplete verification', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const verification: VerificationResult = {
        isComplete: false,
        feedback: 'Some work remaining',
        missingTasks: ['Complete task 3', 'Review task 5'],
        suggestions: ['Focus on task 3 first']
      };

      const summary = supervisor.generateFeedbackSummary(verification);

      expect(summary).toContain('✗ INCOMPLETE');
      expect(summary).toContain('Some work remaining');
      expect(summary).toContain('Complete task 3');
      expect(summary).toContain('Review task 5');
      expect(summary).toContain('Focus on task 3 first');
    });

    it('should handle verification with no missing tasks or suggestions', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const verification: VerificationResult = {
        isComplete: true,
        feedback: 'Perfect work',
        missingTasks: [],
        suggestions: []
      };

      const summary = supervisor.generateFeedbackSummary(verification);

      expect(summary).toContain('✓ COMPLETE');
      expect(summary).toContain('Perfect work');
      // Should not have missing tasks or suggestions sections
    });
  });

  describe('integration scenarios', () => {
    it('should correctly identify complete work', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `COMPLETE: YES
FEEDBACK: The guide is comprehensive and well-structured. It covers all the required topics including what Node.js is, setup instructions, and a hello world example.
MISSING: None
SUGGESTIONS: None`;

      const result = parseVerification(verificationText);

      expect(result.isComplete).toBe(true);
      expect(result.missingTasks.length).toBe(0);
    });

    it('should correctly identify incomplete work with specific missing items', () => {
      const supervisor = new SupervisorAgent({
        name: 'test_supervisor',
        provider: 'openai',
        apiKey: 'test-key'
      });

      const parseVerification = (supervisor as any).parseVerification.bind(supervisor);
      
      const verificationText = `COMPLETE: NO
FEEDBACK: The guide is missing the setup instructions section.
MISSING: 
- Basic setup instructions for Node.js installation
- Configuration steps for beginners
SUGGESTIONS: 
- Add step-by-step installation guide
- Include screenshots for clarity`;

      const result = parseVerification(verificationText);

      expect(result.isComplete).toBe(false);
      expect(result.missingTasks.length).toBe(2);
      expect(result.suggestions.length).toBe(2);
      expect(result.missingTasks[0]).toContain('setup instructions');
    });
  });
});
