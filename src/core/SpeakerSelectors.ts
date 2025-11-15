import { IAgent, IMessage } from './IAgent';
import { ISpeakerSelector } from './ISpeakerSelector';

/**
 * Round-robin speaker selection strategy
 * Cycles through agents in order
 */
export class RoundRobinSelector implements ISpeakerSelector {
  async selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent> {
    if (agents.length === 0) {
      throw new Error('No agents available for selection');
    }

    if (!lastSpeaker) {
      return agents[0];
    }

    const currentIndex = agents.findIndex(
      agent => agent.getName() === lastSpeaker.getName()
    );

    const nextIndex = (currentIndex + 1) % agents.length;
    return agents[nextIndex];
  }

  getDescription(): string {
    return 'Round-robin: Cycles through agents in sequential order';
  }
}

/**
 * Random speaker selection strategy
 * Randomly selects an agent from the available list
 */
export class RandomSelector implements ISpeakerSelector {
  async selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent> {
    if (agents.length === 0) {
      throw new Error('No agents available for selection');
    }

    // Filter out last speaker to avoid consecutive turns (optional)
    const availableAgents = agents.length > 1 && lastSpeaker
      ? agents.filter(agent => agent.getName() !== lastSpeaker.getName())
      : agents;

    const randomIndex = Math.floor(Math.random() * availableAgents.length);
    return availableAgents[randomIndex];
  }

  getDescription(): string {
    return 'Random: Randomly selects the next speaker';
  }
}

/**
 * Manual speaker selection strategy
 * Allows explicit specification of the next speaker by name
 */
export class ManualSelector implements ISpeakerSelector {
  private nextSpeakerName?: string;

  /**
   * Set the name of the next speaker
   * @param name - Name of the agent to speak next
   */
  setNextSpeaker(name: string): void {
    this.nextSpeakerName = name;
  }

  async selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent> {
    if (agents.length === 0) {
      throw new Error('No agents available for selection');
    }

    if (!this.nextSpeakerName) {
      // Default to first agent if no manual selection made
      return agents[0];
    }

    const selectedAgent = agents.find(
      agent => agent.getName() === this.nextSpeakerName
    );

    if (!selectedAgent) {
      throw new Error(
        `Agent '${this.nextSpeakerName}' not found in available agents`
      );
    }

    // Clear the selection after use
    this.nextSpeakerName = undefined;

    return selectedAgent;
  }

  getDescription(): string {
    return 'Manual: Allows explicit selection of the next speaker';
  }
}

/**
 * Constrained speaker selection strategy
 * Selects from a subset of allowed agents based on constraints
 */
export class ConstrainedSelector implements ISpeakerSelector {
  private allowedSpeakerNames: Set<string>;
  private fallbackSelector: ISpeakerSelector;

  /**
   * @param allowedSpeakerNames - Names of agents allowed to speak
   * @param fallbackSelector - Selector to use when choosing from allowed agents (default: round-robin)
   */
  constructor(
    allowedSpeakerNames: string[],
    fallbackSelector?: ISpeakerSelector
  ) {
    this.allowedSpeakerNames = new Set(allowedSpeakerNames);
    this.fallbackSelector = fallbackSelector || new RoundRobinSelector();
  }

  /**
   * Update the list of allowed speakers
   * @param names - New list of allowed speaker names
   */
  setAllowedSpeakers(names: string[]): void {
    this.allowedSpeakerNames = new Set(names);
  }

  /**
   * Add an allowed speaker
   * @param name - Name of agent to allow
   */
  addAllowedSpeaker(name: string): void {
    this.allowedSpeakerNames.add(name);
  }

  /**
   * Remove an allowed speaker
   * @param name - Name of agent to disallow
   */
  removeAllowedSpeaker(name: string): void {
    this.allowedSpeakerNames.delete(name);
  }

  async selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent> {
    if (agents.length === 0) {
      throw new Error('No agents available for selection');
    }

    // Filter to only allowed agents
    const allowedAgents = agents.filter(agent =>
      this.allowedSpeakerNames.has(agent.getName())
    );

    if (allowedAgents.length === 0) {
      throw new Error(
        'No allowed agents found in the current agent list. Allowed: ' +
        Array.from(this.allowedSpeakerNames).join(', ')
      );
    }

    // Use fallback selector to choose from allowed agents
    return await this.fallbackSelector.selectSpeaker(
      allowedAgents,
      messages,
      lastSpeaker
    );
  }

  getDescription(): string {
    return `Constrained: Only allows specific agents (${Array.from(this.allowedSpeakerNames).join(', ')})`;
  }
}
