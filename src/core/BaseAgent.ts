import { IAgent, IMessage, IAgentConfig } from './IAgent';
import { IMemory } from './memory';
import { INestedChatAgent, NestedChatOptions, NestedChatResult } from './INestedChat';

/**
 * Base class for all conversable agents
 */
export abstract class BaseAgent implements IAgent, INestedChatAgent {
  public name: string;
  protected systemMessage: string;
  protected conversationHistory: IMessage[];
  protected memory: IMemory[];

  constructor(config: IAgentConfig) {
    this.name = config.name;
    this.systemMessage = config.systemMessage || '';
    this.conversationHistory = [];
    this.memory = config.memory || [];
    
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

  /**
   * Apply memory to messages before sending to LLM.
   * This creates a copy of messages and injects memory context.
   * 
   * @param messages - The original messages
   * @returns Messages with memory context injected
   */
  protected async applyMemoryToMessages(messages: IMessage[]): Promise<IMessage[]> {
    if (!this.memory || this.memory.length === 0) {
      return messages;
    }

    // Create a copy of messages to avoid mutation
    let updatedMessages = [...messages];

    // Apply each memory in order
    for (const mem of this.memory) {
      await mem.updateContext(updatedMessages);
    }

    return updatedMessages;
  }

  /**
   * Add memory to this agent
   * 
   * @param memory - Memory instance to add
   */
  addMemory(memory: IMemory): void {
    this.memory.push(memory);
  }

  /**
   * Get all memory instances
   * 
   * @returns Array of memory instances
   */
  getMemory(): IMemory[] {
    return [...this.memory];
  }

  /**
   * Clear all memory instances
   */
  clearMemory(): void {
    this.memory = [];
  }

  /**
   * Start a nested conversation with another agent
   * This allows an agent to delegate tasks to another agent in a separate conversation context
   * 
   * @param message - Initial message for the nested chat
   * @param recipient - Agent to chat with in the nested conversation
   * @param options - Options for the nested chat
   * @returns Result of the nested conversation including all messages
   */
  async initiateNestedChat(
    message: string | IMessage,
    recipient: IAgent,
    options?: NestedChatOptions
  ): Promise<NestedChatResult> {
    const {
      maxRounds = 10,
      addToParentHistory = false,
      terminationMessage = 'TERMINATE'
    } = options || {};

    const nestedMessages: IMessage[] = [];
    const msg: IMessage = typeof message === 'string'
      ? { role: 'user', content: message, name: this.name }
      : { ...message, name: this.name };

    // Add initial message to nested chat history
    nestedMessages.push(msg);

    let rounds = 0;
    let terminated = false;

    while (rounds < maxRounds) {
      // Get reply from recipient in the nested context
      // Pass only the nested messages, not the parent's history
      const reply = await recipient.generateReply([...nestedMessages]);
      nestedMessages.push(reply);
      rounds++;

      // Check for termination
      if (this.isTerminationMessage(reply) || 
          reply.content.includes(terminationMessage)) {
        terminated = true;
        break;
      }

      // If this agent needs to respond in the nested chat, generate a reply
      // We generate a reply but don't let it affect the parent's conversation history
      if (rounds < maxRounds) {
        // Generate reply in the nested context
        const myReply = await this.generateReply([...nestedMessages]);
        nestedMessages.push(myReply);

        // Check if we should terminate
        if (this.isTerminationMessage(myReply) || 
            myReply.content.includes(terminationMessage)) {
          terminated = true;
          break;
        }
      }
    }

    const finalMessage = nestedMessages[nestedMessages.length - 1];

    // Optionally add nested conversation summary to parent history
    if (addToParentHistory) {
      const summary: IMessage = {
        role: 'assistant',
        content: `[Nested conversation with ${recipient.getName()}]\nResult: ${finalMessage.content}`,
        name: this.name
      };
      this.addToHistory(summary);
    }

    return {
      messages: nestedMessages,
      finalMessage,
      rounds,
      terminated
    };
  }
}
