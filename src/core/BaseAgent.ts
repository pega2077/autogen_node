import { IAgent, IMessage, IAgentConfig } from './IAgent';

/**
 * Base class for all conversable agents
 */
export abstract class BaseAgent implements IAgent {
  public name: string;
  protected systemMessage: string;
  protected conversationHistory: IMessage[];

  constructor(config: IAgentConfig) {
    this.name = config.name;
    this.systemMessage = config.systemMessage || '';
    this.conversationHistory = [];
    
    if (this.systemMessage) {
      this.conversationHistory.push({
        role: 'system',
        content: this.systemMessage
      });
    }
  }

  /**
   * Generate a reply based on the received messages
   */
  abstract generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage>;

  /**
   * Get the agent's name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Add a message to the conversation history
   */
  protected addToHistory(message: IMessage): void {
    this.conversationHistory.push(message);
  }

  /**
   * Get the conversation history
   */
  getConversationHistory(): IMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear the conversation history (except system message)
   */
  clearHistory(): void {
    this.conversationHistory = this.systemMessage 
      ? [{ role: 'system', content: this.systemMessage }]
      : [];
  }

  /**
   * Send a message to another agent and get a reply
   */
  async send(
    message: string | IMessage,
    recipient: IAgent,
    requestReply: boolean = true
  ): Promise<IMessage | null> {
    const msg: IMessage = typeof message === 'string'
      ? { role: 'user', content: message, name: this.name }
      : { ...message, name: this.name };

    this.addToHistory(msg);

    if (requestReply) {
      const reply = await recipient.generateReply([...this.conversationHistory]);
      this.addToHistory(reply);
      return reply;
    }

    return null;
  }

  /**
   * Initiate a chat with another agent
   */
  async initiateChat(
    recipient: IAgent,
    message: string,
    maxRounds: number = 10
  ): Promise<IMessage[]> {
    const chatHistory: IMessage[] = [];
    let currentMessage: string | IMessage = message;
    let rounds = 0;

    while (rounds < maxRounds) {
      // Send message and get reply
      const reply = await this.send(currentMessage, recipient, true);
      
      if (!reply) break;
      
      chatHistory.push(reply);

      // Check for termination
      if (this.isTerminationMessage(reply)) {
        break;
      }

      currentMessage = reply;
      rounds++;
    }

    return chatHistory;
  }

  /**
   * Check if a message indicates termination of the conversation
   */
  protected isTerminationMessage(message: IMessage): boolean {
    const terminationKeywords = ['TERMINATE', 'terminate', 'goodbye', 'bye'];
    return terminationKeywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
}
