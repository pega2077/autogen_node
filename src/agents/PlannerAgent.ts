import { AssistantAgent, AssistantAgentConfig } from './AssistantAgent';
import { IMessage } from '../core/IAgent';

/**
 * Configuration for PlannerAgent
 */
export interface PlannerAgentConfig extends AssistantAgentConfig {
  planningPrompt?: string;
}

/**
 * Task plan structure
 */
export interface TaskPlan {
  tasks: Task[];
  description: string;
}

/**
 * Individual task in a plan
 */
export interface Task {
  id: number;
  description: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed';
  result?: string;
}

/**
 * A planning agent that can break down user requirements into executable tasks
 * 
 * The PlannerAgent analyzes user requirements and creates a structured plan
 * with individual tasks that can be assigned to other agents for execution.
 */
export class PlannerAgent extends AssistantAgent {
  private planningPrompt: string;
  private currentPlan?: TaskPlan;

  constructor(config: PlannerAgentConfig) {
    const defaultSystemMessage = config.systemMessage || 
      `You are a planning agent. Your role is to:
1. Analyze user requirements carefully
2. Break down complex tasks into smaller, manageable subtasks
3. Create a clear, structured plan with specific tasks
4. Each task should be concrete and actionable
5. Format your plan as a numbered list of tasks

When creating a plan:
- Be specific and clear about what needs to be done
- Consider dependencies between tasks
- Prioritize tasks logically
- Make each task independently executable

Your response should include:
1. A brief description of the overall goal
2. A numbered list of specific tasks to accomplish the goal

Example format:
Goal: [Brief description of what we're trying to achieve]

Tasks:
1. [Specific task description]
2. [Specific task description]
3. [Specific task description]
...`;

    super({
      ...config,
      systemMessage: defaultSystemMessage,
    });

    this.planningPrompt = config.planningPrompt || 
      "Please create a detailed plan to accomplish the following requirement:";
  }

  /**
   * Create a plan based on user requirements
   */
  async createPlan(requirement: string): Promise<TaskPlan> {
    const planningMessage = `${this.planningPrompt}\n\n${requirement}`;
    
    const messages: IMessage[] = [
      { role: 'user', content: planningMessage }
    ];

    const reply = await this.generateReply(messages);
    const plan = this.parsePlan(reply.content, requirement);
    this.currentPlan = plan;
    
    return plan;
  }

  /**
   * Parse the LLM response into a structured plan
   */
  private parsePlan(planText: string, requirement: string): TaskPlan {
    const tasks: Task[] = [];
    
    // Extract numbered tasks from the plan
    const lines = planText.split('\n');
    let taskId = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match patterns like "1.", "1)", "Task 1:", etc.
      const taskMatch = trimmedLine.match(/^(?:\d+[\.):]|Task\s+\d+:?)\s*(.+)/i);
      
      if (taskMatch && taskMatch[1]) {
        const description = taskMatch[1].trim();
        if (description.length > 0) {
          tasks.push({
            id: taskId++,
            description: description,
            status: 'pending'
          });
        }
      }
    }

    // If no tasks were found using numbered list, try to extract meaningful lines
    if (tasks.length === 0) {
      const meaningfulLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 10 && 
               !trimmed.toLowerCase().startsWith('goal:') &&
               !trimmed.toLowerCase().startsWith('tasks:') &&
               trimmed !== '-';
      });

      meaningfulLines.forEach((line, index) => {
        tasks.push({
          id: index + 1,
          description: line.trim(),
          status: 'pending'
        });
      });
    }

    return {
      tasks: tasks,
      description: requirement
    };
  }

  /**
   * Get the current plan
   */
  getCurrentPlan(): TaskPlan | undefined {
    return this.currentPlan;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: number, status: Task['status'], result?: string): void {
    if (this.currentPlan) {
      const task = this.currentPlan.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        if (result) {
          task.result = result;
        }
      }
    }
  }

  /**
   * Assign a task to an agent
   */
  assignTask(taskId: number, agentName: string): void {
    if (this.currentPlan) {
      const task = this.currentPlan.tasks.find(t => t.id === taskId);
      if (task) {
        task.assignedTo = agentName;
      }
    }
  }

  /**
   * Check if all tasks are completed
   */
  isAllTasksCompleted(): boolean {
    if (!this.currentPlan) {
      return false;
    }
    return this.currentPlan.tasks.every(task => task.status === 'completed');
  }

  /**
   * Get plan summary for display
   */
  getPlanSummary(): string {
    if (!this.currentPlan) {
      return 'No plan created yet.';
    }

    let summary = `Plan: ${this.currentPlan.description}\n\n`;
    summary += 'Tasks:\n';
    
    this.currentPlan.tasks.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✓' : 
                        task.status === 'in_progress' ? '→' : '○';
      const assignee = task.assignedTo ? ` [${task.assignedTo}]` : '';
      summary += `${statusIcon} ${task.id}. ${task.description}${assignee}\n`;
    });

    return summary;
  }
}
