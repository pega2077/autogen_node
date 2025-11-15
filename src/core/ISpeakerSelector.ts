import { IAgent, IMessage } from './IAgent';

/**
 * Interface for speaker selection strategies in group chats
 */
export interface ISpeakerSelector {
  /**
   * Select the next speaker from available agents
   * @param agents - List of available agents
   * @param messages - Conversation history
   * @param lastSpeaker - The agent that spoke last (optional)
   * @returns The selected agent to speak next
   */
  selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent>;

  /**
   * Get a description of this selector strategy
   */
  getDescription(): string;
}

/**
 * Context for speaker selection with additional constraints
 */
export interface SpeakerSelectionContext {
  /** List of available agents */
  agents: IAgent[];
  /** Conversation history */
  messages: IMessage[];
  /** The agent that spoke last */
  lastSpeaker?: IAgent;
  /** List of agents allowed to speak next (optional constraint) */
  allowedSpeakers?: IAgent[];
  /** Current round number */
  round?: number;
}
