import { IAgent, IMessage } from './IAgent';
import { ISpeakerSelector } from './ISpeakerSelector';

/**
 * Configuration for AutoSelector
 */
export interface AutoSelectorConfig {
  /** The LLM-powered agent to use for selection decisions */
  selectorAgent: IAgent;
  /** Custom system prompt for the selector (optional) */
  systemPrompt?: string;
  /** Whether to include full conversation history in selection (default: false) */
  includeFullHistory?: boolean;
  /** Maximum number of recent messages to include (default: 10) */
  maxRecentMessages?: number;
}

/**
 * Auto speaker selection strategy using LLM
 * Uses an AI agent to intelligently select the next speaker based on context
 */
export class AutoSelector implements ISpeakerSelector {
  private selectorAgent: IAgent;
  private systemPrompt: string;
  private includeFullHistory: boolean;
  private maxRecentMessages: number;

  constructor(config: AutoSelectorConfig) {
    this.selectorAgent = config.selectorAgent;
    this.includeFullHistory = config.includeFullHistory ?? false;
    this.maxRecentMessages = config.maxRecentMessages ?? 10;
    
    this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
  }

  private getDefaultSystemPrompt(): string {
    return `You are a conversation coordinator. Your job is to select the most appropriate agent to speak next based on the conversation context and each agent's capabilities.

Guidelines:
1. Consider the conversation topic and which agent is most qualified to respond
2. Ensure balanced participation when possible
3. Select agents whose expertise matches the current discussion
4. Avoid selecting the same agent consecutively unless necessary
5. Respond with ONLY the agent name, nothing else`;
  }

  async selectSpeaker(
    agents: IAgent[],
    messages: IMessage[],
    lastSpeaker?: IAgent
  ): Promise<IAgent> {
    if (agents.length === 0) {
      throw new Error('No agents available for selection');
    }

    if (agents.length === 1) {
      return agents[0];
    }

    // Build context for the selector
    const agentDescriptions = agents
      .map((agent, idx) => `${idx + 1}. ${agent.getName()}`)
      .join('\n');

    // Get recent messages for context
    const recentMessages = this.includeFullHistory
      ? messages
      : messages.slice(-this.maxRecentMessages);

    const conversationContext = recentMessages
      .map(msg => `[${msg.name || msg.role}]: ${msg.content}`)
      .join('\n');

    const selectionPrompt = `${this.systemPrompt}

Available agents:
${agentDescriptions}

Recent conversation:
${conversationContext}

${lastSpeaker ? `Last speaker: ${lastSpeaker.getName()}` : ''}

Select the most appropriate agent to speak next. Respond with only the agent name.`;

    // Use the selector agent to make the decision
    const selectionMessages: IMessage[] = [
      { role: 'user', content: selectionPrompt }
    ];

    try {
      const response = await this.selectorAgent.generateReply(selectionMessages);
      const selectedName = response.content.trim();

      // Try to find the agent by exact name match
      let selectedAgent = agents.find(
        agent => agent.getName().toLowerCase() === selectedName.toLowerCase()
      );

      // If no exact match, try partial match
      if (!selectedAgent) {
        selectedAgent = agents.find(agent =>
          selectedName.toLowerCase().includes(agent.getName().toLowerCase()) ||
          agent.getName().toLowerCase().includes(selectedName.toLowerCase())
        );
      }

      // Fallback to first agent if LLM response is unclear
      if (!selectedAgent) {
        console.warn(
          `AutoSelector: Could not parse agent name from response: "${selectedName}". Falling back to first agent.`
        );
        selectedAgent = agents[0];
      }

      return selectedAgent;
    } catch (error) {
      console.error('AutoSelector: Error during selection, falling back to first agent:', error);
      return agents[0];
    }
  }

  getDescription(): string {
    return 'Auto: Uses LLM to intelligently select the next speaker based on conversation context';
  }

  /**
   * Update the system prompt for selection
   * @param prompt - New system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Set whether to include full conversation history
   * @param include - Whether to include full history
   */
  setIncludeFullHistory(include: boolean): void {
    this.includeFullHistory = include;
  }

  /**
   * Set maximum number of recent messages to include
   * @param max - Maximum messages
   */
  setMaxRecentMessages(max: number): void {
    this.maxRecentMessages = max;
  }
}
