/**
 * Agent identifier for distributed agent systems
 * Based on microsoft/autogen AgentId class
 */
export class AgentId {
  /**
   * The type of the agent
   */
  public readonly type: string;

  /**
   * The unique key identifier for this agent instance
   */
  public readonly key: string;

  constructor(type: string, key: string = 'default') {
    this.type = type;
    this.key = key;
  }

  /**
   * Get the full identifier string
   */
  toString(): string {
    return `${this.type}/${this.key}`;
  }

  /**
   * Check if two AgentIds are equal
   */
  equals(other: AgentId): boolean {
    return this.type === other.type && this.key === other.key;
  }

  /**
   * Create an AgentId from a string representation
   */
  static fromString(str: string): AgentId {
    const parts = str.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid AgentId string format: ${str}. Expected format: type/key`);
    }
    return new AgentId(parts[0], parts[1]);
  }
}

/**
 * Topic identifier for publish/subscribe messaging
 */
export class TopicId {
  /**
   * The type of topic
   */
  public readonly type: string;

  /**
   * The source identifier
   */
  public readonly source: string;

  constructor(type: string, source: string) {
    this.type = type;
    this.source = source;
  }

  /**
   * Get the full topic identifier string
   */
  toString(): string {
    return `${this.type}/${this.source}`;
  }

  /**
   * Check if two TopicIds are equal
   */
  equals(other: TopicId): boolean {
    return this.type === other.type && this.source === other.source;
  }
}
