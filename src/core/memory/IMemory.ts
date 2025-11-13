import { IMessage } from '../IAgent';
import { MemoryContent, MemoryQueryResult, UpdateContextResult } from './MemoryContent';

/**
 * Protocol defining the interface for memory implementations.
 * 
 * A memory is the storage for data that can be used to enrich or modify the model context.
 * 
 * A memory implementation can use any storage mechanism, such as a list, a database, or a file system.
 * It can also use any retrieval mechanism, such as vector search or text search.
 * It is up to the implementation to decide how to store and retrieve data.
 * 
 * It is also a memory implementation's responsibility to update the model context
 * with relevant memory content based on the current model context and querying the memory store.
 */
export interface IMemory {
  /**
   * Get the memory instance name
   */
  readonly name: string;

  /**
   * Update the provided model context using relevant memory content.
   * 
   * @param messages - Current conversation messages
   * @returns UpdateContextResult containing relevant memories and updated messages
   */
  updateContext(messages: IMessage[]): Promise<UpdateContextResult>;

  /**
   * Query the memory store and return relevant entries.
   * 
   * @param query - Query content item or string
   * @param cancellationToken - Optional abort signal to cancel operation
   * @returns MemoryQueryResult containing memory entries
   */
  query(
    query: string | MemoryContent,
    cancellationToken?: AbortSignal
  ): Promise<MemoryQueryResult>;

  /**
   * Add a new content to memory.
   * 
   * @param content - The memory content to add
   * @param cancellationToken - Optional abort signal to cancel operation
   */
  add(content: MemoryContent, cancellationToken?: AbortSignal): Promise<void>;

  /**
   * Clear all entries from memory.
   */
  clear(): Promise<void>;

  /**
   * Clean up any resources used by the memory implementation.
   */
  close(): Promise<void>;
}
