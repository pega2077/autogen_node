/**
 * Tests for Event-Driven Architecture components
 */

import {
  AgentId,
  TopicId,
  SingleThreadedAgentRuntime,
  CancellationToken,
  createSubscription,
} from '../index';

// Mock event-driven agent
class MockEventAgent {
  public messagesReceived: any[] = [];

  constructor(public name: string) {}

  async handleMessage(message: any, sender: AgentId | null): Promise<any> {
    this.messagesReceived.push({ message, sender });
    return {
      role: 'assistant',
      content: `Echo: ${message.content}`,
      name: this.name,
    };
  }
}

describe('Event-Driven Architecture', () => {
  describe('AgentId', () => {
    it('should create an AgentId with type and key', () => {
      const agentId = new AgentId('test_agent', 'instance1');
      expect(agentId.type).toBe('test_agent');
      expect(agentId.key).toBe('instance1');
    });

    it('should use default key if not specified', () => {
      const agentId = new AgentId('test_agent');
      expect(agentId.key).toBe('default');
    });

    it('should convert to string correctly', () => {
      const agentId = new AgentId('test_agent', 'instance1');
      expect(agentId.toString()).toBe('test_agent/instance1');
    });

    it('should create from string', () => {
      const agentId = AgentId.fromString('test_agent/instance1');
      expect(agentId.type).toBe('test_agent');
      expect(agentId.key).toBe('instance1');
    });

    it('should check equality correctly', () => {
      const agentId1 = new AgentId('test_agent', 'instance1');
      const agentId2 = new AgentId('test_agent', 'instance1');
      const agentId3 = new AgentId('test_agent', 'instance2');

      expect(agentId1.equals(agentId2)).toBe(true);
      expect(agentId1.equals(agentId3)).toBe(false);
    });
  });

  describe('TopicId', () => {
    it('should create a TopicId', () => {
      const topicId = new TopicId('notifications', 'system');
      expect(topicId.type).toBe('notifications');
      expect(topicId.source).toBe('system');
    });

    it('should convert to string correctly', () => {
      const topicId = new TopicId('notifications', 'system');
      expect(topicId.toString()).toBe('notifications/system');
    });

    it('should check equality correctly', () => {
      const topicId1 = new TopicId('notifications', 'system');
      const topicId2 = new TopicId('notifications', 'system');
      const topicId3 = new TopicId('alerts', 'system');

      expect(topicId1.equals(topicId2)).toBe(true);
      expect(topicId1.equals(topicId3)).toBe(false);
    });
  });

  describe('CancellationToken', () => {
    it('should start as not cancelled', () => {
      const token = new CancellationToken();
      expect(token.isCancelled).toBe(false);
    });

    it('should cancel when requested', () => {
      const token = new CancellationToken();
      token.cancel();
      expect(token.isCancelled).toBe(true);
    });

    it('should throw when cancelled', () => {
      const token = new CancellationToken();
      token.cancel();
      expect(() => token.throwIfCancelled()).toThrow('Operation was cancelled');
    });

    it('should call onCancelled callback', () => {
      const token = new CancellationToken();
      let called = false;

      token.onCancelled(() => {
        called = true;
      });

      token.cancel();
      expect(called).toBe(true);
    });

    it('should call callback immediately if already cancelled', () => {
      const token = new CancellationToken();
      token.cancel();

      let called = false;
      token.onCancelled(() => {
        called = true;
      });

      expect(called).toBe(true);
    });
  });

  describe('SingleThreadedAgentRuntime', () => {
    let runtime: SingleThreadedAgentRuntime;

    beforeEach(() => {
      runtime = new SingleThreadedAgentRuntime();
    });

    describe('Agent Registration', () => {
      it('should register an agent instance', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');

        await runtime.registerAgentInstance(agent, agentId);
        const retrievedId = await runtime.get('mock_agent', 'test1');

        expect(retrievedId.equals(agentId)).toBe(true);
      });

      it('should register an agent factory', async () => {
        const factory = () => new MockEventAgent('factory_agent');
        await runtime.registerFactory('factory_type', factory);

        // Lazy creation should work
        const agentId = await runtime.get('factory_type', 'default', true);
        expect(agentId.type).toBe('factory_type');
        expect(agentId.key).toBe('default');
      });

      it('should throw when registering duplicate agent', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');

        await runtime.registerAgentInstance(agent, agentId);

        await expect(
          runtime.registerAgentInstance(agent, agentId)
        ).rejects.toThrow('Agent already registered');
      });
    });

    describe('Message Passing', () => {
      it('should send message to agent', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');

        await runtime.registerAgentInstance(agent, agentId);

        const message = { content: 'Hello' };
        const response = await runtime.sendMessage(message, agentId);

        expect(response.content).toBe('Echo: Hello');
        expect(agent.messagesReceived.length).toBe(1);
        expect(agent.messagesReceived[0].message).toEqual(message);
      });

      it('should send message with sender information', async () => {
        const agent1 = new MockEventAgent('agent1');
        const agent2 = new MockEventAgent('agent2');
        const agent1Id = new AgentId('mock_agent', 'agent1');
        const agent2Id = new AgentId('mock_agent', 'agent2');

        await runtime.registerAgentInstance(agent1, agent1Id);
        await runtime.registerAgentInstance(agent2, agent2Id);

        const message = { content: 'Hello from agent1' };
        await runtime.sendMessage(message, agent2Id, agent1Id);

        expect(agent2.messagesReceived.length).toBe(1);
        expect(agent2.messagesReceived[0].sender?.equals(agent1Id)).toBe(true);
      });

      it('should throw when sending to non-existent agent', async () => {
        const agentId = new AgentId('nonexistent', 'test');
        const message = { content: 'Hello' };

        await expect(runtime.sendMessage(message, agentId)).rejects.toThrow(
          'Agent not found'
        );
      });
    });

    describe('Publish/Subscribe', () => {
      it('should publish message to subscribers', async () => {
        const subscriber1 = new MockEventAgent('subscriber1');
        const subscriber2 = new MockEventAgent('subscriber2');
        const sub1Id = new AgentId('subscriber', 'sub1');
        const sub2Id = new AgentId('subscriber', 'sub2');

        await runtime.registerAgentInstance(subscriber1, sub1Id);
        await runtime.registerAgentInstance(subscriber2, sub2Id);

        const topicId = new TopicId('notifications', 'system');
        await runtime.addSubscription(createSubscription('sub1', topicId, sub1Id));
        await runtime.addSubscription(createSubscription('sub2', topicId, sub2Id));

        const message = { content: 'Broadcast message' };
        await runtime.publishMessage(message, topicId);

        expect(subscriber1.messagesReceived.length).toBe(1);
        expect(subscriber2.messagesReceived.length).toBe(1);
        expect(subscriber1.messagesReceived[0].message).toEqual(message);
        expect(subscriber2.messagesReceived[0].message).toEqual(message);
      });

      it('should remove subscriptions', async () => {
        const subscriber = new MockEventAgent('subscriber');
        const subId = new AgentId('subscriber', 'sub1');

        await runtime.registerAgentInstance(subscriber, subId);

        const topicId = new TopicId('notifications', 'system');
        const subscription = createSubscription('sub1', topicId, subId);
        await runtime.addSubscription(subscription);

        await runtime.removeSubscription('sub1');

        const message = { content: 'Should not be received' };
        await runtime.publishMessage(message, topicId);

        expect(subscriber.messagesReceived.length).toBe(0);
      });
    });

    describe('State Management', () => {
      it('should save and load runtime state', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');
        await runtime.registerAgentInstance(agent, agentId);

        const topicId = new TopicId('test', 'topic');
        await runtime.addSubscription(createSubscription('sub1', topicId, agentId));

        const state = await runtime.saveState();

        expect(state.subscriptions).toHaveLength(1);
        expect(state.subscriptions[0].id).toBe('sub1');

        const newRuntime = new SingleThreadedAgentRuntime();
        await newRuntime.registerAgentInstance(agent, agentId);
        await newRuntime.loadState(state);

        const loadedState = await newRuntime.saveState();
        expect(loadedState.subscriptions).toHaveLength(1);
      });

      it('should get agent metadata', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');
        await runtime.registerAgentInstance(agent, agentId);

        const metadata = await runtime.agentMetadata(agentId);

        expect(metadata.type).toBe('mock_agent');
        expect(metadata.key).toBe('test1');
      });
    });

    describe('Cancellation', () => {
      it('should respect cancellation tokens', async () => {
        const agent = new MockEventAgent('test_agent');
        const agentId = new AgentId('mock_agent', 'test1');
        await runtime.registerAgentInstance(agent, agentId);

        const token = new CancellationToken();
        token.cancel();

        const message = { content: 'Should be cancelled' };

        await expect(
          runtime.sendMessage(message, agentId, null, token)
        ).rejects.toThrow('Operation was cancelled');
      });
    });
  });

  describe('Subscription', () => {
    it('should create a subscription', () => {
      const topicId = new TopicId('test', 'topic');
      const agentId = new AgentId('test', 'agent');
      const subscription = createSubscription('sub1', topicId, agentId);

      expect(subscription.id).toBe('sub1');
      expect(subscription.topic_id).toBe(topicId);
      expect(subscription.agent_id).toBe(agentId);
    });

    it('should create subscription with message type filter', () => {
      const topicId = new TopicId('test', 'topic');
      const agentId = new AgentId('test', 'agent');
      const subscription = createSubscription('sub1', topicId, agentId, 'TestMessage');

      expect(subscription.message_type).toBe('TestMessage');
    });
  });
});
