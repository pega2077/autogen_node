import { AgentId, TopicId } from './AgentId';
import { AgentRuntime, AgentMetadata, AgentFactory } from './AgentRuntime';
import { CancellationToken } from './CancellationToken';
import { Subscription } from './Subscription';
import { randomUUID } from 'crypto';

/**
 * Agent instance wrapper
 */
interface AgentInstance {
  instance: any;
  metadata: AgentMetadata;
  state?: Record<string, any>;
}

/**
 * Single-threaded implementation of AgentRuntime
 * Based on microsoft/autogen SingleThreadedAgentRuntime
 * 
 * This runtime manages agents in a single Node.js process
 * and handles message passing between them asynchronously.
 */
export class SingleThreadedAgentRuntime implements AgentRuntime {
  private agents: Map<string, AgentInstance> = new Map();
  private factories: Map<string, AgentFactory> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private messageQueue: Array<{
    message: any;
    recipient?: AgentId;
    topicId?: TopicId;
    sender?: AgentId | null;
    messageId: string;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private processing: boolean = false;

  /**
   * Send a message to an agent and get a response
   */
  async sendMessage(
    message: any,
    recipient: AgentId,
    sender?: AgentId | null,
    cancellationToken?: CancellationToken | null,
    messageId?: string | null
  ): Promise<any> {
    cancellationToken?.throwIfCancelled();

    const msgId = messageId || randomUUID();
    const agentKey = recipient.toString();
    
    // Check if agent exists
    const agentInstance = this.agents.get(agentKey);
    if (!agentInstance) {
      throw new Error(`Agent not found: ${agentKey}`);
    }

    return new Promise((resolve, reject) => {
      this.messageQueue.push({
        message,
        recipient,
        sender: sender || null,
        messageId: msgId,
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  /**
   * Publish a message to all agents subscribed to a topic
   */
  async publishMessage(
    message: any,
    topicId: TopicId,
    sender?: AgentId | null,
    cancellationToken?: CancellationToken | null,
    messageId?: string | null
  ): Promise<void> {
    cancellationToken?.throwIfCancelled();

    const msgId = messageId || randomUUID();

    // Find all subscriptions for this topic
    const relevantSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.topic_id.equals(topicId));

    // Send message to all subscribers
    const promises = relevantSubscriptions.map(sub => 
      this.sendMessage(message, sub.agent_id, sender, cancellationToken, msgId)
        .catch(err => {
          console.error(`Error delivering message to ${sub.agent_id.toString()}:`, err);
        })
    );

    await Promise.all(promises);
  }

  /**
   * Register an agent factory
   */
  async registerFactory(
    type: string,
    agentFactory: AgentFactory
  ): Promise<string> {
    if (this.factories.has(type)) {
      throw new Error(`Factory already registered for type: ${type}`);
    }

    this.factories.set(type, agentFactory);
    return type;
  }

  /**
   * Register an agent instance
   */
  async registerAgentInstance(
    agentInstance: any,
    agentId: AgentId
  ): Promise<AgentId> {
    const key = agentId.toString();

    if (this.agents.has(key)) {
      throw new Error(`Agent already registered: ${key}`);
    }

    this.agents.set(key, {
      instance: agentInstance,
      metadata: {
        type: agentId.type,
        key: agentId.key
      }
    });

    return agentId;
  }

  /**
   * Try to get the underlying agent instance
   */
  async tryGetUnderlyingAgentInstance(id: AgentId): Promise<any> {
    const key = id.toString();
    const agentInstance = this.agents.get(key);

    if (!agentInstance) {
      throw new Error(`Agent not found: ${key}`);
    }

    return agentInstance.instance;
  }

  /**
   * Get an agent ID
   */
  async get(type: string, key: string = 'default', lazy: boolean = true): Promise<AgentId> {
    const agentId = new AgentId(type, key);
    const agentKey = agentId.toString();

    // Check if agent already exists
    if (this.agents.has(agentKey)) {
      return agentId;
    }

    // If lazy creation is enabled and factory exists, create the agent
    if (lazy && this.factories.has(type)) {
      const factory = this.factories.get(type)!;
      const instance = await factory();
      await this.registerAgentInstance(instance, agentId);
      return agentId;
    }

    throw new Error(`Agent not found: ${agentKey}`);
  }

  /**
   * Save runtime state
   */
  async saveState(): Promise<Record<string, any>> {
    const agentStates: Record<string, any> = {};

    for (const [key, agentInstance] of this.agents.entries()) {
      if (agentInstance.state) {
        agentStates[key] = agentInstance.state;
      }
    }

    return {
      agents: agentStates,
      subscriptions: Array.from(this.subscriptions.values())
    };
  }

  /**
   * Load runtime state
   */
  async loadState(state: Record<string, any>): Promise<void> {
    if (state.agents) {
      for (const [key, agentState] of Object.entries(state.agents)) {
        const agentInstance = this.agents.get(key);
        if (agentInstance) {
          agentInstance.state = agentState as Record<string, any>;
        }
      }
    }

    if (state.subscriptions) {
      for (const sub of state.subscriptions) {
        this.subscriptions.set(sub.id, sub);
      }
    }
  }

  /**
   * Get agent metadata
   */
  async agentMetadata(agent: AgentId): Promise<AgentMetadata> {
    const key = agent.toString();
    const agentInstance = this.agents.get(key);

    if (!agentInstance) {
      throw new Error(`Agent not found: ${key}`);
    }

    return agentInstance.metadata;
  }

  /**
   * Save agent state
   */
  async agentSaveState(agent: AgentId): Promise<Record<string, any>> {
    const key = agent.toString();
    const agentInstance = this.agents.get(key);

    if (!agentInstance) {
      throw new Error(`Agent not found: ${key}`);
    }

    return agentInstance.state || {};
  }

  /**
   * Load agent state
   */
  async agentLoadState(agent: AgentId, state: Record<string, any>): Promise<void> {
    const key = agent.toString();
    const agentInstance = this.agents.get(key);

    if (!agentInstance) {
      throw new Error(`Agent not found: ${key}`);
    }

    agentInstance.state = state;
  }

  /**
   * Add a subscription
   */
  async addSubscription(subscription: Subscription): Promise<void> {
    this.subscriptions.set(subscription.id, subscription);
  }

  /**
   * Remove a subscription
   */
  async removeSubscription(id: string): Promise<void> {
    if (!this.subscriptions.has(id)) {
      throw new Error(`Subscription not found: ${id}`);
    }

    this.subscriptions.delete(id);
  }

  /**
   * Process the message queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift()!;

      try {
        if (item.recipient) {
          // Direct message
          const agentKey = item.recipient.toString();
          const agentInstance = this.agents.get(agentKey);

          if (!agentInstance) {
            item.reject(new Error(`Agent not found: ${agentKey}`));
            continue;
          }

          // Call the agent's message handler if it exists
          let result: any;
          if (typeof agentInstance.instance.handleMessage === 'function') {
            result = await agentInstance.instance.handleMessage(
              item.message,
              item.sender
            );
          } else if (typeof agentInstance.instance.generateReply === 'function') {
            // Fallback to generateReply for compatibility with existing agents
            result = await agentInstance.instance.generateReply([item.message]);
          } else {
            result = { content: 'Message received', role: 'assistant' };
          }

          item.resolve(result);
        }
      } catch (error) {
        item.reject(error);
      }
    }

    this.processing = false;
  }
}
