# Planning and Supervision Agents

This document describes the planning and supervision agents for orchestrating multi-agent workflows in autogen_node.

## Table of Contents

- [Overview](#overview)
- [PlannerAgent](#planneragent)
- [SupervisorAgent](#supervisoragent)
- [Complete Workflow Example](#complete-workflow-example)
- [Best Practices](#best-practices)

## Overview

The planning and supervision agents enable sophisticated multi-agent workflows where:

1. **PlannerAgent** - Analyzes requirements and creates structured task plans
2. **SupervisorAgent** - Verifies task completion and ensures requirements are met
3. **Worker Agents** - Execute individual tasks from the plan
4. **Feedback Loop** - Iterative refinement until all requirements are satisfied

This pattern is ideal for complex tasks that require:
- Breaking down requirements into manageable subtasks
- Coordinating multiple specialized agents
- Quality assurance and verification
- Iterative improvement based on feedback

## PlannerAgent

A planning agent that analyzes user requirements and breaks them down into structured, executable task plans.

### Features

- Intelligent task decomposition
- Structured plan generation with numbered tasks
- Task status tracking (pending, in_progress, completed)
- Task assignment to worker agents
- Progress monitoring
- Visual plan summaries

### Configuration

```typescript
interface PlannerAgentConfig extends AssistantAgentConfig {
  planningPrompt?: string;  // Custom planning instructions
  // ... standard AssistantAgent config (provider, model, etc.)
}
```

### Task Structure

```typescript
interface Task {
  id: number;                                           // Unique task ID
  description: string;                                  // What needs to be done
  assignedTo?: string;                                  // Which agent is working on it
  status: 'pending' | 'in_progress' | 'completed';     // Current status
  result?: string;                                      // Task output when completed
}

interface TaskPlan {
  tasks: Task[];          // List of all tasks
  description: string;    // Overall goal/requirement
}
```

### Basic Usage

```typescript
import { PlannerAgent } from 'autogen_node';

// Create a planner agent
const planner = new PlannerAgent({
  name: 'planner',
  provider: 'ollama',
  model: 'llama2',
  baseURL: 'http://localhost:11434/v1',
  temperature: 0.7
});

// Create a plan from user requirements
const requirement = 'Create a user authentication system with login and registration';
const plan = await planner.createPlan(requirement);

// Display the plan
console.log(planner.getPlanSummary());
// Output:
// Plan: Create a user authentication system...
// Tasks:
// ○ 1. Design the database schema for users
// ○ 2. Implement user registration endpoint
// ○ 3. Implement login endpoint
// ○ 4. Add password hashing and validation
// ○ 5. Create authentication middleware
```

### Task Management

```typescript
// Assign a task to an agent
planner.assignTask(1, 'database_agent');

// Update task status
planner.updateTaskStatus(1, 'in_progress');

// Mark task as completed with result
planner.updateTaskStatus(1, 'completed', 'Database schema created successfully');

// Check if all tasks are done
if (planner.isAllTasksCompleted()) {
  console.log('All tasks completed!');
}

// Get current plan
const currentPlan = planner.getCurrentPlan();
if (currentPlan) {
  console.log(`Total tasks: ${currentPlan.tasks.length}`);
}
```

### Custom Planning Prompt

```typescript
const planner = new PlannerAgent({
  name: 'planner',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  planningPrompt: `Analyze the requirement and create a detailed technical plan.
    Each task should be specific and testable.
    Consider dependencies and order tasks logically.`
});
```

## SupervisorAgent

A supervisor agent that verifies task completion, validates results against requirements, and provides structured feedback.

### Features

- Requirement verification
- Structured feedback generation
- Missing task identification
- Improvement suggestions
- Iteration tracking to prevent infinite loops
- Detailed verification reports

### Configuration

```typescript
interface SupervisorAgentConfig extends AssistantAgentConfig {
  verificationPrompt?: string;  // Custom verification instructions
  maxIterations?: number;       // Maximum verification cycles (default: 5)
  // ... standard AssistantAgent config
}
```

### Verification Result Structure

```typescript
interface VerificationResult {
  isComplete: boolean;      // Are all requirements met?
  feedback: string;         // Detailed feedback
  missingTasks: string[];   // List of missing or incomplete items
  suggestions: string[];    // Suggestions for improvement
}
```

### Basic Usage

```typescript
import { SupervisorAgent } from 'autogen_node';

// Create a supervisor agent
const supervisor = new SupervisorAgent({
  name: 'supervisor',
  provider: 'ollama',
  model: 'llama2',
  baseURL: 'http://localhost:11434/v1',
  temperature: 0.3,        // Lower temperature for more consistent verification
  maxIterations: 3
});

// Verify completion
const verification = await supervisor.verifyCompletion(
  requirement,              // Original user requirement
  plan,                    // Task plan from PlannerAgent
  executionResults         // Array of results from task execution
);

// Display verification report
console.log(supervisor.generateFeedbackSummary(verification));

// Check result
if (verification.isComplete) {
  console.log('✓ All requirements met!');
} else {
  console.log('✗ Work incomplete. Addressing feedback...');
  verification.missingTasks.forEach(task => {
    console.log(`- ${task}`);
  });
}
```

### Iteration Management

```typescript
// Check current iteration
console.log(`Iteration: ${supervisor.getCurrentIteration()}`);

// Check if max iterations reached
if (supervisor.hasReachedMaxIterations()) {
  console.log('Maximum iterations reached. Stopping.');
}

// Reset counter for new verification session
supervisor.resetIterations();
```

### Quick Task Verification

```typescript
// Verify a single task completion
const isTaskComplete = await supervisor.checkTaskCompletion(
  'Implement user registration endpoint',
  'Created POST /api/register endpoint with validation'
);

if (!isTaskComplete) {
  console.log('Task needs more work');
}
```

## Complete Workflow Example

Here's a complete example demonstrating the planning-execution-supervision cycle:

```typescript
import { 
  PlannerAgent, 
  SupervisorAgent, 
  AssistantAgent 
} from 'autogen_node';

async function plannerSupervisorWorkflow() {
  // 1. Create the planner
  const planner = new PlannerAgent({
    name: 'planner',
    provider: 'ollama',
    model: 'llama2',
    baseURL: 'http://localhost:11434/v1'
  });

  // 2. Create the supervisor
  const supervisor = new SupervisorAgent({
    name: 'supervisor',
    provider: 'ollama',
    model: 'llama2',
    baseURL: 'http://localhost:11434/v1',
    maxIterations: 3
  });

  // 3. Create worker agents
  const researcher = new AssistantAgent({
    name: 'researcher',
    provider: 'ollama',
    model: 'llama2',
    systemMessage: 'You are a research agent. Gather and analyze information.',
    baseURL: 'http://localhost:11434/v1'
  });

  const developer = new AssistantAgent({
    name: 'developer',
    provider: 'ollama',
    model: 'llama2',
    systemMessage: 'You are a developer agent. Write code and implement solutions.',
    baseURL: 'http://localhost:11434/v1'
  });

  // 4. Define requirement
  const requirement = 'Create a REST API for a todo list application';

  // 5. Create plan
  console.log('Creating plan...');
  const plan = await planner.createPlan(requirement);
  console.log(planner.getPlanSummary());

  // 6. Execute tasks
  const executionResults: string[] = [];
  
  for (const task of plan.tasks) {
    // Select appropriate agent
    const agent = task.description.toLowerCase().includes('research') 
      ? researcher 
      : developer;
    
    planner.assignTask(task.id, agent.getName());
    planner.updateTaskStatus(task.id, 'in_progress');

    // Execute task
    const result = await agent.generateReply([
      { 
        role: 'user', 
        content: `Complete this task: ${task.description}` 
      }
    ]);

    planner.updateTaskStatus(task.id, 'completed', result.content);
    executionResults.push(result.content);
  }

  // 7. Verify completion
  console.log('\nVerifying completion...');
  let verification = await supervisor.verifyCompletion(
    requirement,
    plan,
    executionResults
  );

  console.log(supervisor.generateFeedbackSummary(verification));

  // 8. Feedback loop
  while (!verification.isComplete && !supervisor.hasReachedMaxIterations()) {
    console.log('\nAddressing feedback...');
    
    for (const missingTask of verification.missingTasks.slice(0, 2)) {
      const result = await developer.generateReply([
        { 
          role: 'user', 
          content: `Address this feedback: ${missingTask}` 
        }
      ]);
      executionResults.push(result.content);
    }

    // Re-verify
    verification = await supervisor.verifyCompletion(
      requirement,
      plan,
      executionResults
    );
    
    console.log(supervisor.generateFeedbackSummary(verification));
  }

  // 9. Final summary
  console.log('\n=== WORKFLOW COMPLETE ===');
  console.log(`Status: ${verification.isComplete ? 'SUCCESS' : 'PARTIAL'}`);
  console.log(`Iterations: ${supervisor.getCurrentIteration()}`);
}

// Run the workflow
plannerSupervisorWorkflow().catch(console.error);
```

## Best Practices

### 1. Choose Appropriate Models

```typescript
// Use higher temperature for creative planning
const planner = new PlannerAgent({
  temperature: 0.7  // More creative task breakdown
});

// Use lower temperature for consistent verification
const supervisor = new SupervisorAgent({
  temperature: 0.3  // More consistent and strict verification
});
```

### 2. Set Reasonable Iteration Limits

```typescript
const supervisor = new SupervisorAgent({
  maxIterations: 3  // Prevent infinite loops while allowing refinement
});
```

### 3. Provide Clear Requirements

```typescript
// Good: Specific and measurable
const requirement = `Create a REST API with the following endpoints:
- POST /api/users (create user)
- GET /api/users/:id (get user)
- Include input validation and error handling`;

// Poor: Vague and unmeasurable
const requirement = 'Make a good API';
```

### 4. Use Specialized Worker Agents

```typescript
// Create agents with specific expertise
const researcher = new AssistantAgent({
  systemMessage: 'You are a research specialist...'
});

const coder = new AssistantAgent({
  systemMessage: 'You are a coding expert...'
});

const reviewer = new AssistantAgent({
  systemMessage: 'You are a code reviewer...'
});
```

### 5. Monitor Progress

```typescript
// Track progress throughout execution
console.log(`Tasks: ${plan.tasks.filter(t => t.status === 'completed').length}/${plan.tasks.length}`);
console.log(`Iteration: ${supervisor.getCurrentIteration()}`);
console.log(planner.getPlanSummary());
```

### 6. Handle Verification Results

```typescript
const verification = await supervisor.verifyCompletion(/* ... */);

if (verification.isComplete) {
  // Success path
  console.log('✓ Requirements met');
  await finalizeWork();
} else if (supervisor.hasReachedMaxIterations()) {
  // Max iterations reached
  console.warn('⚠ Maximum iterations reached');
  await handlePartialCompletion(verification);
} else {
  // Continue with feedback
  await addressFeedback(verification.missingTasks);
}
```

## Running the Example

A complete example is available in `src/examples/planner-supervisor-example.ts`:

```bash
# Ensure Ollama is running and model is downloaded
ollama pull llama2

# Run the example
npm run example:planner-supervisor
```

The example demonstrates:
- User requirement input
- Automated planning
- Task execution with specialized agents
- Verification and feedback
- Iterative refinement until completion

## Use Cases

This pattern is ideal for:

1. **Complex Project Planning**: Break down large projects into manageable tasks
2. **Quality Assurance**: Ensure deliverables meet requirements
3. **Multi-Agent Coordination**: Orchestrate multiple specialized agents
4. **Iterative Development**: Refine work based on feedback
5. **Automated Workflows**: Create self-managing task execution pipelines

## Integration with Other Patterns

The planner-supervisor pattern works well with:

- **GroupChat**: For more dynamic agent interaction
- **SequentialChat**: For predefined workflows with planning
- **SwarmMode**: For distributed task execution
- **NestedChat**: For hierarchical task delegation

Example combining with GroupChat:

```typescript
import { GroupChat, GroupChatManager } from 'autogen_node';

// Use planner to create tasks, then use GroupChat for execution
const plan = await planner.createPlan(requirement);

const groupChat = new GroupChat({
  agents: [researcher, developer, reviewer],
  maxRound: 10
});

const manager = new GroupChatManager({
  groupChat: groupChat
});

// Execute tasks through group chat
for (const task of plan.tasks) {
  await manager.runChat(task.description);
}

// Verify with supervisor
const verification = await supervisor.verifyCompletion(/* ... */);
```
