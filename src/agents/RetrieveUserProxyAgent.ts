import { BaseAgent } from '../core/BaseAgent';
import { IMessage, IAgentConfig } from '../core/IAgent';
import { ICodeExecutor, ICodeBlock } from '../core/ICodeExecutor';

/**
 * Document chunk for retrieval
 */
export interface DocumentChunk {
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

/**
 * Retrieval function interface
 * Takes a query and returns relevant document chunks
 */
export type RetrievalFunction = (query: string, nResults?: number) => Promise<DocumentChunk[]>;

/**
 * Configuration for RetrieveUserProxyAgent
 */
export interface RetrieveUserProxyAgentConfig extends IAgentConfig {
  humanInputMode?: 'ALWAYS' | 'TERMINATE' | 'NEVER';
  isTerminationMsg?: (message: IMessage) => boolean;
  codeExecutor?: ICodeExecutor;
  autoExecuteCode?: boolean;
  retrieveConfig?: {
    task?: 'code' | 'qa' | 'default';
    vectorDb?: any; // Reference to vector database instance
    retrievalFunction?: RetrievalFunction;
    nResults?: number;
    distanceThreshold?: number;
    updateContext?: boolean;
  };
}

/**
 * A user proxy agent with Retrieval-Augmented Generation (RAG) capabilities
 * Similar to Microsoft AutoGen's RetrieveUserProxyAgent
 * 
 * This agent can:
 * - Retrieve relevant documents from a knowledge base
 * - Augment conversations with retrieved context
 * - Support code execution like UserProxyAgent
 * - Work with vector databases or custom retrieval functions
 */
export class RetrieveUserProxyAgent extends BaseAgent {
  private humanInputMode: 'ALWAYS' | 'TERMINATE' | 'NEVER';
  private customIsTerminationMsg?: (message: IMessage) => boolean;
  private codeExecutor?: ICodeExecutor;
  private autoExecuteCode: boolean;
  private retrievalFunction?: RetrievalFunction;
  private nResults: number;
  private distanceThreshold: number;
  private updateContext: boolean;
  private task: 'code' | 'qa' | 'default';
  private retrievedDocs: DocumentChunk[] = [];

  constructor(config: RetrieveUserProxyAgentConfig) {
    super(config);
    
    this.humanInputMode = config.humanInputMode || 'NEVER';
    this.customIsTerminationMsg = config.isTerminationMsg;
    this.codeExecutor = config.codeExecutor;
    this.autoExecuteCode = config.autoExecuteCode ?? false;
    
    // Retrieval configuration
    const retrieveConfig = config.retrieveConfig || {};
    this.task = retrieveConfig.task || 'default';
    this.nResults = retrieveConfig.nResults || 5;
    this.distanceThreshold = retrieveConfig.distanceThreshold || 0.8;
    this.updateContext = retrieveConfig.updateContext ?? true;
    this.retrievalFunction = retrieveConfig.retrievalFunction;
  }

  /**
   * Set custom retrieval function
   */
  setRetrievalFunction(fn: RetrievalFunction): void {
    this.retrievalFunction = fn;
  }

  /**
   * Retrieve relevant documents based on query
   */
  async retrieveDocuments(query: string): Promise<DocumentChunk[]> {
    if (!this.retrievalFunction) {
      return [];
    }

    try {
      const docs = await this.retrievalFunction(query, this.nResults);
      
      // Filter by distance threshold if scores are available
      const filteredDocs = docs.filter(doc => {
        if (doc.score !== undefined) {
          return doc.score >= this.distanceThreshold;
        }
        return true;
      });

      this.retrievedDocs = filteredDocs;
      return filteredDocs;
    } catch (error) {
      console.error('Error retrieving documents:', error);
      return [];
    }
  }

  /**
   * Format retrieved documents as context
   */
  private formatRetrievedContext(docs: DocumentChunk[]): string {
    if (docs.length === 0) {
      return '';
    }

    let context = '\n\n## Retrieved Context:\n\n';
    docs.forEach((doc, index) => {
      context += `### Document ${index + 1}`;
      if (doc.metadata?.title) {
        context += ` - ${doc.metadata.title}`;
      }
      if (doc.score !== undefined) {
        context += ` (relevance: ${(doc.score * 100).toFixed(1)}%)`;
      }
      context += '\n\n';
      context += doc.content;
      context += '\n\n';
    });

    return context;
  }

  /**
   * Generate a reply with retrieval augmentation
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    const lastMessage = messages[messages.length - 1];
    let responseContent = '';

    // Retrieve relevant documents if retrieval is configured
    if (this.retrievalFunction && lastMessage.role === 'assistant') {
      const docs = await this.retrieveDocuments(lastMessage.content);
      
      if (docs.length > 0) {
        // Format retrieved context
        const context = this.formatRetrievedContext(docs);
        
        // For QA task, provide context directly
        if (this.task === 'qa') {
          responseContent = `Based on the retrieved information:${context}\n\nPlease use this context to answer the question.`;
        } else {
          responseContent = context;
        }
      }
    }

    // Check if the last message contains code blocks to execute
    if (this.codeExecutor && this.autoExecuteCode) {
      const codeBlocks = this.extractCodeBlocks(lastMessage.content);
      if (codeBlocks.length > 0) {
        const executionResults = await this.codeExecutor.executeCodeBlocks(codeBlocks);
        const resultText = this.formatExecutionResults(executionResults);
        
        responseContent = responseContent ? `${responseContent}\n\n${resultText}` : resultText;
      }
    }

    // If we have content from retrieval or code execution, return it
    if (responseContent) {
      const reply: IMessage = {
        role: 'user',
        content: responseContent,
        name: this.name
      };
      this.addToHistory(reply);
      return reply;
    }

    // Otherwise, use default behavior
    const reply: IMessage = {
      role: 'user',
      content: 'Continuing...',
      name: this.name
    };
    this.addToHistory(reply);
    return reply;
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

  /**
   * Get the most recently retrieved documents
   */
  getRetrievedDocuments(): DocumentChunk[] {
    return [...this.retrievedDocs];
  }

  /**
   * Clear retrieved documents cache
   */
  clearRetrievedDocuments(): void {
    this.retrievedDocs = [];
  }

  /**
   * Initiate a chat with retrieval augmentation
   * Overrides parent method to inject retrieval context
   */
  async initiateChat(
    recipient: any,
    message: string,
    maxRounds: number = 10
  ): Promise<IMessage[]> {
    // First, retrieve relevant documents for the initial query
    if (this.retrievalFunction) {
      const docs = await this.retrieveDocuments(message);
      
      if (docs.length > 0 && this.updateContext) {
        // Augment the initial message with retrieved context
        const context = this.formatRetrievedContext(docs);
        message = `${message}${context}`;
      }
    }

    // Call parent's initiateChat with augmented message
    return super.initiateChat(recipient, message, maxRounds);
  }
}
