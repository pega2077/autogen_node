import { BaseAgent } from '../core/BaseAgent';
import { IMessage } from '../core/IAgent';
import { supportsNestedChat } from '../core/INestedChat';

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

describe('Nested Chat', () => {
  it('should support nested conversations', async () => {
    const manager = new MockAgent('manager', [
      'Let me delegate this task',
      'Thank you for the results'
    ]);
    
    const specialist = new MockAgent('specialist', [
      'I will work on the task',
      'Task completed',
      'TERMINATE'
    ]);

    // Manager initiates a nested chat with specialist
    const result = await manager.initiateNestedChat(
      'Please analyze this data',
      specialist,
      { maxRounds: 5 }
    );

    expect(result).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
    expect(result.finalMessage).toBeDefined();
    expect(result.terminated).toBe(true);
    expect(result.rounds).toBeGreaterThan(0);
  });

  it('should respect maxRounds limit', async () => {
    const agent1 = new MockAgent('agent1', ['Response 1', 'Response 2']);
    const agent2 = new MockAgent('agent2', ['Response A', 'Response B']);

    const result = await agent1.initiateNestedChat(
      'Start conversation',
      agent2,
      { maxRounds: 2 }
    );

    // Should stop at maxRounds even without termination
    expect(result.rounds).toBeLessThanOrEqual(2);
  });

  it('should add nested chat to parent history when requested', async () => {
    const parent = new MockAgent('parent', ['Delegating task']);
    const child = new MockAgent('child', ['Working on it', 'TERMINATE']);

    const initialHistoryLength = parent.getConversationHistory().length;

    await parent.initiateNestedChat(
      'Do this task',
      child,
      { addToParentHistory: true }
    );

    const newHistoryLength = parent.getConversationHistory().length;
    
    // History should include:
    // 1. The agent's own responses during nested chat (from generateReply calls)
    // 2. The summary message (from addToParentHistory: true)
    // So it should have increased by at least 1 (the summary)
    expect(newHistoryLength).toBeGreaterThan(initialHistoryLength);
    
    // Check that the summary was added
    const history = parent.getConversationHistory();
    const lastMessage = history[history.length - 1];
    expect(lastMessage.content).toContain('Nested conversation');
  });

  it('should not add summary to parent history by default', async () => {
    const parent = new MockAgent('parent', ['Delegating task']);
    const child = new MockAgent('child', ['Working on it', 'TERMINATE']);

    const initialHistoryLength = parent.getConversationHistory().length;

    await parent.initiateNestedChat(
      'Do this task',
      child
      // addToParentHistory defaults to false
    );

    const newHistoryLength = parent.getConversationHistory().length;
    const history = parent.getConversationHistory();
    
    // History may have changed due to generateReply calls, but should NOT contain summary
    const hasSummary = history.some(msg => msg.content.includes('Nested conversation'));
    expect(hasSummary).toBe(false);
  });

  it('should detect custom termination messages', async () => {
    const agent1 = new MockAgent('agent1', ['Working']);
    const agent2 = new MockAgent('agent2', ['DONE']);

    const result = await agent1.initiateNestedChat(
      'Start work',
      agent2,
      { 
        maxRounds: 10,
        terminationMessage: 'DONE' 
      }
    );

    expect(result.terminated).toBe(true);
    expect(result.finalMessage.content).toBe('DONE');
  });

  it('should support checking for nested chat capability', () => {
    const agent = new MockAgent('test', ['response']);
    
    expect(supportsNestedChat(agent)).toBe(true);
  });

  it('should maintain separate conversation contexts', async () => {
    const manager = new MockAgent('manager', [
      'Main conversation message',
      'Another main message'
    ]);
    
    const specialist = new MockAgent('specialist', [
      'Nested message 1',
      'TERMINATE'
    ]);

    // Main conversation
    await manager.generateReply([
      { role: 'user', content: 'Hello manager' }
    ]);
    
    const mainHistoryBefore = manager.getConversationHistory().length;

    // Nested conversation (without adding summary to parent history)
    const nestedResult = await manager.initiateNestedChat(
      'Nested task',
      specialist,
      { addToParentHistory: false }
    );

    const mainHistoryAfter = manager.getConversationHistory().length;

    // Nested conversation should not add summary to history
    const history = manager.getConversationHistory();
    const hasSummary = history.some(msg => msg.content.includes('Nested conversation'));
    expect(hasSummary).toBe(false);
    
    // Verify nested result is independent
    expect(nestedResult.messages.length).toBeGreaterThan(0);
    expect(nestedResult.messages[0].content).toBe('Nested task');
  });

  it('should handle message objects in nested chat', async () => {
    const agent1 = new MockAgent('agent1', ['Response']);
    const agent2 = new MockAgent('agent2', ['TERMINATE']);

    const customMessage: IMessage = {
      role: 'user',
      content: 'Custom message',
      name: 'custom_sender'
    };

    const result = await agent1.initiateNestedChat(
      customMessage,
      agent2
    );

    expect(result.messages[0]).toMatchObject({
      role: 'user',
      content: 'Custom message',
      name: 'agent1' // Name should be overridden to the initiating agent
    });
  });

  it('should handle multi-turn nested conversations', async () => {
    const coordinator = new MockAgent('coordinator', [
      'I need your help',
      'Got it, thanks',
      'Perfect'
    ]);
    
    const worker = new MockAgent('worker', [
      'What do you need?',
      'I can do that',
      'All done!',
      'TERMINATE'
    ]);

    const result = await coordinator.initiateNestedChat(
      'I have a task for you',
      worker,
      { maxRounds: 10 }
    );

    // Should have multiple exchanges
    expect(result.messages.length).toBeGreaterThan(2);
    expect(result.terminated).toBe(true);
  });
});
