import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig } from '../core/IAgent';
import OpenAI from 'openai';

/**
 * Configuration for GPTAssistantAgent
 */
export interface GPTAssistantAgentConfig extends IAgentConfig {
  apiKey: string;
  assistantId?: string;
  model?: string;
  instructions?: string;
  tools?: Array<{
    type: 'code_interpreter' | 'retrieval' | 'function';
    function?: {
      name: string;
      description: string;
      parameters: Record<string, any>;
    };
  }>;
  fileIds?: string[];
  metadata?: Record<string, string>;
}

/**
 * An agent that integrates with OpenAI's Assistant API
 * Similar to Microsoft AutoGen's GPTAssistantAgent
 * 
 * This agent provides:
 * - Integration with OpenAI Assistant API
 * - Persistent assistant instances
 * - Built-in tools (code interpreter, retrieval)
 * - Thread-based conversation management
 * - File handling capabilities
 */
export class GPTAssistantAgent extends BaseAgent {
  private openai: OpenAI;
  private assistantId?: string;
  private assistant?: OpenAI.Beta.Assistants.Assistant;
  private threadId?: string;
  private model: string;
  private instructions: string;
  private tools: Array<any>;
  private fileIds: string[];
  private metadata: Record<string, string>;

  constructor(config: GPTAssistantAgentConfig) {
    super(config);
    
    this.openai = new OpenAI({
      apiKey: config.apiKey
    });

    this.assistantId = config.assistantId;
    this.model = config.model || 'gpt-4-turbo-preview';
    this.instructions = config.instructions || config.systemMessage || 'You are a helpful assistant.';
    this.tools = config.tools || [];
    this.fileIds = config.fileIds || [];
    this.metadata = config.metadata || {};
  }

  /**
   * Initialize or retrieve the assistant
   */
  private async ensureAssistant(): Promise<void> {
    if (this.assistant) {
      return;
    }

    if (this.assistantId) {
      // Retrieve existing assistant
      try {
        this.assistant = await this.openai.beta.assistants.retrieve(this.assistantId);
      } catch (error) {
        throw new Error(`Failed to retrieve assistant ${this.assistantId}: ${error}`);
      }
    } else {
      // Create new assistant
      try {
        this.assistant = await this.openai.beta.assistants.create({
          name: this.name,
          model: this.model,
          instructions: this.instructions,
          tools: this.tools as any,
          // file_ids deprecated in OpenAI API v4+
          // Use tool_resources instead if needed
          metadata: this.metadata
        });
        this.assistantId = this.assistant.id;
      } catch (error) {
        throw new Error(`Failed to create assistant: ${error}`);
      }
    }
  }

  /**
   * Ensure a thread exists for the conversation
   */
  private async ensureThread(): Promise<void> {
    if (this.threadId) {
      return;
    }

    try {
      const thread = await this.openai.beta.threads.create();
      this.threadId = thread.id;
    } catch (error) {
      throw new Error(`Failed to create thread: ${error}`);
    }
  }

  /**
   * Generate a reply using OpenAI Assistant API
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    try {
      // Ensure assistant and thread are initialized
      await this.ensureAssistant();
      await this.ensureThread();

      if (!this.threadId || !this.assistantId) {
        throw new Error('Thread or Assistant not initialized');
      }

      // Get the last message
      const lastMessage = messages[messages.length - 1];
      
      // Add user message to thread
      await this.openai.beta.threads.messages.create(this.threadId, {
        role: 'user',
        content: lastMessage.content
      });

      // Run the assistant
      const run = await this.openai.beta.threads.runs.create(this.threadId, {
        assistant_id: this.assistantId
      });

      // Wait for completion
      let runStatus = await this.openai.beta.threads.runs.retrieve(
        run.id,
        { thread_id: this.threadId }
      );

      // Poll for completion
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (cancellationToken?.aborted) {
          await this.openai.beta.threads.runs.cancel(run.id, { thread_id: this.threadId });
          throw new Error('Request was cancelled');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openai.beta.threads.runs.retrieve(
          run.id,
          { thread_id: this.threadId }
        );
      }

      // Handle run status
      if (runStatus.status === 'failed') {
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message}`);
      }

      if (runStatus.status === 'requires_action') {
        // Handle function calls if needed
        // For now, we'll just return a message indicating this
        const reply: IMessage = {
          role: 'assistant',
          content: 'Function calling required but not implemented in this context.',
          name: this.name
        };
        this.addToHistory(reply);
        return reply;
      }

      // Retrieve messages from the thread
      const threadMessages = await this.openai.beta.threads.messages.list(
        this.threadId,
        { limit: 1, order: 'desc' }
      );

      const assistantMessage = threadMessages.data[0];
      
      if (!assistantMessage || assistantMessage.role !== 'assistant') {
        throw new Error('No assistant message found');
      }

      // Extract text content
      let content = '';
      for (const contentBlock of assistantMessage.content) {
        if (contentBlock.type === 'text') {
          content += contentBlock.text.value;
        }
      }

      const reply: IMessage = {
        role: 'assistant',
        content,
        name: this.name
      };

      this.addToHistory(reply);
      return reply;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate reply: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the assistant ID
   */
  getAssistantId(): string | undefined {
    return this.assistantId;
  }

  /**
   * Get the thread ID
   */
  getThreadId(): string | undefined {
    return this.threadId;
  }

  /**
   * Create a new thread (reset conversation)
   */
  async resetThread(): Promise<void> {
    this.threadId = undefined;
    this.clearHistory();
    await this.ensureThread();
  }

  /**
   * Update assistant configuration
   */
  async updateAssistant(updates: {
    name?: string;
    model?: string;
    instructions?: string;
    tools?: Array<any>;
    file_ids?: string[];
    metadata?: Record<string, string>;
  }): Promise<void> {
    await this.ensureAssistant();
    
    if (!this.assistantId) {
      throw new Error('Assistant not initialized');
    }

    try {
      this.assistant = await this.openai.beta.assistants.update(
        this.assistantId,
        updates as any
      );
    } catch (error) {
      throw new Error(`Failed to update assistant: ${error}`);
    }
  }

  /**
   * Delete the assistant
   */
  async deleteAssistant(): Promise<void> {
    if (!this.assistantId) {
      return;
    }

    try {
      await this.openai.beta.assistants.delete(this.assistantId);
      this.assistant = undefined;
      this.assistantId = undefined;
    } catch (error) {
      throw new Error(`Failed to delete assistant: ${error}`);
    }
  }

  /**
   * Upload a file to OpenAI for use with the assistant
   */
  async uploadFile(filePath: string, purpose: 'assistants' = 'assistants'): Promise<string> {
    try {
      const fs = require('fs');
      const file = await this.openai.files.create({
        file: fs.createReadStream(filePath),
        purpose
      });
      return file.id;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error}`);
    }
  }

  /**
   * Add a file to the assistant
   */
  async addFile(fileId: string): Promise<void> {
    await this.ensureAssistant();
    
    if (!this.assistantId) {
      throw new Error('Assistant not initialized');
    }

    this.fileIds.push(fileId);

    try {
      // file_ids deprecated in OpenAI API v4+
      // Use tool_resources instead if needed
      await this.openai.beta.assistants.update(this.assistantId, {
        // file_ids: this.fileIds
      });
    } catch (error) {
      throw new Error(`Failed to add file to assistant: ${error}`);
    }
  }

  /**
   * Remove a file from the assistant
   */
  async removeFile(fileId: string): Promise<void> {
    await this.ensureAssistant();
    
    if (!this.assistantId) {
      throw new Error('Assistant not initialized');
    }

    this.fileIds = this.fileIds.filter(id => id !== fileId);

    try {
      // file_ids deprecated in OpenAI API v4+
      // Use tool_resources instead if needed
      await this.openai.beta.assistants.update(this.assistantId, {
        // file_ids: this.fileIds
      });
    } catch (error) {
      throw new Error(`Failed to remove file from assistant: ${error}`);
    }
  }
}
