import { IAgent, IMessage } from './IAgent';

/**
 * Options for nested chat
 */
export interface NestedChatOptions {
  /** Maximum number of rounds in the nested conversation */
  maxRounds?: number;
  /** Whether to add the nested conversation to parent history */
  addToParentHistory?: boolean;
  /** Custom termination message */
  terminationMessage?: string;
}

/**
 * Result from a nested chat
 */
export interface NestedChatResult {
  /** All messages from the nested conversation */
  messages: IMessage[];
  /** The final message from the nested chat */
  finalMessage: IMessage;
  /** Number of rounds executed */
  rounds: number;
  /** Whether the chat was terminated */
  terminated: boolean;
}

/**
 * Interface for agents that support nested conversations
 */
export interface INestedChatAgent extends IAgent {
  /**
   * Start a nested conversation with another agent or set of agents
   * @param message - Initial message for the nested chat
   * @param recipient - Agent to chat with in the nested conversation
   * @param options - Options for the nested chat
   * @returns Result of the nested conversation
   */
  initiateNestedChat(
    message: string | IMessage,
    recipient: IAgent,
    options?: NestedChatOptions
  ): Promise<NestedChatResult>;
}

/**
 * Check if an agent supports nested chat
 */
export function supportsNestedChat(agent: IAgent): agent is INestedChatAgent {
  return 'initiateNestedChat' in agent;
}
