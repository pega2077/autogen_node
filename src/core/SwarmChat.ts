import { IAgent, IMessage } from './IAgent';
import { ISpeakerSelector } from './ISpeakerSelector';
import { RandomSelector } from './SpeakerSelectors';

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * A task in the swarm
 */
export interface SwarmTask {
  /** Unique task ID */
  id: string;
  /** Task description */
  description: string;
  /** Current status */
  status: TaskStatus;
  /** Agent assigned to this task */
  assignedAgent?: IAgent;
  /** Messages related to this task */
  messages: IMessage[];
  /** Task result when completed */
  result?: IMessage;
  /** Error message if failed */
  error?: string;
}

/**
 * Configuration for SwarmChat
 */
export interface SwarmChatConfig {
  /** Initial agents in the swarm */
  agents: IAgent[];
  /** Maximum number of rounds per task */
  maxRoundsPerTask?: number;
  /** Maximum total rounds across all tasks */
  maxTotalRounds?: number;
  /** Speaker selection strategy for task assignment (default: random) */
  taskAssignmentSelector?: ISpeakerSelector;
  /** Whether to allow dynamic agent joining */
  allowDynamicAgents?: boolean;
}

/**
 * Result from a swarm chat execution
 */
export interface SwarmChatResult {
  /** All tasks that were executed */
  tasks: SwarmTask[];
  /** Total number of rounds executed */
  totalRounds: number;
  /** All messages from all tasks */
  allMessages: IMessage[];
  /** Completed tasks */
  completedTasks: SwarmTask[];
  /** Failed tasks */
  failedTasks: SwarmTask[];
}

/**
 * Swarm mode for dynamic agent collaboration
 * Inspired by swarm intelligence and multi-agent task distribution
 * 
 * Features:
 * - Dynamic task distribution among agents
 * - Parallel-like task processing (simulated async)
 * - Agents can join/leave dynamically
 * - Flexible task assignment strategies
 */
export class SwarmChat {
  private agents: IAgent[];
  private maxRoundsPerTask: number;
  private maxTotalRounds: number;
  private taskAssignmentSelector: ISpeakerSelector;
  private allowDynamicAgents: boolean;
  private tasks: SwarmTask[];
  private taskIdCounter: number;
  private lastAssignedAgent?: IAgent;

  constructor(config: SwarmChatConfig) {
    if (config.agents.length === 0) {
      throw new Error('SwarmChat requires at least 1 agent');
    }

    this.agents = [...config.agents];
    this.maxRoundsPerTask = config.maxRoundsPerTask || 5;
    this.maxTotalRounds = config.maxTotalRounds || 50;
    this.taskAssignmentSelector = config.taskAssignmentSelector || new RandomSelector();
    this.allowDynamicAgents = config.allowDynamicAgents ?? true;
    this.tasks = [];
    this.taskIdCounter = 0;
  }

  /**
   * Add an agent to the swarm
   * @param agent - Agent to add
   */
  addAgent(agent: IAgent): void {
    if (!this.allowDynamicAgents) {
      throw new Error('Dynamic agent addition is not allowed in this swarm');
    }

    if (!this.agents.find(a => a.getName() === agent.getName())) {
      this.agents.push(agent);
      console.log(`[Swarm] Agent '${agent.getName()}' joined the swarm`);
    }
  }

  /**
   * Remove an agent from the swarm
   * @param agentName - Name of agent to remove
   */
  removeAgent(agentName: string): void {
    if (!this.allowDynamicAgents) {
      throw new Error('Dynamic agent removal is not allowed in this swarm');
    }

    const index = this.agents.findIndex(a => a.getName() === agentName);
    if (index >= 0) {
      this.agents.splice(index, 1);
      console.log(`[Swarm] Agent '${agentName}' left the swarm`);
    }
  }

  /**
   * Get all agents in the swarm
   */
  getAgents(): IAgent[] {
    return [...this.agents];
  }

  /**
   * Get all tasks
   */
  getTasks(): SwarmTask[] {
    return [...this.tasks];
  }

  /**
   * Create a new task
   * @param description - Task description
   * @returns The created task
   */
  createTask(description: string): SwarmTask {
    const task: SwarmTask = {
      id: `task_${++this.taskIdCounter}`,
      description,
      status: TaskStatus.PENDING,
      messages: []
    };
    this.tasks.push(task);
    return task;
  }

  /**
   * Assign an agent to a task
   * @param task - The task to assign
   * @param agent - The agent to assign (optional, will auto-select if not provided)
   */
  private async assignTask(task: SwarmTask, agent?: IAgent): Promise<void> {
    if (!agent) {
      // Use selector to choose an agent, passing last assigned agent for context
      agent = await this.taskAssignmentSelector.selectSpeaker(
        this.agents,
        task.messages,
        this.lastAssignedAgent
      );
    }

    task.assignedAgent = agent;
    this.lastAssignedAgent = agent;  // Track for round-robin and other selectors
    task.status = TaskStatus.IN_PROGRESS;
    console.log(`[Swarm] Task '${task.id}' assigned to '${agent.getName()}'`);
  }

  /**
   * Execute a single task
   * @param task - The task to execute
   */
  private async executeTask(task: SwarmTask): Promise<void> {
    if (!task.assignedAgent) {
      throw new Error(`Task ${task.id} has no assigned agent`);
    }

    const initialMessage: IMessage = {
      role: 'user',
      content: task.description,
      name: 'swarm_coordinator'
    };
    task.messages.push(initialMessage);

    let rounds = 0;

    while (rounds < this.maxRoundsPerTask) {
      try {
        const reply = await task.assignedAgent.generateReply(task.messages);
        task.messages.push(reply);
        rounds++;

        console.log(`[Swarm][${task.id}][${task.assignedAgent.getName()}]: ${reply.content.substring(0, 100)}${reply.content.length > 100 ? '...' : ''}`);

        // Check for task completion
        if (this.isTaskComplete(reply)) {
          task.status = TaskStatus.COMPLETED;
          task.result = reply;
          console.log(`[Swarm] Task '${task.id}' completed in ${rounds} rounds`);
          break;
        }

        // Add continuation message if not complete
        if (rounds < this.maxRoundsPerTask) {
          task.messages.push({
            role: 'user',
            content: 'Continue with the task.',
            name: 'swarm_coordinator'
          });
        }
      } catch (error) {
        task.status = TaskStatus.FAILED;
        task.error = error instanceof Error ? error.message : String(error);
        console.error(`[Swarm] Task '${task.id}' failed:`, error);
        break;
      }
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      task.status = TaskStatus.COMPLETED;
      task.result = task.messages[task.messages.length - 1];
      console.log(`[Swarm] Task '${task.id}' completed (max rounds reached)`);
    }
  }

  /**
   * Check if a task is complete based on the message
   */
  private isTaskComplete(message: IMessage): boolean {
    const completionKeywords = ['TERMINATE', 'DONE', 'COMPLETE', 'FINISHED'];
    return completionKeywords.some(keyword =>
      message.content.toUpperCase().includes(keyword)
    );
  }

  /**
   * Run the swarm with multiple tasks
   * @param taskDescriptions - List of task descriptions
   * @returns Result containing all task information
   */
  async run(taskDescriptions: string[]): Promise<SwarmChatResult> {
    console.log(`[Swarm] Starting swarm with ${taskDescriptions.length} tasks and ${this.agents.length} agents`);

    // Create tasks
    const tasks = taskDescriptions.map(desc => this.createTask(desc));

    let totalRounds = 0;

    // Process tasks (simulated parallel processing)
    for (const task of tasks) {
      if (totalRounds >= this.maxTotalRounds) {
        console.log(`[Swarm] Maximum total rounds (${this.maxTotalRounds}) reached`);
        task.status = TaskStatus.FAILED;
        task.error = 'Maximum total rounds reached';
        continue;
      }

      // Assign and execute task
      await this.assignTask(task);
      await this.executeTask(task);

      totalRounds += task.messages.length;
    }

    // Collect results
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const failedTasks = tasks.filter(t => t.status === TaskStatus.FAILED);
    const allMessages = tasks.flatMap(t => t.messages);

    console.log(`[Swarm] Execution complete: ${completedTasks.length} completed, ${failedTasks.length} failed`);

    return {
      tasks,
      totalRounds,
      allMessages,
      completedTasks,
      failedTasks
    };
  }

  /**
   * Run a single task in the swarm
   * @param taskDescription - Description of the task
   * @param assignToAgent - Optional specific agent to assign to
   * @returns The completed task
   */
  async runSingleTask(
    taskDescription: string,
    assignToAgent?: IAgent
  ): Promise<SwarmTask> {
    const task = this.createTask(taskDescription);
    await this.assignTask(task, assignToAgent);
    await this.executeTask(task);
    return task;
  }

  /**
   * Reset the swarm (clear all tasks)
   */
  reset(): void {
    this.tasks = [];
    this.taskIdCounter = 0;
    this.lastAssignedAgent = undefined;
  }
}
