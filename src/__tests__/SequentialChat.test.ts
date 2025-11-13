import { BaseAgent } from '../core/BaseAgent';
import { IMessage } from '../core/IAgent';
import {
  runSequentialChat,
  summarizeSequentialChat,
  SequentialChatStep
} from '../core/SequentialChat';

// Mock agent for testing
class MockAgent extends BaseAgent {
  private responses: string[];
  private responseIndex: number = 0;

  constructor(name: string, responses: string[]) {
    super({ name, systemMessage: `I am ${name}` });
    this.responses = responses;
  }

  async generateReply(messages: IMessage[]): Promise<IMessage> {
    const response = this.responses[this.responseIndex % this.responses.length];
    this.responseIndex++;

    const reply: IMessage = {
      role: 'assistant',
      content: response,
      name: this.name
    };

    this.addToHistory(reply);
    return reply;
  }
}

describe('Sequential Chat', () => {
  it('should execute agents in sequential order', async () => {
    const agent1 = new MockAgent('agent1', ['Response from agent1']);
    const agent2 = new MockAgent('agent2', ['Response from agent2']);
    const agent3 = new MockAgent('agent3', ['Response from agent3']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { agent: agent2 },
      { agent: agent3 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start the sequence'
    });

    expect(result.totalSteps).toBe(3);
    expect(result.stepResults.length).toBe(3);
    expect(result.stepResults[0].agentName).toBe('agent1');
    expect(result.stepResults[1].agentName).toBe('agent2');
    expect(result.stepResults[2].agentName).toBe('agent3');
  });

  it('should pass output from one step to the next', async () => {
    const agent1 = new MockAgent('agent1', ['Data processed by agent1']);
    const agent2 = new MockAgent('agent2', ['Data processed by agent2']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { agent: agent2 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Initial data'
    });

    // The second step should receive the output from the first step
    const step2Messages = result.stepResults[1].messages;
    expect(step2Messages[0].content).toBe('Data processed by agent1');
  });

  it('should allow custom messages for specific steps', async () => {
    const agent1 = new MockAgent('agent1', ['Response 1']);
    const agent2 = new MockAgent('agent2', ['Response 2']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { 
        agent: agent2, 
        message: 'Custom message for agent2'  // Override default flow
      }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start'
    });

    // Agent2 should receive the custom message, not agent1's output
    const step2Messages = result.stepResults[1].messages;
    expect(step2Messages[0].content).toBe('Custom message for agent2');
  });

  it('should support multi-round steps', async () => {
    const agent = new MockAgent('worker', [
      'Working on task',
      'Still working',
      'Done'
    ]);

    const steps: SequentialChatStep[] = [
      { agent, maxRounds: 3 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Do work'
    });

    expect(result.stepResults[0].rounds).toBe(3);
    expect(result.stepResults[0].messages.length).toBeGreaterThan(1);
  });

  it('should terminate step early if termination message received', async () => {
    const agent = new MockAgent('agent', [
      'Working',
      'TERMINATE'
    ]);

    const steps: SequentialChatStep[] = [
      { agent, maxRounds: 10 }  // Set high max rounds
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start'
    });

    // Should terminate after 2 rounds, not 10
    expect(result.stepResults[0].rounds).toBeLessThan(10);
    expect(result.stepResults[0].finalMessage.content).toBe('TERMINATE');
  });

  it('should collect all messages when collectResults is true', async () => {
    const agent1 = new MockAgent('agent1', ['Response 1']);
    const agent2 = new MockAgent('agent2', ['Response 2']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { agent: agent2 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start',
      collectResults: true
    });

    // Should have: initial message + step1 (input + output) + step2 (input + output)
    expect(result.allMessages.length).toBeGreaterThan(0);
  });

  it('should handle empty steps list', async () => {
    await expect(
      runSequentialChat({
        steps: [],
        initialMessage: 'Start'
      })
    ).rejects.toThrow('Sequential chat requires at least one step');
  });

  it('should return correct final message', async () => {
    const agent1 = new MockAgent('agent1', ['First']);
    const agent2 = new MockAgent('agent2', ['Second']);
    const agent3 = new MockAgent('agent3', ['Final result']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { agent: agent2 },
      { agent: agent3 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start'
    });

    expect(result.finalMessage.content).toBe('Final result');
  });

  it('should generate summary of sequential chat', async () => {
    const agent1 = new MockAgent('agent1', ['Response from step 1']);
    const agent2 = new MockAgent('agent2', ['Response from step 2']);

    const steps: SequentialChatStep[] = [
      { agent: agent1 },
      { agent: agent2 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start'
    });

    const summary = summarizeSequentialChat(result);

    expect(summary).toContain('Sequential Chat Summary');
    expect(summary).toContain('Total Steps: 2');
    expect(summary).toContain('agent1');
    expect(summary).toContain('agent2');
  });

  it('should handle workflow with different maxRounds per step', async () => {
    const planner = new MockAgent('planner', ['Plan created']);
    const worker = new MockAgent('worker', ['Work in progress', 'Work complete']);
    const reviewer = new MockAgent('reviewer', ['Review complete']);

    const steps: SequentialChatStep[] = [
      { agent: planner, maxRounds: 1 },
      { agent: worker, maxRounds: 2 },
      { agent: reviewer, maxRounds: 1 }
    ];

    const result = await runSequentialChat({
      steps,
      initialMessage: 'Start project'
    });

    expect(result.stepResults[0].rounds).toBe(1);
    expect(result.stepResults[1].rounds).toBe(2);
    expect(result.stepResults[2].rounds).toBe(1);
    expect(result.totalSteps).toBe(3);
  });

  it('should support message objects as initial message', async () => {
    const agent = new MockAgent('agent', ['Response']);

    const initialMsg: IMessage = {
      role: 'user',
      content: 'Custom initial message',
      name: 'custom_user'
    };

    const result = await runSequentialChat({
      steps: [{ agent }],
      initialMessage: initialMsg
    });

    expect(result.allMessages[0]).toMatchObject({
      role: 'user',
      content: 'Custom initial message'
    });
  });
});
