# Event-Driven Architecture (AutoGen v0.4)

This implementation brings AutoGen v0.4's event-driven architecture to Node.js/TypeScript, enabling scalable, distributed multi-agent systems with asynchronous message passing.

## Overview

AutoGen v0.4 introduces a fundamental shift to an event-driven, actor-based architecture that enables:

- **Asynchronous message passing** between agents
- **Topic-based publish/subscribe** for broadcast communication
- **Distributed agent systems** across processes and machines
- **Non-blocking workflows** with cancellation support
- **State persistence and management**

## Core Components

### AgentId

Unique identifier for agents in distributed systems.

```typescript
import { AgentId } from 'autogen_node';

// Create an agent ID
const agentId = new AgentId('assistant_agent', 'instance1');

// Default key is 'default'
const defaultAgent = new AgentId('user_proxy');

// String representation
console.log(agentId.toString()); // "assistant_agent/instance1"

// Parse from string
const parsed = AgentId.fromString('assistant_agent/instance1');
```

### TopicId

Identifier for topics in publish/subscribe messaging.

```typescript
import { TopicId } from 'autogen_node';

const topicId = new TopicId('notifications', 'system');
console.log(topicId.toString()); // "notifications/system"
```

### CancellationToken

Control async operations with cancellation support.

```typescript
import { CancellationToken } from 'autogen_node';

const token = new CancellationToken();

// Cancel the operation
setTimeout(() => token.cancel(), 1000);

// Check if cancelled
if (token.isCancelled) {
  console.log('Operation was cancelled');
}

// Throw if cancelled
token.throwIfCancelled();

// Register callback
token.onCancelled(() => {
  console.log('Cleanup on cancellation');
});
```

### AgentRuntime

The core runtime interface for hosting and managing agents.

```typescript
import { AgentRuntime, SingleThreadedAgentRuntime } from 'autogen_node';

// Create a runtime
const runtime: AgentRuntime = new SingleThreadedAgentRuntime();
```

## Key Features

### 1. Direct Message Passing

Send messages directly to specific agents and receive responses.

```typescript
import { AgentId, SingleThreadedAgentRuntime } from 'autogen_node';

const runtime = new SingleThreadedAgentRuntime();

// Create a simple agent
class SimpleAgent {
  async handleMessage(message: any, sender: AgentId | null) {
    return {
      role: 'assistant',
      content: `Processed: ${message.content}`,
    };
  }
}

// Register the agent
const agent = new SimpleAgent();
const agentId = new AgentId('simple_agent', 'agent1');
await runtime.registerAgentInstance(agent, agentId);

// Send a message
const response = await runtime.sendMessage(
  { content: 'Hello!' },
  agentId
);

console.log(response.content); // "Processed: Hello!"
```

### 2. Topic-Based Publish/Subscribe

Broadcast messages to multiple subscribers.

```typescript
import { AgentId, TopicId, createSubscription } from 'autogen_node';

// Create subscribers
const subscriber1Id = new AgentId('subscriber', 'sub1');
const subscriber2Id = new AgentId('subscriber', 'sub2');

await runtime.registerAgentInstance(subscriber1, subscriber1Id);
await runtime.registerAgentInstance(subscriber2, subscriber2Id);

// Create a topic
const notificationTopic = new TopicId('notifications', 'system');

// Subscribe agents to the topic
await runtime.addSubscription(
  createSubscription('sub1', notificationTopic, subscriber1Id)
);
await runtime.addSubscription(
  createSubscription('sub2', notificationTopic, subscriber2Id)
);

// Publish a message to all subscribers
await runtime.publishMessage(
  { content: 'System update available' },
  notificationTopic
);
```

### 3. Agent Factory Registration

Register factories for lazy agent creation.

```typescript
// Register a factory
await runtime.registerFactory('assistant_agent', () => {
  return new AssistantAgent({
    name: 'assistant',
    apiKey: process.env.OPENAI_API_KEY!,
  });
});

// Get agent (created lazily)
const agentId = await runtime.get('assistant_agent', 'default', true);

// Now the agent is available for messaging
const response = await runtime.sendMessage(
  { content: 'Hello' },
  agentId
);
```

### 4. State Management

Persist and restore runtime state.

```typescript
// Save runtime state
const state = await runtime.saveState();

// Save to file
import { writeFileSync } from 'fs';
writeFileSync('runtime-state.json', JSON.stringify(state));

// Later: restore state
import { readFileSync } from 'fs';
const savedState = JSON.parse(readFileSync('runtime-state.json', 'utf-8'));
await runtime.loadState(savedState);
```

### 5. Agent Metadata

Query agent information.

```typescript
const agentId = new AgentId('assistant_agent', 'agent1');
const metadata = await runtime.agentMetadata(agentId);

console.log(metadata);
// { type: 'assistant_agent', key: 'agent1', ... }
```

## Complete Example

```typescript
import {
  AgentId,
  TopicId,
  SingleThreadedAgentRuntime,
  createSubscription,
} from 'autogen_node';

// Define an event-driven agent
class EventAgent {
  constructor(private name: string) {}

  async handleMessage(message: any, sender: AgentId | null) {
    console.log(`[${this.name}] Received: ${message.content}`);
    return {
      role: 'assistant',
      content: `${this.name} processed: ${message.content}`,
    };
  }
}

async function main() {
  // Create runtime
  const runtime = new SingleThreadedAgentRuntime();

  // Register agents
  const agent1 = new EventAgent('Agent1');
  const agent2 = new EventAgent('Agent2');
  const agent1Id = new AgentId('event_agent', 'agent1');
  const agent2Id = new AgentId('event_agent', 'agent2');

  await runtime.registerAgentInstance(agent1, agent1Id);
  await runtime.registerAgentInstance(agent2, agent2Id);

  // Direct messaging
  const response = await runtime.sendMessage(
    { content: 'Hello' },
    agent1Id
  );
  console.log(response);

  // Topic-based messaging
  const topic = new TopicId('updates', 'system');
  await runtime.addSubscription(
    createSubscription('sub1', topic, agent1Id)
  );
  await runtime.addSubscription(
    createSubscription('sub2', topic, agent2Id)
  );

  await runtime.publishMessage(
    { content: 'Broadcast message' },
    topic
  );
}

main().catch(console.error);
```

## Comparison with Traditional Agents

### Traditional Pattern (BaseAgent)

```typescript
const assistant = new AssistantAgent({ name: 'assistant', ... });
const userProxy = new UserProxyAgent({ name: 'user', ... });

// Synchronous-style chat
await userProxy.initiateChat(assistant, 'Hello', 10);
```

### Event-Driven Pattern (AgentRuntime)

```typescript
const runtime = new SingleThreadedAgentRuntime();
const assistantId = new AgentId('assistant', 'default');
const userProxyId = new AgentId('user_proxy', 'default');

await runtime.registerAgentInstance(assistant, assistantId);
await runtime.registerAgentInstance(userProxy, userProxyId);

// Asynchronous message passing
const response = await runtime.sendMessage(
  { content: 'Hello' },
  assistantId,
  userProxyId
);
```

## Benefits

1. **Scalability**: Agents can run across multiple processes or machines
2. **Non-blocking**: Asynchronous by default, no blocking operations
3. **Flexibility**: Mix direct messaging and pub/sub patterns
4. **Resilience**: Better error handling and cancellation support
5. **Observability**: Clear message flow and agent interactions
6. **Distributed**: Ready for distributed deployment

## Architecture Patterns

### Microservices Pattern

```typescript
// Each agent runs in its own runtime
const runtime1 = new SingleThreadedAgentRuntime();
const runtime2 = new SingleThreadedAgentRuntime();

// Agents can communicate across runtimes
// (in production, use distributed runtime)
```

### Event Sourcing

```typescript
// All messages are events
// State can be reconstructed from event history
const state = await runtime.saveState();
```

### CQRS (Command Query Responsibility Segregation)

```typescript
// Commands (sendMessage)
await runtime.sendMessage(command, agentId);

// Queries (through pub/sub)
await runtime.publishMessage(query, queryTopic);
```

## Migration Guide

To use event-driven architecture with existing agents:

1. Create an AgentRuntime
2. Register your existing agents
3. Use sendMessage instead of direct method calls
4. Optionally add pub/sub for broadcast scenarios

```typescript
// Before
const assistant = new AssistantAgent({ ... });
const reply = await assistant.generateReply(messages);

// After
const runtime = new SingleThreadedAgentRuntime();
const agentId = new AgentId('assistant', 'default');
await runtime.registerAgentInstance(assistant, agentId);

const reply = await runtime.sendMessage(
  { content: 'Hello' },
  agentId
);
```

## Best Practices

1. **Use AgentId consistently**: Always identify agents by AgentId
2. **Register agents at startup**: Register all agents before messaging
3. **Handle cancellation**: Use CancellationToken for long operations
4. **Persist state regularly**: Save runtime state for recovery
5. **Use topics wisely**: Group related events by topic
6. **Clean up subscriptions**: Remove subscriptions when no longer needed

## Running Examples

```bash
# Run the event-driven example
npm run example:events
```

## References

- [Microsoft AutoGen v0.4 Documentation](https://microsoft.github.io/autogen/)
- [AutoGen Core Concepts](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
