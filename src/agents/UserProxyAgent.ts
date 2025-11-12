import * as readline from 'readline';
import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig } from '../core/IAgent';
import { ICodeExecutor, ICodeBlock } from '../core/ICodeExecutor';
import { LocalCodeExecutor } from '../executors/LocalCodeExecutor';

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
  codeExecutor?: ICodeExecutor;
  autoExecuteCode?: boolean;
}

/**
 * A proxy agent for the human user
 * Similar to .NET's UserProxyAgent
 */
export class UserProxyAgent extends BaseAgent {
  private humanInputMode: HumanInputMode;
  private customIsTerminationMsg?: (message: IMessage) => boolean;
  private rl: readline.Interface;
  private codeExecutor?: ICodeExecutor;
  private autoExecuteCode: boolean;

  constructor(config: UserProxyConfig) {
    super(config);
    this.humanInputMode = config.humanInputMode || HumanInputMode.TERMINATE;
    this.customIsTerminationMsg = config.isTerminationMsg;
    this.codeExecutor = config.codeExecutor;
    this.autoExecuteCode = config.autoExecuteCode ?? false;
    
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

    // Check if the last message contains code blocks to execute
    if (this.codeExecutor && this.autoExecuteCode) {
      const codeBlocks = this.extractCodeBlocks(lastMessage.content);
      if (codeBlocks.length > 0) {
        const executionResults = await this.codeExecutor.executeCodeBlocks(codeBlocks);
        const resultText = this.formatExecutionResults(executionResults);
        
        const reply: IMessage = {
          role: 'user',
          content: resultText,
          name: this.name
        };
        this.addToHistory(reply);
        return reply;
      }
    }

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

  /**
   * Extract code blocks from markdown-formatted text
   */
  private extractCodeBlocks(text: string): ICodeBlock[] {
    const codeBlocks: ICodeBlock[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      codeBlocks.push({ language, code });
    }

    return codeBlocks;
  }

  /**
   * Format execution results for display
   */
  private formatExecutionResults(results: Array<{ success: boolean; output: string; error?: string }>): string {
    let formattedResults = 'Code execution results:\n\n';
    
    results.forEach((result, index) => {
      formattedResults += `Block ${index + 1}:\n`;
      if (result.success) {
        formattedResults += `Output:\n${result.output}\n`;
      } else {
        formattedResults += `Error:\n${result.error || 'Unknown error'}\n`;
      }
      formattedResults += '\n';
    });

    return formattedResults;
  }

  /**
   * Set code executor
   */
  setCodeExecutor(executor: ICodeExecutor): void {
    this.codeExecutor = executor;
  }

  /**
   * Enable or disable auto code execution
   */
  setAutoExecuteCode(enabled: boolean): void {
    this.autoExecuteCode = enabled;
  }
}
