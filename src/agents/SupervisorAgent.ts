import { AssistantAgent, AssistantAgentConfig } from './AssistantAgent';
import { IMessage } from '../core/IAgent';
import { TaskPlan, Task } from './PlannerAgent';

/**
 * Configuration for SupervisorAgent
 */
export interface SupervisorAgentConfig extends AssistantAgentConfig {
  verificationPrompt?: string;
  maxIterations?: number;
}

/**
 * Verification result from supervisor
 */
export interface VerificationResult {
  isComplete: boolean;
  feedback: string;
  missingTasks: string[];
  suggestions: string[];
}

/**
 * A supervisor agent that verifies if tasks are completed and requirements are met
 * 
 * The SupervisorAgent monitors the execution of tasks, verifies their completion,
 * and ensures that the original user requirements are fully satisfied.
 */
export class SupervisorAgent extends AssistantAgent {
  private verificationPrompt: string;
  private maxIterations: number;
  private currentIteration: number;

  constructor(config: SupervisorAgentConfig) {
    const defaultSystemMessage = config.systemMessage ||
      `You are a supervisor agent. Your role is to:
1. Review completed tasks against the original user requirements
2. Verify that all requirements have been met
3. Identify any missing or incomplete work
4. Provide clear feedback on what still needs to be done
5. Determine when the work is complete

When reviewing:
- Compare the completed work against the original requirements
- Check if all tasks in the plan have been addressed
- Look for quality and completeness
- Be specific about what is missing or needs improvement

Your response should include:
- COMPLETE: [YES/NO] - Whether all requirements are met
- FEEDBACK: [Your detailed feedback]
- MISSING: [List any missing or incomplete items]
- SUGGESTIONS: [Any suggestions for improvement]

Be thorough but fair in your assessment.`;

    super({
      ...config,
      systemMessage: defaultSystemMessage,
    });

    this.verificationPrompt = config.verificationPrompt ||
      "Please verify if the following work meets the original requirements:";
    this.maxIterations = config.maxIterations || 5;
    this.currentIteration = 0;
  }

  /**
   * Verify if requirements are met based on plan and execution results
   */
  async verifyCompletion(
    requirement: string,
    plan: TaskPlan,
    executionResults: string[]
  ): Promise<VerificationResult> {
    this.currentIteration++;

    // Build verification context
    let verificationContext = `Original Requirement:\n${requirement}\n\n`;
    verificationContext += `Planned Tasks:\n`;
    
    plan.tasks.forEach(task => {
      verificationContext += `${task.id}. ${task.description} - Status: ${task.status}\n`;
      if (task.result) {
        verificationContext += `   Result: ${task.result}\n`;
      }
    });

    verificationContext += `\nExecution Results:\n`;
    executionResults.forEach((result, index) => {
      verificationContext += `${index + 1}. ${result}\n`;
    });

    verificationContext += `\n${this.verificationPrompt}`;

    const messages: IMessage[] = [
      { role: 'user', content: verificationContext }
    ];

    const reply = await this.generateReply(messages);
    const verification = this.parseVerification(reply.content);

    return verification;
  }

  /**
   * Parse the verification response into structured result
   */
  private parseVerification(verificationText: string): VerificationResult {
    const result: VerificationResult = {
      isComplete: false,
      feedback: '',
      missingTasks: [],
      suggestions: []
    };

    // Check for completion status
    const completeMatch = verificationText.match(/COMPLETE:\s*(YES|NO)/i);
    if (completeMatch) {
      result.isComplete = completeMatch[1].toUpperCase() === 'YES';
    } else {
      // Fallback: look for affirmative keywords
      const affirmativeKeywords = ['complete', 'finished', 'done', 'satisfied', 'met all'];
      const negativeKeywords = ['incomplete', 'missing', 'not complete', 'not done', 'not met'];
      
      const lowerText = verificationText.toLowerCase();
      const hasAffirmative = affirmativeKeywords.some(kw => lowerText.includes(kw));
      const hasNegative = negativeKeywords.some(kw => lowerText.includes(kw));
      
      // Only complete if affirmative and no negative indicators
      result.isComplete = hasAffirmative && !hasNegative;
    }

    // Extract feedback
    const feedbackMatch = verificationText.match(/FEEDBACK:\s*(.+?)(?=\n(?:MISSING|SUGGESTIONS|$))/is);
    if (feedbackMatch) {
      result.feedback = feedbackMatch[1].trim();
    } else {
      result.feedback = verificationText;
    }

    // Extract missing items
    const missingMatch = verificationText.match(/MISSING:\s*(.+?)(?=\n(?:SUGGESTIONS|$))/is);
    if (missingMatch) {
      const missingText = missingMatch[1].trim();
      result.missingTasks = missingText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line !== 'None' && line !== '-');
    }

    // Extract suggestions
    const suggestionsMatch = verificationText.match(/SUGGESTIONS:\s*(.+?)$/is);
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[1].trim();
      result.suggestions = suggestionsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line !== 'None' && line !== '-');
    }

    return result;
  }

  /**
   * Quick check if a specific task result meets requirements
   */
  async checkTaskCompletion(
    taskDescription: string,
    taskResult: string
  ): Promise<boolean> {
    const checkMessage = `Task: ${taskDescription}\n\nResult: ${taskResult}\n\nDoes this result adequately complete the task? Answer YES or NO and explain briefly.`;

    const messages: IMessage[] = [
      { role: 'user', content: checkMessage }
    ];

    const reply = await this.generateReply(messages);
    const response = reply.content.toUpperCase();
    
    return response.includes('YES') && !response.includes('NO');
  }

  /**
   * Check if maximum iterations reached
   */
  hasReachedMaxIterations(): boolean {
    return this.currentIteration >= this.maxIterations;
  }

  /**
   * Get current iteration count
   */
  getCurrentIteration(): number {
    return this.currentIteration;
  }

  /**
   * Reset iteration counter
   */
  resetIterations(): void {
    this.currentIteration = 0;
  }

  /**
   * Generate feedback summary
   */
  generateFeedbackSummary(verification: VerificationResult): string {
    let summary = `\n${'='.repeat(60)}\n`;
    summary += 'SUPERVISOR VERIFICATION REPORT\n';
    summary += `${'='.repeat(60)}\n\n`;
    
    summary += `Status: ${verification.isComplete ? '✓ COMPLETE' : '✗ INCOMPLETE'}\n\n`;
    
    summary += `Feedback:\n${verification.feedback}\n\n`;
    
    if (verification.missingTasks.length > 0) {
      summary += `Missing Tasks:\n`;
      verification.missingTasks.forEach((task, index) => {
        summary += `  ${index + 1}. ${task}\n`;
      });
      summary += '\n';
    }
    
    if (verification.suggestions.length > 0) {
      summary += `Suggestions:\n`;
      verification.suggestions.forEach((suggestion, index) => {
        summary += `  ${index + 1}. ${suggestion}\n`;
      });
      summary += '\n';
    }
    
    summary += `${'='.repeat(60)}\n`;
    
    return summary;
  }
}
