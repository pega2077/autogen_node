import { AgentId, TopicId } from './AgentId';
import { CancellationToken } from './CancellationToken';
import { Subscription } from './Subscription';

/**
 * Agent metadata information
 */
export interface AgentMetadata {
  /**
   * The agent's type
   */
  type: string;

  /**
   * The agent's key
   */
  key: string;

  /**
   * Additional metadata
   */
  [key: string]: any;
}

/**
 * Agent factory function type
 */
export type AgentFactory<T = any> = () => T | Promise<T>;

/**
 * AgentRuntime protocol interface
 * Based on microsoft/autogen AgentRuntime
 * 
 * This is the core runtime for hosting and managing agents in an event-driven,
 * asynchronous messaging system. It provides:
 * - Direct message passing (send_message)
 * - Topic-based publish/subscribe (publish_message)
 * - Agent registration and lifecycle management
 * - State persistence and restoration
 */
export interface AgentRuntime {
  /**
   * Send a message to an agent and get a response
   * 
   * @param message - The message to send
   * @param recipient - The agent to send the message to
   * @param sender - The agent sending the message (null if external)
   * @param cancellationToken - Token to cancel the operation
   * @param messageId - Optional unique message identifier
   * @returns The response from the agent
   */
  sendMessage(
    message: any,
    recipient: AgentId,
    sender?: AgentId | null,
    cancellationToken?: CancellationToken | null,
    messageId?: string | null
  ): Promise<any>;

  /**
   * Publish a message to all agents subscribed to a topic
   * No responses are expected from publishing
   * 
   * @param message - The message to publish
   * @param topicId - The topic to publish to
   * @param sender - The agent sending the message (null if external)
   * @param cancellationToken - Token to cancel the operation
   * @param messageId - Optional unique message identifier
   */
  publishMessage(
    message: any,
    topicId: TopicId,
    sender?: AgentId | null,
    cancellationToken?: CancellationToken | null,
    messageId?: string | null
  ): Promise<void>;

  /**
   * Register an agent factory with the runtime
   * The factory creates agent instances on demand
   * 
   * @param type - The type identifier for agents created by this factory
   * @param agentFactory - Factory function to create agent instances
   * @returns The registered agent type
   */
  registerFactory(
    type: string,
    agentFactory: AgentFactory
  ): Promise<string>;

  /**
   * Register a specific agent instance with the runtime
   * 
   * @param agentInstance - The agent instance to register
   * @param agentId - The identifier for this agent instance
   * @returns The agent's ID
   */
  registerAgentInstance(
    agentInstance: any,
    agentId: AgentId
  ): Promise<AgentId>;

  /**
   * Try to get the underlying agent instance
   * This is generally discouraged but can be useful in some cases
   * 
   * @param id - The agent ID
   * @returns The agent instance
   * @throws Error if agent not found or not accessible
   */
  tryGetUnderlyingAgentInstance(id: AgentId): Promise<any>;

  /**
   * Get an agent ID by type and key
   * 
   * @param type - The agent type
   * @param key - The agent key (defaults to 'default')
   * @param lazy - Whether to lazily create the agent if it doesn't exist
   * @returns The agent ID
   */
  get(type: string, key?: string, lazy?: boolean): Promise<AgentId>;

  /**
   * Save the state of the entire runtime
   * 
   * @returns The saved state as a JSON-serializable object
   */
  saveState(): Promise<Record<string, any>>;

  /**
   * Load the state of the entire runtime
   * 
   * @param state - The saved state to load
   */
  loadState(state: Record<string, any>): Promise<void>;

  /**
   * Get metadata for an agent
   * 
   * @param agent - The agent ID
   * @returns The agent metadata
   */
  agentMetadata(agent: AgentId): Promise<AgentMetadata>;

  /**
   * Save the state of a single agent
   * 
   * @param agent - The agent ID
   * @returns The saved agent state
   */
  agentSaveState(agent: AgentId): Promise<Record<string, any>>;

  /**
   * Load the state of a single agent
   * 
   * @param agent - The agent ID
   * @param state - The state to load
   */
  agentLoadState(agent: AgentId, state: Record<string, any>): Promise<void>;

  /**
   * Add a subscription to the runtime
   * 
   * @param subscription - The subscription to add
   */
  addSubscription(subscription: Subscription): Promise<void>;

  /**
   * Remove a subscription from the runtime
   * 
   * @param id - The subscription ID to remove
   * @throws Error if subscription doesn't exist
   */
  removeSubscription(id: string): Promise<void>;
}
