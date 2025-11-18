# Advanced Conversation Patterns

This document describes the advanced conversation patterns available in autogen_node, following Microsoft AutoGen's architecture.

## Overview

autogen_node now supports all major conversation patterns from Microsoft AutoGen:

1. ✅ **Nested Chat** - Hierarchical conversations with task delegation
2. ✅ **Sequential Chat** - Predefined workflow execution
3. ✅ **Speaker Selection Strategies** - Multiple ways to control speaker order
4. ✅ **Auto Speaker Selection** - LLM-based intelligent speaker selection
5. ✅ **Manual Speaker Selection** - Explicit speaker control
6. ✅ **Constrained Speaker Selection** - Limited speaker pool
7. ✅ **Swarm Mode** - Dynamic multi-agent task distribution

## 1. Nested Chat ✅

**Status:** Implemented  
**Priority:** 🔴 High  
**Use Cases:** Task decomposition, specialist consultations, hierarchical systems

### Description

Nested chat allows agents to initiate sub-conversations with other agents, creating a hierarchical conversation structure. This is useful when a parent agent needs to delegate specialized tasks to expert agents.

### Features

- Sub-conversation isolation
- Optional context integration back to parent
- Configurable termination
- Multiple nesting levels

### Example

```typescript
import { AssistantAgent, supportsNestedChat } from 'autogen_node';

// Create main agent
const projectManager = new AssistantAgent({
  name: 'project_manager',
  systemMessage: 'You delegate tasks to specialists.',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo'
});

// Create specialist
const codeReviewer = new AssistantAgent({
  name: 'code_reviewer',
  systemMessage: 'You review code for quality.',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo'
});

// Initiate nested conversation
const result = await projectManager.initiateNestedChat(
  'Please review this code: ...',
  codeReviewer,
  {
    maxRounds: 3,
    addToParentHistory: true
  }
);
```

### API Reference

See `INestedChat.ts` for full interface documentation.

## 2. Sequential Chat ✅

**Status:** Implemented  
**Priority:** 🔴 High  
**Use Cases:** Workflow automation, processing pipelines, structured tasks

### Description

Sequential chat executes agents in a predefined order, passing outputs from one agent to the next. This creates a workflow where each agent performs a specific step in sequence.

### Features

- Predefined execution order
- Automatic output chaining
- Step-by-step processing
- Result collection

### Example

```typescript
import { runSequentialChat, AssistantAgent } from 'autogen_node';

const researcher = new AssistantAgent({ name: 'researcher', ... });
const writer = new AssistantAgent({ name: 'writer', ... });
const editor = new AssistantAgent({ name: 'editor', ... });

const result = await runSequentialChat({
  steps: [
    { agent: researcher, maxRounds: 1 },
    { agent: writer, maxRounds: 1 },
    { agent: editor, maxRounds: 1 }
  ],
  initialMessage: 'Write an article about AI',
  collectResults: true
});
```

### API Reference

See `SequentialChat.ts` for full API documentation.

## 3. Speaker Selection Strategies ✅

**Status:** Implemented  
**Priority:** 🟡 Medium  
**Use Cases:** Intelligent group chat management, controlled discussions

### Description

Speaker selection strategies determine how the next speaker is chosen in group chats. Different strategies serve different purposes and can be combined for complex scenarios.

### Available Strategies

#### 3.1 Round-Robin Selection

Cycles through agents in sequential order. Fair and predictable.

```typescript
import { GroupChat, RoundRobinSelector } from 'autogen_node';

const groupChat = new GroupChat({
  agents: [agent1, agent2, agent3],
  speakerSelector: new RoundRobinSelector()
});
```

#### 3.2 Random Selection

Randomly selects the next speaker. Promotes varied participation.

```typescript
import { RandomSelector } from 'autogen_node';

const groupChat = new GroupChat({
  agents: [agent1, agent2, agent3],
  speakerSelector: new RandomSelector()
});
```

#### 3.3 Manual Selection

Allows explicit control over who speaks next.

```typescript
import { ManualSelector } from 'autogen_node';

const selector = new ManualSelector();
const groupChat = new GroupChat({
  agents: [agent1, agent2, agent3],
  speakerSelector: selector
});

// Control speaker order
selector.setNextSpeaker('agent2');
```

#### 3.4 Constrained Selection

Limits speaker selection to a specific subset of agents.

```typescript
import { ConstrainedSelector } from 'autogen_node';

const selector = new ConstrainedSelector(['agent1', 'agent3']);
const groupChat = new GroupChat({
  agents: [agent1, agent2, agent3],
  speakerSelector: selector
});

// Only agent1 and agent3 can speak
```

#### 3.5 Auto Selection (LLM-based)

Uses an LLM to intelligently select speakers based on conversation context.

```typescript
import { AutoSelector, AssistantAgent } from 'autogen_node';

const coordinator = new AssistantAgent({
  name: 'coordinator',
  systemMessage: 'Select the best agent to speak next.',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo'
});

const selector = new AutoSelector({ selectorAgent: coordinator });
const groupChat = new GroupChat({
  agents: [agent1, agent2, agent3],
  speakerSelector: selector
});
```

### Switching Strategies Dynamically

```typescript
const groupChat = new GroupChat({ agents, speakerSelector: roundRobinSelector });

// Switch to random selection
groupChat.setSpeakerSelector(new RandomSelector());

// Switch to constrained selection
groupChat.setSpeakerSelector(new ConstrainedSelector(['agent1']));
```

### API Reference

See `ISpeakerSelector.ts` and `SpeakerSelectors.ts` for detailed API documentation.

## 4. Swarm Mode ✅

**Status:** Implemented  
**Priority:** 🟡 Medium  
**Use Cases:** Parallel task processing, distributed workloads, batch operations

### Description

Swarm mode enables dynamic agent collaboration where tasks are distributed among available agents. Agents can join or leave the swarm dynamically, and tasks are processed independently.

### Features

- Dynamic task distribution
- Multiple task assignment strategies
- Agent scaling (add/remove agents)
- Independent task execution
- Comprehensive task tracking
- Status monitoring

### Example

```typescript
import { SwarmChat, RoundRobinSelector } from 'autogen_node';

const swarm = new SwarmChat({
  agents: [researcher, writer, coder, reviewer],
  maxRoundsPerTask: 3,
  maxTotalRounds: 30,
  taskAssignmentSelector: new RoundRobinSelector(),
  allowDynamicAgents: true
});

// Execute multiple tasks
const result = await swarm.run([
  'Research TypeScript benefits',
  'Write a tutorial',
  'Create code examples',
  'Review the documentation'
]);

// Check results
console.log(`Completed: ${result.completedTasks.length}`);
console.log(`Failed: ${result.failedTasks.length}`);
```

### Dynamic Agent Management

```typescript
// Add agents dynamically
swarm.addAgent(newAgent);

// Remove agents
swarm.removeAgent('agent_name');

// Get current agents
const agents = swarm.getAgents();
```

### Single Task Execution

```typescript
const task = await swarm.runSingleTask(
  'Research Node.js features',
  specificAgent  // optional: assign to specific agent
);

console.log(task.status);  // COMPLETED, FAILED, etc.
console.log(task.result);
```

### Task Assignment Strategies

Swarm mode supports all speaker selection strategies for task assignment:

```typescript
// Round-robin task distribution
new SwarmChat({ 
  agents, 
  taskAssignmentSelector: new RoundRobinSelector() 
});

// Random task distribution
new SwarmChat({ 
  agents, 
  taskAssignmentSelector: new RandomSelector() 
});

// Constrained task assignment (only specific agents)
new SwarmChat({ 
  agents, 
  taskAssignmentSelector: new ConstrainedSelector(['agent1', 'agent2']) 
});

// Intelligent task assignment using LLM
new SwarmChat({ 
  agents, 
  taskAssignmentSelector: new AutoSelector({ selectorAgent: coordinator }) 
});
```

### API Reference

See `SwarmChat.ts` for detailed API documentation.

## Comparison with Microsoft AutoGen

| Pattern | Python AutoGen | .NET AutoGen | autogen_node | Priority |
|---------|---------------|--------------|--------------|----------|
| Nested Chat | ✅ | ✅ | ✅ | 🔴 High |
| Sequential Chat | ✅ | ✅ | ✅ | 🔴 High |
| Speaker Selection Strategies | ✅ | ✅ | ✅ | 🟡 Medium |
| Auto Speaker Selection | ✅ | ✅ | ✅ | 🟡 Medium |
| Manual Speaker Selection | ✅ | ✅ | ✅ | 🟢 Low |
| Constrained Speaker Selection | ✅ | ✅ | ✅ | 🟢 Low |
| Swarm Mode | ✅ | ✅ | ✅ | 🟡 Medium |

## Examples

All patterns include comprehensive examples:

- `src/examples/nested-chat-example.ts` - Nested chat demonstration
- `src/examples/sequential-chat-example.ts` - Sequential workflow
- `src/examples/speaker-selection-example.ts` - All speaker selection strategies
- `src/examples/swarm-mode-example.ts` - Swarm mode and task distribution

Run examples:

```bash
npm run example:nested
npm run example:sequential
npm run example:speaker
npm run example:swarm
```

## Tests

Comprehensive test suites are available:

- `src/__tests__/NestedChat.test.ts`
- `src/__tests__/SequentialChat.test.ts`
- `src/__tests__/SpeakerSelection.test.ts`
- `src/__tests__/AutoSelector.test.ts`
- `src/__tests__/SwarmChat.test.ts`

Run tests:

```bash
npm test
```

## Best Practices

### Nested Chat

- Use for task delegation and specialist consultations
- Set `addToParentHistory: true` to maintain context
- Limit nesting depth to avoid complexity
- Set appropriate `maxRounds` for sub-conversations

### Sequential Chat

- Ideal for linear workflows and pipelines
- Each step should have a clear, focused purpose
- Use `summarize: true` for steps that need condensing
- Consider error handling between steps

### Speaker Selection

- **Round-Robin**: Use for fair, balanced participation
- **Random**: Use when order doesn't matter
- **Manual**: Use when you need precise control
- **Constrained**: Use for role-based restrictions
- **Auto**: Use when context-aware selection is important

### Swarm Mode

- Best for independent, parallelizable tasks
- Set appropriate `maxRoundsPerTask` to prevent infinite loops
- Use `maxTotalRounds` to limit overall execution time
- Choose task assignment strategy based on workload
- Monitor task status for failures

## Performance Considerations

- **Nested Chat**: Each nested conversation adds overhead
- **Sequential Chat**: Executes serially, not parallel
- **Auto Selection**: Adds LLM call overhead for each selection
- **Swarm Mode**: Tasks execute sequentially (simulated parallel)

## Future Enhancements

Potential future additions:

- True parallel task execution in Swarm mode
- Priority-based task scheduling
- Agent load balancing
- Task dependencies and DAG execution
- Distributed swarm across multiple processes
- Advanced termination conditions
- Cost tracking and optimization

## Contributing

Contributions are welcome! Please ensure:

- New patterns follow Microsoft AutoGen conventions
- Comprehensive tests are included
- Documentation is updated
- Examples demonstrate key features

## References

- [Microsoft AutoGen (Python)](https://github.com/microsoft/autogen)
- [Microsoft AutoGen (.NET)](https://github.com/microsoft/autogen/tree/main/dotnet)
- [AutoGen Documentation](https://microsoft.github.io/autogen/)
