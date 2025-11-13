import { ConversableAgent, ConversableAgentConfig } from './ConversableAgent';
import { IMessage } from '../core/IAgent';

/**
 * Compression strategy types
 */
export type CompressionStrategy = 'summarize' | 'truncate' | 'sliding_window' | 'hybrid';

/**
 * Configuration for CompressibleAgent
 */
export interface CompressibleAgentConfig extends ConversableAgentConfig {
  compressionStrategy?: CompressionStrategy;
  maxMessages?: number;
  compressionTrigger?: number;
  summaryPrompt?: string;
  preserveSystemMessage?: boolean;
  preserveRecentMessages?: number;
}

/**
 * A conversable agent that can compress conversation history for long dialogues
 * Similar to Microsoft AutoGen's CompressibleAgent
 * 
 * This agent provides:
 * - Automatic conversation history compression
 * - Multiple compression strategies (summarize, truncate, sliding window)
 * - Configurable compression triggers
 * - Preservation of important context
 * - Memory-efficient long conversations
 */
export class CompressibleAgent extends ConversableAgent {
  private compressionStrategy: CompressionStrategy;
  private maxMessages: number;
  private compressionTrigger: number;
  private summaryPrompt: string;
  private preserveSystemMessage: boolean;
  private preserveRecentMessages: number;
  private compressionCount: number = 0;

  constructor(config: CompressibleAgentConfig) {
    super(config);
    
    this.compressionStrategy = config.compressionStrategy || 'summarize';
    this.maxMessages = config.maxMessages || 100;
    this.compressionTrigger = config.compressionTrigger || 50;
    this.preserveSystemMessage = config.preserveSystemMessage ?? true;
    this.preserveRecentMessages = config.preserveRecentMessages || 10;
    
    this.summaryPrompt = config.summaryPrompt || 
      'Please provide a concise summary of the conversation so far, ' +
      'capturing the key points, decisions, and context that would be ' +
      'important to remember for continuing the conversation.';
  }

  /**
   * Check if compression is needed
   */
  private shouldCompress(): boolean {
    const history = this.getConversationHistory();
    return history.length >= this.compressionTrigger;
  }

  /**
   * Compress conversation history using summarization
   */
  private async compressBySummarize(): Promise<void> {
    const history = this.getConversationHistory();
    
    // Separate system messages and conversation
    const systemMessages = this.preserveSystemMessage 
      ? history.filter(msg => msg.role === 'system')
      : [];
    
    const conversationMessages = history.filter(msg => msg.role !== 'system');
    
    // Keep recent messages
    const recentMessages = conversationMessages.slice(-this.preserveRecentMessages);
    
    // Messages to summarize (everything except recent)
    const toSummarize = conversationMessages.slice(0, -this.preserveRecentMessages);
    
    if (toSummarize.length === 0) {
      return; // Nothing to compress
    }

    // Create summary prompt
    const summaryRequest: IMessage = {
      role: 'user',
      content: this.summaryPrompt
    };

    // Generate summary using LLM if available
    let summary: string;
    if (this.hasLLM()) {
      const summaryMessages = [...toSummarize, summaryRequest];
      const summaryReply = await super.generateReply(summaryMessages);
      summary = summaryReply.content;
    } else {
      // Fallback to simple concatenation
      summary = this.createSimpleSummary(toSummarize);
    }

    // Create compressed history
    const compressedHistory: IMessage[] = [
      ...systemMessages,
      {
        role: 'system',
        content: `## Conversation Summary (${this.compressionCount + 1}):\n${summary}`
      },
      ...recentMessages
    ];

    // Replace conversation history
    this.replaceHistory(compressedHistory);
    this.compressionCount++;
  }

  /**
   * Compress conversation history by truncating old messages
   */
  private compressByTruncate(): void {
    const history = this.getConversationHistory();
    
    const systemMessages = this.preserveSystemMessage 
      ? history.filter(msg => msg.role === 'system')
      : [];
    
    const conversationMessages = history.filter(msg => msg.role !== 'system');
    const recentMessages = conversationMessages.slice(-this.maxMessages);
    
    const compressedHistory: IMessage[] = [
      ...systemMessages,
      ...recentMessages
    ];

    this.replaceHistory(compressedHistory);
    this.compressionCount++;
  }

  /**
   * Compress using sliding window approach
   */
  private compressBySlidingWindow(): void {
    const history = this.getConversationHistory();
    
    const systemMessages = this.preserveSystemMessage 
      ? history.filter(msg => msg.role === 'system')
      : [];
    
    const conversationMessages = history.filter(msg => msg.role !== 'system');
    
    // Keep a fixed window of recent messages
    const windowSize = Math.floor(this.maxMessages * 0.7);
    const recentMessages = conversationMessages.slice(-windowSize);
    
    const compressedHistory: IMessage[] = [
      ...systemMessages,
      ...recentMessages
    ];

    this.replaceHistory(compressedHistory);
    this.compressionCount++;
  }

  /**
   * Compress using hybrid approach (truncate + summarize)
   */
  private async compressByHybrid(): Promise<void> {
    const history = this.getConversationHistory();
    
    const systemMessages = this.preserveSystemMessage 
      ? history.filter(msg => msg.role === 'system')
      : [];
    
    const conversationMessages = history.filter(msg => msg.role !== 'system');
    
    // Split into old and recent
    const splitPoint = Math.floor(conversationMessages.length / 2);
    const oldMessages = conversationMessages.slice(0, splitPoint);
    const recentMessages = conversationMessages.slice(splitPoint);
    
    // Summarize old messages
    let summary: string;
    if (this.hasLLM() && oldMessages.length > 0) {
      const summaryRequest: IMessage = {
        role: 'user',
        content: this.summaryPrompt
      };
      const summaryMessages = [...oldMessages, summaryRequest];
      const summaryReply = await super.generateReply(summaryMessages);
      summary = summaryReply.content;
    } else {
      summary = this.createSimpleSummary(oldMessages);
    }

    const compressedHistory: IMessage[] = [
      ...systemMessages,
      {
        role: 'system',
        content: `## Conversation Summary:\n${summary}`
      },
      ...recentMessages
    ];

    this.replaceHistory(compressedHistory);
    this.compressionCount++;
  }

  /**
   * Create a simple text summary when LLM is not available
   */
  private createSimpleSummary(messages: IMessage[]): string {
    const messageCount = messages.length;
    const roles = messages.map(m => m.role).join(', ');
    const preview = messages.slice(0, 3).map(m => `${m.role}: ${m.content.substring(0, 50)}...`).join('\n');
    
    return `This summary covers ${messageCount} messages from the earlier conversation.\n` +
           `Participants: ${roles}\n` +
           `Preview of early messages:\n${preview}`;
  }

  /**
   * Replace conversation history
   */
  private replaceHistory(newHistory: IMessage[]): void {
    this.clearHistory();
    for (const msg of newHistory) {
      this['addToHistory'](msg);
    }
  }

  /**
   * Perform compression based on configured strategy
   */
  private async performCompression(): Promise<void> {
    switch (this.compressionStrategy) {
      case 'summarize':
        await this.compressBySummarize();
        break;
      case 'truncate':
        this.compressByTruncate();
        break;
      case 'sliding_window':
        this.compressBySlidingWindow();
        break;
      case 'hybrid':
        await this.compressByHybrid();
        break;
      default:
        this.compressByTruncate();
    }
  }

  /**
   * Generate a reply with automatic compression
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    // Check if compression is needed before generating reply
    if (this.shouldCompress()) {
      await this.performCompression();
    }

    // Generate reply with parent's implementation
    const reply = await super.generateReply(messages, cancellationToken);

    // Check if compression is needed after generating reply
    if (this.shouldCompress()) {
      await this.performCompression();
    }

    return reply;
  }

  /**
   * Manually trigger compression
   */
  async compress(): Promise<void> {
    await this.performCompression();
  }

  /**
   * Set compression strategy
   */
  setCompressionStrategy(strategy: CompressionStrategy): void {
    this.compressionStrategy = strategy;
  }

  /**
   * Get current compression strategy
   */
  getCompressionStrategy(): CompressionStrategy {
    return this.compressionStrategy;
  }

  /**
   * Set max messages threshold
   */
  setMaxMessages(max: number): void {
    this.maxMessages = max;
  }

  /**
   * Set compression trigger threshold
   */
  setCompressionTrigger(trigger: number): void {
    this.compressionTrigger = trigger;
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): {
    compressionCount: number;
    currentMessageCount: number;
    strategy: CompressionStrategy;
    maxMessages: number;
    compressionTrigger: number;
  } {
    return {
      compressionCount: this.compressionCount,
      currentMessageCount: this.getConversationHistory().length,
      strategy: this.compressionStrategy,
      maxMessages: this.maxMessages,
      compressionTrigger: this.compressionTrigger
    };
  }

  /**
   * Reset compression count
   */
  resetCompressionCount(): void {
    this.compressionCount = 0;
  }

  /**
   * Set the number of recent messages to preserve during compression
   */
  setPreserveRecentMessages(count: number): void {
    this.preserveRecentMessages = count;
  }

  /**
   * Get the number of recent messages preserved during compression
   */
  getPreserveRecentMessages(): number {
    return this.preserveRecentMessages;
  }
}
