/**
 * Supported MIME types for memory content
 */
export enum MemoryMimeType {
  TEXT = 'text/plain',
  JSON = 'application/json',
  MARKDOWN = 'text/markdown',
  IMAGE = 'image/*',
  BINARY = 'application/octet-stream'
}

/**
 * Content type for memory items
 */
export type ContentType = string | Buffer | Record<string, any>;

/**
 * A memory content item
 */
export interface MemoryContent {
  /**
   * The content of the memory item. It can be a string, Buffer, or object.
   */
  content: ContentType;

  /**
   * The MIME type of the memory content
   */
  mimeType: MemoryMimeType | string;

  /**
   * Metadata associated with the memory item
   */
  metadata?: Record<string, any>;
}

/**
 * Result of a memory query operation
 */
export interface MemoryQueryResult {
  /**
   * List of memory content items
   */
  results: MemoryContent[];
}

/**
 * Result of a memory update context operation
 */
export interface UpdateContextResult {
  /**
   * Memories that were used to update the context
   */
  memories: MemoryQueryResult;
}
