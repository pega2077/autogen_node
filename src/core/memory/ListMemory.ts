import { IMessage } from '../IAgent';
import { IMemory } from './IMemory';
import { MemoryContent, MemoryQueryResult, UpdateContextResult } from './MemoryContent';

/**
 * Configuration for ListMemory
 */
export interface ListMemoryConfig {
  /**
   * Optional identifier for this memory instance
   */
  name?: string;

  /**
   * Initial memory contents
   */
  memoryContents?: MemoryContent[];
}

/**
 * Simple chronological list-based memory implementation.
 * 
 * This memory implementation stores contents in a list and retrieves them in
 * chronological order. It has an `updateContext` method that updates model contexts
 * by appending all stored memories.
 * 
 * The memory content can be directly accessed and modified through the content property,
 * allowing external applications to manage memory contents directly.
 * 
 * Example:
 * ```typescript
 * const memory = new ListMemory({ name: 'chat_history' });
 * 
 * // Add memory content
 * await memory.add({
 *   content: 'User prefers formal language',
 *   mimeType: MemoryMimeType.TEXT
 * });
 * 
 * // Directly modify memory contents
 * memory.content = [{
 *   content: 'New preference',
 *   mimeType: MemoryMimeType.TEXT
 * }];
 * 
 * // Update context with memory
 * const result = await memory.updateContext(messages);
 * ```
 */
export class ListMemory implements IMemory {
  private _name: string;
  private _contents: MemoryContent[];

  constructor(config?: ListMemoryConfig) {
    this._name = config?.name || 'default_list_memory';
    this._contents = config?.memoryContents || [];
  }

  /**
   * Get the memory instance identifier
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the current memory contents
   */
  get content(): MemoryContent[] {
    return this._contents;
  }

  /**
   * Set the memory contents
   */
  set content(value: MemoryContent[]) {
    this._contents = value;
  }

  /**
   * Update the model context by appending memory content.
   * 
   * This method returns updated messages with memory context injected as a system message.
   * 
   * @param messages - The current conversation messages
   * @returns UpdateContextResult containing the memories and updated messages
   */
  async updateContext(messages: IMessage[]): Promise<UpdateContextResult> {
    if (this._contents.length === 0) {
      return {
        memories: { results: [] }
      };
    }

    const memoryStrings = this._contents.map((memory, index) => {
      let contentStr: string;
      if (typeof memory.content === 'string') {
        contentStr = memory.content;
      } else if (typeof memory.content === 'object' && !(memory.content instanceof Buffer)) {
        contentStr = JSON.stringify(memory.content);
      } else {
        contentStr = String(memory.content);
      }
      return `${index + 1}. ${contentStr}`;
    });

    if (memoryStrings.length > 0) {
      const memoryContext = 
        '\nRelevant memory content (in chronological order):\n' +
        memoryStrings.join('\n') +
        '\n';

      // Add memory context as a system message at the beginning (after any existing system message)
      const systemMessageIndex = messages.findIndex(m => m.role === 'system');
      
      if (systemMessageIndex >= 0) {
        // Append to existing system message
        messages[systemMessageIndex] = {
          ...messages[systemMessageIndex],
          content: messages[systemMessageIndex].content + '\n' + memoryContext
        };
      } else {
        // Insert new system message at the beginning
        messages.unshift({
          role: 'system',
          content: memoryContext
        });
      }
    }

    return {
      memories: { results: [...this._contents] }
    };
  }

  /**
   * Return all memories without any filtering.
   * 
   * @param query - Ignored in this implementation
   * @param cancellationToken - Optional abort signal to cancel operation
   * @returns MemoryQueryResult containing all stored memories
   */
  async query(
    query: string | MemoryContent = '',
    cancellationToken?: AbortSignal
  ): Promise<MemoryQueryResult> {
    return {
      results: [...this._contents]
    };
  }

  /**
   * Add new content to memory.
   * 
   * @param content - Memory content to store
   * @param cancellationToken - Optional abort signal to cancel operation
   */
  async add(content: MemoryContent, cancellationToken?: AbortSignal): Promise<void> {
    this._contents.push(content);
  }

  /**
   * Clear all memory content
   */
  async clear(): Promise<void> {
    this._contents = [];
  }

  /**
   * Cleanup resources if needed
   */
  async close(): Promise<void> {
    // No cleanup needed for list-based memory
  }
}
