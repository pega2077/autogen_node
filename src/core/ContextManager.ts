import { IMessage } from './IAgent';

/**
 * Strategy for compressing conversation history
 */
export enum CompressionStrategy {
  /** Keep only the most recent N messages */
  TRUNCATE_OLDEST = 'truncate_oldest',
  /** Summarize old messages using LLM */
  SUMMARIZE = 'summarize',
  /** Keep first and last N messages, compress middle */
  BOOKEND = 'bookend',
  /** Keep only important messages (system, function results) */
  SELECTIVE = 'selective'
}

/**
 * Configuration for context manager
 */
export interface ContextManagerConfig {
  /** Maximum number of messages to keep */
  maxMessages?: number;
  /** Maximum total tokens (approximate) */
  maxTokens?: number;
  /** Compression strategy to use */
  strategy?: CompressionStrategy;
  /** Always preserve system messages */
  preserveSystem?: boolean;
  /** Always preserve function calls and results */
  preserveFunctions?: boolean;
}

/**
 * Result from context compression
 */
export interface CompressionResult {
  /** Compressed messages */
  messages: IMessage[];
  /** Number of messages removed */
  messagesRemoved: number;
  /** Estimated tokens saved */
  tokensSaved: number;
  /** Summary message (if applicable) */
  summary?: string;
}

/**
 * Context Manager for handling long conversation histories
 */
export class ContextManager {
  private config: Required<ContextManagerConfig>;

  constructor(config: ContextManagerConfig = {}) {
    this.config = {
      maxMessages: config.maxMessages ?? 50,
      maxTokens: config.maxTokens ?? 4000,
      strategy: config.strategy ?? CompressionStrategy.TRUNCATE_OLDEST,
      preserveSystem: config.preserveSystem ?? true,
      preserveFunctions: config.preserveFunctions ?? true
    };
  }

  /**
   * Compress messages if they exceed limits
   */
  compress(messages: IMessage[]): CompressionResult {
    if (messages.length <= this.config.maxMessages) {
      const estimatedTokens = this.estimateTokens(messages);
      if (estimatedTokens <= this.config.maxTokens) {
        return {
          messages,
          messagesRemoved: 0,
          tokensSaved: 0
        };
      }
    }

    // Apply compression strategy
    switch (this.config.strategy) {
      case CompressionStrategy.TRUNCATE_OLDEST:
        return this.truncateOldest(messages);
      case CompressionStrategy.SELECTIVE:
        return this.selectiveCompression(messages);
      case CompressionStrategy.BOOKEND:
        return this.bookendCompression(messages);
      default:
        return this.truncateOldest(messages);
    }
  }

  /**
   * Truncate oldest messages, keeping system and important messages
   */
  private truncateOldest(messages: IMessage[]): CompressionResult {
    const systemMessages: IMessage[] = [];
    const otherMessages: IMessage[] = [];
    const functionMessages: IMessage[] = [];

    // Separate messages by type
    messages.forEach(msg => {
      if (this.config.preserveSystem && msg.role === 'system') {
        systemMessages.push(msg);
      } else if (this.config.preserveFunctions && (msg.role === 'function' || msg.role === 'tool' || msg.toolCalls)) {
        functionMessages.push(msg);
      } else {
        otherMessages.push(msg);
      }
    });

    // Calculate how many messages we can keep
    const preservedCount = systemMessages.length + functionMessages.length;
    const availableSlots = Math.max(0, this.config.maxMessages - preservedCount);

    // Keep only the most recent messages
    const recentMessages = otherMessages.slice(-availableSlots);
    const removedCount = otherMessages.length - recentMessages.length;

    // Estimate tokens saved
    const removedMessages = otherMessages.slice(0, -availableSlots || undefined);
    const tokensSaved = this.estimateTokens(removedMessages);

    // Combine in order: system, recent messages, function messages
    const compressed = [
      ...systemMessages,
      ...recentMessages,
      ...functionMessages
    ];

    return {
      messages: compressed,
      messagesRemoved: removedCount,
      tokensSaved
    };
  }

  /**
   * Selective compression - keep only important messages
   */
  private selectiveCompression(messages: IMessage[]): CompressionResult {
    const important: IMessage[] = [];
    const removed: IMessage[] = [];

    messages.forEach(msg => {
      // Keep system messages
      if (msg.role === 'system') {
        important.push(msg);
        return;
      }

      // Keep function calls and results
      if (msg.role === 'function' || msg.role === 'tool' || msg.toolCalls || msg.toolCallId) {
        important.push(msg);
        return;
      }

      // Keep messages with significant length (likely important)
      if (msg.content.length > 100) {
        important.push(msg);
        return;
      }

      // Keep recent messages
      const position = messages.indexOf(msg);
      if (position >= messages.length - 10) {
        important.push(msg);
        return;
      }

      removed.push(msg);
    });

    return {
      messages: important,
      messagesRemoved: removed.length,
      tokensSaved: this.estimateTokens(removed)
    };
  }

  /**
   * Bookend compression - keep first and last N messages
   */
  private bookendCompression(messages: IMessage[]): CompressionResult {
    if (messages.length <= this.config.maxMessages) {
      return {
        messages,
        messagesRemoved: 0,
        tokensSaved: 0
      };
    }

    const bookendSize = Math.floor(this.config.maxMessages / 2);
    const firstMessages = messages.slice(0, bookendSize);
    const lastMessages = messages.slice(-bookendSize);
    const middleMessages = messages.slice(bookendSize, -bookendSize);

    // Create a summary message
    const summary: IMessage = {
      role: 'system',
      content: `[${middleMessages.length} messages compressed]`
    };

    const compressed = [
      ...firstMessages,
      summary,
      ...lastMessages
    ];

    return {
      messages: compressed,
      messagesRemoved: middleMessages.length,
      tokensSaved: this.estimateTokens(middleMessages),
      summary: summary.content
    };
  }

  /**
   * Estimate token count for messages
   * Uses a simple approximation: ~4 characters per token
   */
  private estimateTokens(messages: IMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      return sum + msg.content.length + (msg.name?.length || 0);
    }, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Check if messages need compression
   */
  needsCompression(messages: IMessage[]): boolean {
    if (messages.length > this.config.maxMessages) {
      return true;
    }
    const estimatedTokens = this.estimateTokens(messages);
    return estimatedTokens > this.config.maxTokens;
  }

  /**
   * Get compression statistics
   */
  getStats(messages: IMessage[]): {
    messageCount: number;
    estimatedTokens: number;
    needsCompression: boolean;
  } {
    return {
      messageCount: messages.length,
      estimatedTokens: this.estimateTokens(messages),
      needsCompression: this.needsCompression(messages)
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ContextManagerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    } as Required<ContextManagerConfig>;
  }
}
