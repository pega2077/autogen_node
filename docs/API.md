# API Reference

## Core Interfaces

### IMessage

Represents a message in the agent communication system.

```typescript
interface IMessage {
  content: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}
```

**Properties:**
- `content`: The text content of the message
- `role`: The role of the message sender
- `name`: Optional name of the agent
- `functionCall`: Optional function call information

### IAgent

Base interface for all agents.

```typescript
interface IAgent {
  name: string;
  generateReply(messages: IMessage[], cancellationToken?: AbortSignal): Promise<IMessage>;
  getName(): string;
}
```

**Methods:**
- `generateReply(messages, cancellationToken?)`: Generate a reply based on conversation history
- `getName()`: Get the agent's name

### IAgentConfig

Configuration for creating an agent.

```typescript
interface IAgentConfig {
  name: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
}
```

## Base Classes

### BaseAgent

Abstract base class for all conversable agents.

```typescript
abstract class BaseAgent implements IAgent {
  constructor(config: IAgentConfig)
  
  abstract generateReply(
    messages: IMessage[], 
    cancellationToken?: AbortSignal
  ): Promise<IMessage>
  
  getName(): string
  getConversationHistory(): IMessage[]
  clearHistory(): void
  
  send(
    message: string | IMessage, 
    recipient: IAgent, 
    requestReply?: boolean
  ): Promise<IMessage | null>
  
  initiateChat(
    recipient: IAgent, 
    message: string, 
    maxRounds?: number
  ): Promise<IMessage[]>
  
  protected isTerminationMessage(message: IMessage): boolean
  protected addToHistory(message: IMessage): void
}
```

**Constructor Parameters:**
- `config`: Agent configuration object

**Methods:**

#### `generateReply(messages, cancellationToken?)`
Generate a reply based on received messages.
- **Parameters:**
  - `messages`: Array of previous messages
  - `cancellationToken`: Optional abort signal
- **Returns:** Promise<IMessage>

#### `getName()`
Get the agent's name.
- **Returns:** string

#### `getConversationHistory()`
Get a copy of the conversation history.
- **Returns:** IMessage[]

#### `clearHistory()`
Clear the conversation history (keeps system message).
- **Returns:** void

#### `send(message, recipient, requestReply?)`
Send a message to another agent.
- **Parameters:**
  - `message`: String or IMessage to send
  - `recipient`: Target agent
  - `requestReply`: Whether to request a reply (default: true)
- **Returns:** Promise<IMessage | null>

#### `initiateChat(recipient, message, maxRounds?)`
Start a conversation with another agent.
- **Parameters:**
  - `recipient`: Agent to chat with
  - `message`: Initial message
  - `maxRounds`: Maximum conversation rounds (default: 10)
- **Returns:** Promise<IMessage[]>

## Agent Implementations

### AssistantAgent

AI-powered agent using OpenAI's API.

```typescript
class AssistantAgent extends BaseAgent {
  constructor(config: OpenAIAgentConfig)
  
  generateReply(
    messages: IMessage[], 
    cancellationToken?: AbortSignal
  ): Promise<IMessage>
  
  setModel(model: string): void
  setTemperature(temperature: number): void
}
```

**Configuration (OpenAIAgentConfig):**

```typescript
interface OpenAIAgentConfig extends IAgentConfig {
  apiKey: string;          // OpenAI API key
  model?: string;          // Model name (default: 'gpt-3.5-turbo')
  temperature?: number;    // Temperature (default: 0)
  maxTokens?: number;      // Max tokens (default: 1000)
}
```

**Example:**

```typescript
const assistant = new AssistantAgent({
  name: 'my_assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful assistant.',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000
});
```

**Methods:**

#### `setModel(model)`
Update the OpenAI model.
- **Parameters:**
  - `model`: Model name (e.g., 'gpt-4', 'gpt-3.5-turbo')

#### `setTemperature(temperature)`
Update the temperature setting.
- **Parameters:**
  - `temperature`: Value between 0 and 1

### UserProxyAgent

Agent that represents a human user.

```typescript
class UserProxyAgent extends BaseAgent {
  constructor(config: UserProxyConfig)
  
  generateReply(
    messages: IMessage[], 
    cancellationToken?: AbortSignal
  ): Promise<IMessage>
  
  close(): void
}
```

**Configuration (UserProxyConfig):**

```typescript
interface UserProxyConfig extends IAgentConfig {
  humanInputMode?: HumanInputMode;
  isTerminationMsg?: (message: IMessage) => boolean;
}

enum HumanInputMode {
  ALWAYS = 'ALWAYS',      // Always request human input
  TERMINATE = 'TERMINATE', // Request input on termination
  NEVER = 'NEVER'         // Never request input (auto-reply)
}
```

**Example:**

```typescript
const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS,
  isTerminationMsg: (msg) => msg.content.includes('goodbye')
});
```

**Methods:**

#### `close()`
Close the readline interface.
- **Returns:** void

## Usage Examples

### Basic Two-Agent Conversation

```typescript
import { AssistantAgent, UserProxyAgent, HumanInputMode } from 'autogen_node';

const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful assistant.',
  model: 'gpt-3.5-turbo'
});

const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS
});

// Start conversation
const history = await user.initiateChat(
  assistant,
  'Hello! How are you?',
  5
);

// Clean up
user.close();
```

### Automated Agent-to-Agent Communication

```typescript
const agent1 = new AssistantAgent({
  name: 'agent1',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a problem solver.',
  model: 'gpt-3.5-turbo'
});

const agent2 = new AssistantAgent({
  name: 'agent2',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a critic who finds issues.',
  model: 'gpt-3.5-turbo'
});

await agent1.initiateChat(
  agent2,
  'Here is my solution to the problem...',
  3
);
```

### Managing Conversation History

```typescript
// Get history
const history = agent.getConversationHistory();
console.log(`Total messages: ${history.length}`);

// Process each message
history.forEach((msg, i) => {
  console.log(`${i}. [${msg.role}] ${msg.content}`);
});

// Clear history
agent.clearHistory();
```

### Custom Termination Logic

```typescript
const agent = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.TERMINATE,
  isTerminationMsg: (msg) => {
    // Terminate on specific keywords
    const terminationWords = ['done', 'complete', 'finished'];
    return terminationWords.some(word => 
      msg.content.toLowerCase().includes(word)
    );
  }
});
```

## Error Handling

All async methods can throw errors. Always use try-catch:

```typescript
try {
  const reply = await assistant.generateReply(messages);
  console.log('Reply:', reply.content);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

## Type Definitions

All types are exported from the main index:

```typescript
import {
  // Interfaces
  IAgent,
  IMessage,
  IAgentConfig,
  
  // Base classes
  BaseAgent,
  
  // Agents
  AssistantAgent,
  OpenAIAgentConfig,
  UserProxyAgent,
  UserProxyConfig,
  HumanInputMode
} from 'autogen_node';
```

## Best Practices

1. **Always close UserProxyAgent**: Call `close()` when done to clean up readline interface
2. **Use appropriate temperature**: Lower for factual tasks, higher for creative tasks
3. **Implement error handling**: Wrap API calls in try-catch blocks
4. **Clear history when needed**: Prevent context overflow by clearing history periodically
5. **Set max rounds**: Always specify maxRounds in initiateChat to prevent infinite loops
6. **Use system messages**: Provide clear instructions to guide agent behavior
