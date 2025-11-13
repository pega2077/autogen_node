import { IAgent, IMessage } from './IAgent';

/**
 * Configuration for a sequential chat step
 */
export interface SequentialChatStep {
  /** The agent to execute in this step */
  agent: IAgent;
  /** Optional message to send to this agent (if not provided, uses previous agent's response) */
  message?: string | IMessage;
  /** Maximum rounds for this step */
  maxRounds?: number;
  /** Whether to summarize the step's result */
  summarize?: boolean;
}

/**
 * Configuration for sequential chat
 */
export interface SequentialChatConfig {
  /** Steps to execute in sequence */
  steps: SequentialChatStep[];
  /** Initial message to start the sequence */
  initialMessage: string | IMessage;
  /** Whether to collect all step results */
  collectResults?: boolean;
}

/**
 * Result from a sequential chat step
 */
export interface SequentialChatStepResult {
  /** The agent that executed this step */
  agentName: string;
  /** Messages from this step */
  messages: IMessage[];
  /** The final message from this step */
  finalMessage: IMessage;
  /** Number of rounds executed */
  rounds: number;
}

/**
 * Result from a sequential chat
 */
export interface SequentialChatResult {
  /** Results from each step */
  stepResults: SequentialChatStepResult[];
  /** All messages from the entire sequence */
  allMessages: IMessage[];
  /** The final message from the last step */
  finalMessage: IMessage;
  /** Total number of steps executed */
  totalSteps: number;
}

/**
 * Execute a sequential chat where agents are called in a predefined order
 * This is useful for workflow automation and structured multi-agent processes
 * 
 * @param config - Configuration for the sequential chat
 * @returns Result containing all step results and messages
 */
export async function runSequentialChat(
  config: SequentialChatConfig
): Promise<SequentialChatResult> {
  const { steps, initialMessage, collectResults = true } = config;

  if (steps.length === 0) {
    throw new Error('Sequential chat requires at least one step');
  }

  const stepResults: SequentialChatStepResult[] = [];
  const allMessages: IMessage[] = [];

  let currentMessage: IMessage = typeof initialMessage === 'string'
    ? { role: 'user' as const, content: initialMessage }
    : initialMessage;

  // Add initial message to all messages
  allMessages.push(currentMessage);

  // Execute each step in sequence
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepMessages: IMessage[] = [];

    // Determine the message for this step
    const stepInput: IMessage = step.message
      ? (typeof step.message === 'string'
          ? { role: 'user' as const, content: step.message }
          : step.message)
      : currentMessage;

    stepMessages.push(stepInput);

    const maxRounds = step.maxRounds || 1;
    let rounds = 0;

    // Execute the step
    while (rounds < maxRounds) {
      const reply = await step.agent.generateReply([...stepMessages]);
      stepMessages.push(reply);
      rounds++;

      // Check for termination
      if (isTerminationMessage(reply)) {
        break;
      }

      // For multi-round steps, add user message to continue
      if (rounds < maxRounds) {
        const continueMsg: IMessage = {
          role: 'user',
          content: 'Continue',
          name: 'system'
        };
        stepMessages.push(continueMsg);
      }
    }

    const finalStepMessage = stepMessages[stepMessages.length - 1];

    // Store step result
    const stepResult: SequentialChatStepResult = {
      agentName: step.agent.getName(),
      messages: stepMessages,
      finalMessage: finalStepMessage,
      rounds
    };

    stepResults.push(stepResult);

    if (collectResults) {
      allMessages.push(...stepMessages);
    }

    // Use the final message from this step as input for the next step
    currentMessage = finalStepMessage;
  }

  const finalMessage = stepResults[stepResults.length - 1].finalMessage;

  return {
    stepResults,
    allMessages,
    finalMessage,
    totalSteps: steps.length
  };
}

/**
 * Check if a message indicates termination
 */
function isTerminationMessage(message: IMessage): boolean {
  const terminationKeywords = ['TERMINATE', 'terminate'];
  return terminationKeywords.some(keyword =>
    message.content.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Create a summary of sequential chat results
 */
export function summarizeSequentialChat(result: SequentialChatResult): string {
  const lines: string[] = [];
  
  lines.push('Sequential Chat Summary');
  lines.push('='.repeat(60));
  lines.push(`Total Steps: ${result.totalSteps}`);
  lines.push(`Total Messages: ${result.allMessages.length}`);
  lines.push('');
  
  result.stepResults.forEach((step, idx) => {
    lines.push(`Step ${idx + 1}: ${step.agentName}`);
    lines.push(`  Rounds: ${step.rounds}`);
    lines.push(`  Final output: ${step.finalMessage.content.substring(0, 100)}${step.finalMessage.content.length > 100 ? '...' : ''}`);
    lines.push('');
  });
  
  return lines.join('\n');
}
