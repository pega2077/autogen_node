import { ConversableAgent, ConversableAgentConfig } from './ConversableAgent';
import { IMessage, IAgent } from '../core/IAgent';

/**
 * Inner agent configuration for Society of Mind
 */
export interface InnerAgentConfig {
  agent: IAgent;
  role: string;
  expertise?: string;
  priority?: number;
}

/**
 * Configuration for SocietyOfMindAgent
 */
export interface SocietyOfMindAgentConfig extends ConversableAgentConfig {
  innerAgents?: InnerAgentConfig[];
  orchestrationStrategy?: 'sequential' | 'parallel' | 'debate' | 'voting';
  maxInnerRounds?: number;
  consensusThreshold?: number;
  enableDebate?: boolean;
}

/**
 * A Society of Mind agent that uses multiple internal agents for complex reasoning
 * Based on Marvin Minsky's "Society of Mind" theory
 * Similar to Microsoft AutoGen's Society of Mind Agent pattern
 * 
 * This agent provides:
 * - Multiple specialized inner agents working together
 * - Different orchestration strategies (sequential, parallel, debate, voting)
 * - Complex problem decomposition and solving
 * - Consensus-based decision making
 * - Emergent intelligence from agent collaboration
 */
export class SocietyOfMindAgent extends ConversableAgent {
  private innerAgents: InnerAgentConfig[];
  private orchestrationStrategy: 'sequential' | 'parallel' | 'debate' | 'voting';
  private maxInnerRounds: number;
  private consensusThreshold: number;
  private enableDebate: boolean;

  constructor(config: SocietyOfMindAgentConfig) {
    super(config);
    
    this.innerAgents = config.innerAgents || [];
    this.orchestrationStrategy = config.orchestrationStrategy || 'sequential';
    this.maxInnerRounds = config.maxInnerRounds || 5;
    this.consensusThreshold = config.consensusThreshold || 0.7;
    this.enableDebate = config.enableDebate ?? false;
  }

  /**
   * Add an inner agent to the society
   */
  addInnerAgent(config: InnerAgentConfig): void {
    this.innerAgents.push(config);
    
    // Sort by priority (higher priority first)
    this.innerAgents.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Remove an inner agent
   */
  removeInnerAgent(agentName: string): void {
    this.innerAgents = this.innerAgents.filter(
      config => config.agent.getName() !== agentName
    );
  }

  /**
   * Get all inner agents
   */
  getInnerAgents(): InnerAgentConfig[] {
    return [...this.innerAgents];
  }

  /**
   * Sequential processing - each agent builds on previous agent's output
   */
  private async processSequential(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage[]> {
    const results: IMessage[] = [];
    let currentMessages = [...messages];

    for (const innerConfig of this.innerAgents) {
      // Create a context message explaining the agent's role
      const roleMessage: IMessage = {
        role: 'system',
        content: `You are acting as: ${innerConfig.role}${
          innerConfig.expertise ? `. Your expertise: ${innerConfig.expertise}` : ''
        }`
      };

      const agentMessages = [roleMessage, ...currentMessages];
      const reply = await innerConfig.agent.generateReply(agentMessages, cancellationToken);
      
      results.push(reply);
      
      // Add this agent's reply to messages for next agent
      currentMessages.push(reply);
    }

    return results;
  }

  /**
   * Parallel processing - all agents process independently
   */
  private async processParallel(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage[]> {
    const promises = this.innerAgents.map(async (innerConfig) => {
      const roleMessage: IMessage = {
        role: 'system',
        content: `You are acting as: ${innerConfig.role}${
          innerConfig.expertise ? `. Your expertise: ${innerConfig.expertise}` : ''
        }`
      };

      const agentMessages = [roleMessage, ...messages];
      return innerConfig.agent.generateReply(agentMessages, cancellationToken);
    });

    return Promise.all(promises);
  }

  /**
   * Debate processing - agents discuss and refine their answers
   */
  private async processDebate(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage[]> {
    const debateHistory: IMessage[] = [...messages];
    const agentReplies = new Map<string, IMessage[]>();

    // Initialize agent replies
    for (const innerConfig of this.innerAgents) {
      agentReplies.set(innerConfig.agent.getName(), []);
    }

    // Conduct debate rounds
    for (let round = 0; round < this.maxInnerRounds; round++) {
      for (const innerConfig of this.innerAgents) {
        const roleMessage: IMessage = {
          role: 'system',
          content: `You are acting as: ${innerConfig.role}. ` +
            `This is debate round ${round + 1}/${this.maxInnerRounds}. ` +
            `Consider other agents' responses and refine your answer.`
        };

        const agentMessages = [roleMessage, ...debateHistory];
        const reply = await innerConfig.agent.generateReply(agentMessages, cancellationToken);
        
        debateHistory.push(reply);
        agentReplies.get(innerConfig.agent.getName())!.push(reply);
      }
    }

    // Return final replies from each agent
    return Array.from(agentReplies.values()).map(replies => replies[replies.length - 1]);
  }

  /**
   * Voting processing - agents vote on the best answer
   */
  private async processVoting(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage[]> {
    // First, get initial responses from all agents
    const initialReplies = await this.processParallel(messages, cancellationToken);

    // Create a voting prompt
    const votingPrompt: IMessage = {
      role: 'system',
      content: 'Review all the responses and vote for the best answer. ' +
        'Explain your choice briefly.\n\n' +
        initialReplies.map((reply, idx) => 
          `Option ${idx + 1} (${this.innerAgents[idx].role}):\n${reply.content}`
        ).join('\n\n')
    };

    // Have each agent vote
    const votes = await Promise.all(
      this.innerAgents.map(async (innerConfig) => {
        const voteMessages = [votingPrompt];
        return innerConfig.agent.generateReply(voteMessages, cancellationToken);
      })
    );

    return [...initialReplies, ...votes];
  }

  /**
   * Synthesize final answer from inner agents' responses
   */
  private async synthesizeAnswer(
    messages: IMessage[],
    innerReplies: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<string> {
    // If we have an LLM, use it to synthesize
    if (this.hasLLM()) {
      const synthesisPrompt: IMessage = {
        role: 'system',
        content: 'Based on the following perspectives from different experts, ' +
          'provide a comprehensive and balanced final answer:\n\n' +
          innerReplies.map((reply, idx) => 
            `${this.innerAgents[idx]?.role || `Agent ${idx + 1}`}:\n${reply.content}`
          ).join('\n\n')
      };

      const synthesisMessages = [...messages, synthesisPrompt];
      const synthesis = await super.generateReply(synthesisMessages, cancellationToken);
      return synthesis.content;
    }

    // Fallback: combine all responses
    return innerReplies
      .map((reply, idx) => 
        `**${this.innerAgents[idx]?.role || `Agent ${idx + 1}`}:**\n${reply.content}`
      )
      .join('\n\n---\n\n');
  }

  /**
   * Generate a reply using the society of inner agents
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    // If no inner agents, use parent's implementation
    if (this.innerAgents.length === 0) {
      return super.generateReply(messages, cancellationToken);
    }

    try {
      // Process using the configured strategy
      let innerReplies: IMessage[];
      
      switch (this.orchestrationStrategy) {
        case 'sequential':
          innerReplies = await this.processSequential(messages, cancellationToken);
          break;
        case 'parallel':
          innerReplies = await this.processParallel(messages, cancellationToken);
          break;
        case 'debate':
          innerReplies = await this.processDebate(messages, cancellationToken);
          break;
        case 'voting':
          innerReplies = await this.processVoting(messages, cancellationToken);
          break;
        default:
          innerReplies = await this.processSequential(messages, cancellationToken);
      }

      // Synthesize final answer
      const finalContent = await this.synthesizeAnswer(messages, innerReplies, cancellationToken);

      const reply: IMessage = {
        role: 'assistant',
        content: finalContent,
        name: this.name
      };

      this.addToHistory(reply);
      return reply;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Society of Mind processing failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Set orchestration strategy
   */
  setOrchestrationStrategy(strategy: 'sequential' | 'parallel' | 'debate' | 'voting'): void {
    this.orchestrationStrategy = strategy;
  }

  /**
   * Get current orchestration strategy
   */
  getOrchestrationStrategy(): string {
    return this.orchestrationStrategy;
  }

  /**
   * Set max inner rounds for debate
   */
  setMaxInnerRounds(rounds: number): void {
    this.maxInnerRounds = rounds;
  }

  /**
   * Get max inner rounds
   */
  getMaxInnerRounds(): number {
    return this.maxInnerRounds;
  }

  /**
   * Enable or disable debate mode
   */
  setEnableDebate(enabled: boolean): void {
    this.enableDebate = enabled;
  }

  /**
   * Check if debate mode is enabled
   */
  isDebateEnabled(): boolean {
    return this.enableDebate;
  }

  /**
   * Get statistics about the society
   */
  getSocietyStats(): {
    innerAgentCount: number;
    orchestrationStrategy: string;
    maxInnerRounds: number;
    agentRoles: string[];
  } {
    return {
      innerAgentCount: this.innerAgents.length,
      orchestrationStrategy: this.orchestrationStrategy,
      maxInnerRounds: this.maxInnerRounds,
      agentRoles: this.innerAgents.map(config => config.role)
    };
  }
}
