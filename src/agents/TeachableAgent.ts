import { ConversableAgent, ConversableAgentConfig } from './ConversableAgent';
import { IMessage } from '../core/IAgent';

/**
 * Teachable memory item
 */
export interface TeachableMemoryItem {
  key: string;
  value: string;
  timestamp: number;
  category?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for TeachableAgent
 */
export interface TeachableAgentConfig extends ConversableAgentConfig {
  teachMode?: boolean;
  memoryStoragePath?: string;
  recallThreshold?: number;
  maxMemoryItems?: number;
  learnFromFeedback?: boolean;
}

/**
 * A conversable agent that can learn from user interactions and remember preferences
 * Similar to Microsoft AutoGen's TeachableAgent
 * 
 * This agent provides:
 * - Learning from user corrections and feedback
 * - Remembering user preferences
 * - Storing and recalling facts
 * - Personalized responses based on learned information
 * - Persistent memory across sessions
 */
export class TeachableAgent extends ConversableAgent {
  private teachMode: boolean;
  private memories: Map<string, TeachableMemoryItem>;
  private recallThreshold: number;
  private maxMemoryItems: number;
  private learnFromFeedback: boolean;
  private memoryStoragePath?: string;

  constructor(config: TeachableAgentConfig) {
    super(config);
    
    this.teachMode = config.teachMode ?? true;
    this.recallThreshold = config.recallThreshold ?? 0.7;
    this.maxMemoryItems = config.maxMemoryItems ?? 1000;
    this.learnFromFeedback = config.learnFromFeedback ?? true;
    this.memoryStoragePath = config.memoryStoragePath;
    this.memories = new Map();

    // Load memories if storage path is provided
    if (this.memoryStoragePath) {
      this.loadMemories().catch(err => {
        console.error('Failed to load memories:', err);
      });
    }
  }

  /**
   * Enable or disable teach mode
   */
  setTeachMode(enabled: boolean): void {
    this.teachMode = enabled;
  }

  /**
   * Check if teach mode is enabled
   */
  isTeachModeEnabled(): boolean {
    return this.teachMode;
  }

  /**
   * Teach the agent a new fact or preference
   */
  async teach(key: string, value: string, category?: string, metadata?: Record<string, any>): Promise<void> {
    const memoryItem: TeachableMemoryItem = {
      key,
      value,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.memories.set(key, memoryItem);

    // Enforce max memory items limit
    if (this.memories.size > this.maxMemoryItems) {
      // Remove oldest item
      const oldestKey = Array.from(this.memories.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.memories.delete(oldestKey);
    }

    // Save to storage if configured
    if (this.memoryStoragePath) {
      await this.saveMemories();
    }
  }

  /**
   * Recall a learned fact or preference
   */
  recall(key: string): TeachableMemoryItem | undefined {
    return this.memories.get(key);
  }

  /**
   * Search memories by category
   */
  recallByCategory(category: string): TeachableMemoryItem[] {
    return Array.from(this.memories.values())
      .filter(item => item.category === category);
  }

  /**
   * Search memories by keyword (simple text search)
   */
  searchMemories(keyword: string): TeachableMemoryItem[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.memories.values())
      .filter(item => 
        item.key.toLowerCase().includes(lowerKeyword) ||
        item.value.toLowerCase().includes(lowerKeyword)
      );
  }

  /**
   * Get all memories
   */
  getAllMemories(): TeachableMemoryItem[] {
    return Array.from(this.memories.values());
  }

  /**
   * Clear all memories
   */
  async clearMemories(): Promise<void> {
    this.memories.clear();
    
    if (this.memoryStoragePath) {
      await this.saveMemories();
    }
  }

  /**
   * Delete a specific memory
   */
  async forgetMemory(key: string): Promise<void> {
    this.memories.delete(key);
    
    if (this.memoryStoragePath) {
      await this.saveMemories();
    }
  }

  /**
   * Extract learning opportunities from messages
   */
  private extractLearningFromMessage(message: string): Array<{ key: string; value: string; category?: string }> {
    const learnings: Array<{ key: string; value: string; category?: string }> = [];
    
    // Detect preference statements
    const preferencePatterns = [
      /I prefer (.*?) (?:over|to|rather than) (.*?)(?:\.|$)/gi,
      /I like (.*?)(?:\.|$)/gi,
      /I don't like (.*?)(?:\.|$)/gi,
      /My favorite (.*?) is (.*?)(?:\.|$)/gi,
      /Remember that (.*?)(?:\.|$)/gi,
      /Keep in mind that (.*?)(?:\.|$)/gi,
      /Note that (.*?)(?:\.|$)/gi
    ];

    for (const pattern of preferencePatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        if (match[1]) {
          learnings.push({
            key: match[0].trim(),
            value: match[0].trim(),
            category: 'user_preference'
          });
        }
      }
    }

    // Detect facts
    const factPatterns = [
      /My name is (.*?)(?:\.|$)/gi,
      /I am (a|an) (.*?)(?:\.|$)/gi,
      /I work (?:at|for) (.*?)(?:\.|$)/gi,
      /I live in (.*?)(?:\.|$)/gi
    ];

    for (const pattern of factPatterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        if (match[1]) {
          learnings.push({
            key: match[0].trim(),
            value: match[0].trim(),
            category: 'user_fact'
          });
        }
      }
    }

    return learnings;
  }

  /**
   * Build context from relevant memories
   */
  private buildMemoryContext(message: string): string {
    // Search for relevant memories
    const words = message.toLowerCase().split(/\s+/);
    const relevantMemories = new Set<TeachableMemoryItem>();

    for (const word of words) {
      if (word.length < 3) continue; // Skip short words
      
      const matches = this.searchMemories(word);
      matches.forEach(mem => relevantMemories.add(mem));
    }

    if (relevantMemories.size === 0) {
      return '';
    }

    // Build context string
    let context = '\n\n## What I Remember About You:\n';
    const sortedMemories = Array.from(relevantMemories)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5); // Limit to 5 most relevant memories

    for (const memory of sortedMemories) {
      context += `- ${memory.value}\n`;
    }

    return context;
  }

  /**
   * Generate a reply with teachable capabilities
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const lastMessage = messages[messages.length - 1];

    // Learn from the user's message if teach mode is enabled
    if (this.teachMode && lastMessage.role === 'user') {
      const learnings = this.extractLearningFromMessage(lastMessage.content);
      
      for (const learning of learnings) {
        await this.teach(learning.key, learning.value, learning.category);
      }
    }

    // Augment the message with relevant memories
    let augmentedMessages = [...messages];
    if (this.memories.size > 0 && lastMessage.role === 'user') {
      const memoryContext = this.buildMemoryContext(lastMessage.content);
      
      if (memoryContext) {
        // Add memory context as a system message
        const contextMessage: IMessage = {
          role: 'system',
          content: memoryContext
        };
        
        // Insert context before the last user message
        augmentedMessages = [
          ...messages.slice(0, -1),
          contextMessage,
          lastMessage
        ];
      }
    }

    // Generate reply with parent's implementation
    return super.generateReply(augmentedMessages, cancellationToken);
  }

  /**
   * Save memories to file storage
   */
  private async saveMemories(): Promise<void> {
    if (!this.memoryStoragePath) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const memoriesArray = Array.from(this.memories.entries()).map(([key, value]) => ({
        key,
        ...value
      }));
      
      await fs.writeFile(
        this.memoryStoragePath,
        JSON.stringify(memoriesArray, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save memories:', error);
    }
  }

  /**
   * Load memories from file storage
   */
  private async loadMemories(): Promise<void> {
    if (!this.memoryStoragePath) {
      return;
    }

    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.memoryStoragePath, 'utf-8');
      const memoriesArray = JSON.parse(data);
      
      this.memories.clear();
      for (const item of memoriesArray) {
        this.memories.set(item.key, {
          key: item.key,
          value: item.value,
          timestamp: item.timestamp,
          category: item.category,
          metadata: item.metadata
        });
      }
    } catch (error) {
      // File might not exist yet, which is fine
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to load memories:', error);
      }
    }
  }

  /**
   * Export memories as JSON
   */
  exportMemories(): string {
    const memoriesArray = Array.from(this.memories.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
    return JSON.stringify(memoriesArray, null, 2);
  }

  /**
   * Import memories from JSON
   */
  async importMemories(jsonData: string): Promise<void> {
    try {
      const memoriesArray = JSON.parse(jsonData);
      
      for (const item of memoriesArray) {
        this.memories.set(item.key, {
          key: item.key,
          value: item.value,
          timestamp: item.timestamp,
          category: item.category,
          metadata: item.metadata
        });
      }

      if (this.memoryStoragePath) {
        await this.saveMemories();
      }
    } catch (error) {
      throw new Error(`Failed to import memories: ${error}`);
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalMemories: number;
    categoryCounts: Record<string, number>;
    oldestMemory?: number;
    newestMemory?: number;
  } {
    const stats: any = {
      totalMemories: this.memories.size,
      categoryCounts: {}
    };

    if (this.memories.size === 0) {
      return stats;
    }

    const memories = Array.from(this.memories.values());
    
    // Count by category
    for (const memory of memories) {
      const category = memory.category || 'uncategorized';
      stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
    }

    // Get oldest and newest
    const timestamps = memories.map(m => m.timestamp);
    stats.oldestMemory = Math.min(...timestamps);
    stats.newestMemory = Math.max(...timestamps);

    return stats;
  }
}
