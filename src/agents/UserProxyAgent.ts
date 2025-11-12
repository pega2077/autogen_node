import * as readline from 'readline';
import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig } from '../core/IAgent';

/**
 * Human input modes for the user proxy agent
 */
export enum HumanInputMode {
  ALWAYS = 'ALWAYS',
  TERMINATE = 'TERMINATE',
  NEVER = 'NEVER'
}

/**
 * Configuration for UserProxyAgent
 */
export interface UserProxyConfig extends IAgentConfig {
  humanInputMode?: HumanInputMode;
  isTerminationMsg?: (message: IMessage) => boolean;
}

/**
 * A proxy agent for the human user
 * Similar to .NET's UserProxyAgent
 */
export class UserProxyAgent extends BaseAgent {
  private humanInputMode: HumanInputMode;
  private customIsTerminationMsg?: (message: IMessage) => boolean;
  private rl: readline.Interface;

  constructor(config: UserProxyConfig) {
    super(config);
    this.humanInputMode = config.humanInputMode || HumanInputMode.TERMINATE;
    this.customIsTerminationMsg = config.isTerminationMsg;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Generate a reply - either from human input or auto-reply
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const lastMessage = messages[messages.length - 1];

    // Determine if we need human input
    const needHumanInput = this.shouldAskForHumanInput(lastMessage);

    if (needHumanInput) {
      const humanReply = await this.getHumanInput();
      const reply: IMessage = {
        role: 'user',
        content: humanReply,
        name: this.name
      };
      this.addToHistory(reply);
      return reply;
    } else {
      // Auto-reply
      const reply: IMessage = {
        role: 'user',
        content: 'Continuing...',
        name: this.name
      };
      this.addToHistory(reply);
      return reply;
    }
  }

  /**
   * Determine if we should ask for human input
   */
  private shouldAskForHumanInput(message: IMessage): boolean {
    switch (this.humanInputMode) {
      case HumanInputMode.ALWAYS:
        return true;
      case HumanInputMode.NEVER:
        return false;
      case HumanInputMode.TERMINATE:
        return this.isTerminationMessage(message);
      default:
        return false;
    }
  }

  /**
   * Get input from the human user via console
   */
  private async getHumanInput(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('Your input (type "exit" to terminate): ', (answer) => {
        resolve(answer);
      });
    });
  }

  /**
   * Check if a message indicates termination
   */
  protected isTerminationMessage(message: IMessage): boolean {
    if (this.customIsTerminationMsg) {
      return this.customIsTerminationMsg(message);
    }
    return super.isTerminationMessage(message);
  }

  /**
   * Close the readline interface
   */
  close(): void {
    this.rl.close();
  }
}
