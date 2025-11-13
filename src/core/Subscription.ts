import { AgentId, TopicId } from './AgentId';

/**
 * Subscription for topic-based messaging
 * Based on microsoft/autogen Subscription
 */
export interface Subscription {
  /**
   * Unique identifier for this subscription
   */
  id: string;

  /**
   * The topic to subscribe to
   */
  topic_id: TopicId;

  /**
   * The agent that is subscribing
   */
  agent_id: AgentId;

  /**
   * Optional message type filter
   */
  message_type?: string;
}

/**
 * Create a subscription
 */
export function createSubscription(
  id: string,
  topic_id: TopicId,
  agent_id: AgentId,
  message_type?: string
): Subscription {
  return {
    id,
    topic_id,
    agent_id,
    message_type
  };
}
