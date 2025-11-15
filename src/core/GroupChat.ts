import { IAgent, IMessage } from '../core/IAgent';
import { BaseAgent } from '../core/BaseAgent';
import { ISpeakerSelector } from './ISpeakerSelector';
import { RoundRobinSelector } from './SpeakerSelectors';

/**
 * Configuration for GroupChat
 */
export interface GroupChatConfig {
  agents: IAgent[];
  maxRound?: number;
  adminName?: string;
  /** Speaker selection strategy (default: round-robin) */
  speakerSelector?: ISpeakerSelector;
}

/**
 * Manages a group chat with multiple agents
 * Similar to .NET's GroupChat functionality
 */
export class GroupChat {
  private agents: IAgent[];
  private maxRound: number;
  private adminName: string;
  private messages: IMessage[];
  private speakerSelector: ISpeakerSelector;

  constructor(config: GroupChatConfig) {
    if (config.agents.length < 2) {
      throw new Error('GroupChat requires at least 2 agents');
    }
    
    this.agents = config.agents;
    this.maxRound = config.maxRound || 10;
    this.adminName = config.adminName || 'Admin';
    this.messages = [];
    this.speakerSelector = config.speakerSelector || new RoundRobinSelector();
  }

  /**
   * Get all agents in the group chat
   */
  getAgents(): IAgent[] {
    return [...this.agents];
  }

  /**
   * Get all messages in the group chat
   */
  getMessages(): IMessage[] {
    return [...this.messages];
  }

  /**
   * Add a message to the group chat
   */
  addMessage(message: IMessage): void {
    this.messages.push(message);
  }

  /**
   * Get the next speaker using the configured speaker selection strategy
   */
  private async selectNextSpeaker(lastSpeaker?: IAgent): Promise<IAgent> {
    return await this.speakerSelector.selectSpeaker(
      this.agents,
      this.messages,
      lastSpeaker
    );
  }

  /**
   * Set a new speaker selection strategy
   * @param selector - The new speaker selector to use
   */
  setSpeakerSelector(selector: ISpeakerSelector): void {
    this.speakerSelector = selector;
  }

  /**
   * Get the current speaker selector
   */
  getSpeakerSelector(): ISpeakerSelector {
    return this.speakerSelector;
  }

  /**
   * Check if the conversation should terminate
   */
  private shouldTerminate(message: IMessage): boolean {
    const terminationKeywords = ['TERMINATE', 'terminate'];
    return terminationKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Start the group chat
   */
  async run(initialMessage: string): Promise<IMessage[]> {
    // Add initial message
    const initMsg: IMessage = {
      role: 'user',
      content: initialMessage,
      name: this.adminName
    };
    this.addMessage(initMsg);

    let currentSpeaker: IAgent | undefined;
    let round = 0;

    while (round < this.maxRound) {
      // Select next speaker
      const nextSpeaker = await this.selectNextSpeaker(currentSpeaker);
      
      console.log(`\n[Round ${round + 1}] Next speaker: ${nextSpeaker.getName()}`);

      // Generate reply
      try {
        const reply = await nextSpeaker.generateReply(this.messages);
        this.addMessage(reply);

        console.log(`[${reply.name || reply.role}]: ${reply.content}\n`);

        // Check for termination
        if (this.shouldTerminate(reply)) {
          console.log('Conversation terminated by agent.');
          break;
        }

        currentSpeaker = nextSpeaker;
        round++;
      } catch (error) {
        console.error(`Error generating reply from ${nextSpeaker.getName()}:`, error);
        break;
      }
    }

    if (round >= this.maxRound) {
      console.log('Maximum rounds reached.');
    }

    return this.getMessages();
  }

  /**
   * Reset the group chat
   */
  reset(): void {
    this.messages = [];
  }
}

/**
 * Configuration for GroupChatManager
 */
export interface GroupChatManagerConfig {
  groupChat: GroupChat;
  name?: string;
  systemMessage?: string;
}

/**
 * Manager agent for coordinating group chats
 * Similar to .NET's GroupChatManager
 */
export class GroupChatManager extends BaseAgent {
  private groupChat: GroupChat;

  constructor(config: GroupChatManagerConfig) {
    super({
      name: config.name || 'chat_manager',
      systemMessage: config.systemMessage || 'You are managing a group conversation.'
    });

    this.groupChat = config.groupChat;
  }

  /**
   * Generate a reply by running the group chat
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    // For now, this is a simple passthrough
    // In a more advanced implementation, this could coordinate agent selection
    const lastMessage = messages[messages.length - 1];
    
    return {
      role: 'assistant',
      content: `Group chat manager received: ${lastMessage.content}`,
      name: this.name
    };
  }

  /**
   * Run the group chat
   */
  async runChat(initialMessage: string): Promise<IMessage[]> {
    return await this.groupChat.run(initialMessage);
  }

  /**
   * Get the group chat instance
   */
  getGroupChat(): GroupChat {
    return this.groupChat;
  }
}
