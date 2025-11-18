# Memory Functionality

This document describes the memory functionality in autogen_node, which is based on the Microsoft AutoGen memory implementation pattern.

## Overview

Memory in autogen_node allows agents to maintain context across conversations by storing and retrieving relevant information. This enables agents to:

- Remember user preferences
- Maintain conversation context
- Learn from past interactions
- Provide personalized responses

## Architecture

The memory system consists of:

1. **IMemory Interface** - Abstract interface defining the memory protocol
2. **MemoryContent** - Data structure for memory items
3. **ListMemory** - Simple list-based memory implementation
4. **Agent Integration** - Memory support in BaseAgent and AssistantAgent

## Core Components

### IMemory Interface

The `IMemory` interface defines the standard API for all memory implementations:

```typescript
interface IMemory {
  readonly name: string;
  updateContext(messages: IMessage[]): Promise<UpdateContextResult>;
  query(query: string | MemoryContent, cancellationToken?: AbortSignal): Promise<MemoryQueryResult>;
  add(content: MemoryContent, cancellationToken?: AbortSignal): Promise<void>;
  clear(): Promise<void>;
  close(): Promise<void>;
}
```

### MemoryContent

Memory items are represented by the `MemoryContent` interface:

```typescript
interface MemoryContent {
  content: ContentType;  // string, Buffer, or object
  mimeType: MemoryMimeType | string;
  metadata?: Record<string, any>;
}
```

Supported MIME types:
- `MemoryMimeType.TEXT` - Plain text
- `MemoryMimeType.JSON` - JSON data
- `MemoryMimeType.MARKDOWN` - Markdown formatted text
- `MemoryMimeType.IMAGE` - Image data
- `MemoryMimeType.BINARY` - Binary data

### ListMemory

`ListMemory` is a simple chronological list-based memory implementation:

```typescript
const memory = new ListMemory({ name: 'chat_history' });

// Add memory content
await memory.add({
  content: 'User prefers formal language',
  mimeType: MemoryMimeType.TEXT
});

// Query memories
const result = await memory.query();
console.log(result.results);

// Clear all memories
await memory.clear();
```

## Usage Examples

### Basic Memory Usage

```typescript
import { ListMemory, MemoryContent, MemoryMimeType } from 'autogen_node';

// Create a memory instance
const memory = new ListMemory({ name: 'user_preferences' });

// Add text memory
await memory.add({
  content: 'User prefers concise responses',
  mimeType: MemoryMimeType.TEXT,
  metadata: { timestamp: Date.now() }
});

// Add JSON memory
await memory.add({
  content: { skill_level: 'intermediate', topics: ['AI', 'TypeScript'] },
  mimeType: MemoryMimeType.JSON
});

// Query all memories
const memories = await memory.query();
console.log(memories.results);
```

### Memory with Agents

```typescript
import { AssistantAgent, ListMemory, MemoryMimeType } from 'autogen_node';

// Create memory
const userMemory = new ListMemory({ name: 'user_context' });
await userMemory.add({
  content: 'User is a software engineer interested in AI',
  mimeType: MemoryMimeType.TEXT
});

// Create agent with memory
const assistant = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  memory: [userMemory]  // Pass memory in config
});

// Memory is automatically injected into context
const reply = await assistant.generateReply([
  { role: 'user', content: 'What should I learn next?' }
]);
```

### Adding Memory After Agent Creation

```typescript
const assistant = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});

// Add memory later
const memory = new ListMemory({ name: 'conversation_history' });
await memory.add({
  content: 'Previously discussed TypeScript',
  mimeType: MemoryMimeType.TEXT
});

assistant.addMemory(memory);
```

### Multiple Memory Instances

Agents can use multiple memory instances for different purposes:

```typescript
// User preferences
const preferences = new ListMemory({ name: 'preferences' });
await preferences.add({
  content: 'User likes detailed explanations',
  mimeType: MemoryMimeType.TEXT
});

// Conversation history
const history = new ListMemory({ name: 'history' });
await history.add({
  content: 'Previous topic: Machine Learning',
  mimeType: MemoryMimeType.TEXT
});

// Agent with multiple memories
const assistant = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  memory: [preferences, history]
});
```

### Direct Memory Manipulation

You can directly access and modify memory contents:

```typescript
const memory = new ListMemory({ name: 'test' });

// Direct property access
memory.content = [
  { content: 'New content 1', mimeType: MemoryMimeType.TEXT },
  { content: 'New content 2', mimeType: MemoryMimeType.TEXT }
];

// Get current contents
const currentContents = memory.content;
```

## How Memory Works

When an agent with memory generates a reply:

1. The agent calls `applyMemoryToMessages()` before sending to the LLM
2. Each memory's `updateContext()` method is called in order
3. Memory content is injected as a system message
4. If a system message exists, memory is appended to it
5. If no system message exists, a new one is created
6. The LLM receives the messages with memory context

Example of memory injection:

```
Original messages:
[
  { role: 'user', content: 'Hello' }
]

After memory injection:
[
  {
    role: 'system',
    content: `
Relevant memory content (in chronological order):
1. User prefers formal language
2. User is interested in TypeScript
    `
  },
  { role: 'user', content: 'Hello' }
]
```

## API Reference

### ListMemory

#### Constructor
```typescript
constructor(config?: ListMemoryConfig)
```

**Parameters:**
- `config.name` (optional) - Memory instance name
- `config.memoryContents` (optional) - Initial memory contents

#### Methods

**add(content: MemoryContent, cancellationToken?: AbortSignal): Promise<void>**
- Adds new content to memory

**query(query?: string | MemoryContent, cancellationToken?: AbortSignal): Promise<MemoryQueryResult>**
- Returns all stored memories (query parameter is ignored in ListMemory)

**updateContext(messages: IMessage[]): Promise<UpdateContextResult>**
- Injects memory content into message context

**clear(): Promise<void>**
- Clears all memory content

**close(): Promise<void>**
- Cleanup resources (no-op for ListMemory)

#### Properties

**name: string** (readonly)
- Memory instance identifier

**content: MemoryContent[]** (read/write)
- Direct access to memory contents

### BaseAgent Memory Methods

**addMemory(memory: IMemory): void**
- Adds a memory instance to the agent

**getMemory(): IMemory[]**
- Returns all memory instances

**clearMemory(): void**
- Removes all memory instances from the agent

## Best Practices

1. **Use descriptive memory names** - Makes it easier to manage multiple memories
   ```typescript
   const userPrefs = new ListMemory({ name: 'user_preferences' });
   const chatHistory = new ListMemory({ name: 'conversation_history' });
   ```

2. **Add metadata** - Include timestamps, sources, or other context
   ```typescript
   await memory.add({
     content: 'Important fact',
     mimeType: MemoryMimeType.TEXT,
     metadata: { timestamp: Date.now(), source: 'user_input', importance: 'high' }
   });
   ```

3. **Use appropriate MIME types** - Helps with future processing
   ```typescript
   // For structured data
   await memory.add({
     content: { key: 'value' },
     mimeType: MemoryMimeType.JSON
   });
   
   // For text
   await memory.add({
     content: 'Plain text',
     mimeType: MemoryMimeType.TEXT
   });
   ```

4. **Organize memories by purpose** - Use multiple memory instances for different types of information
   ```typescript
   const userContext = new ListMemory({ name: 'user_context' });
   const systemRules = new ListMemory({ name: 'system_rules' });
   const tempNotes = new ListMemory({ name: 'temporary_notes' });
   ```

5. **Clean up when done** - Call `close()` when memory is no longer needed
   ```typescript
   await memory.close();
   ```

## Future Extensions

The memory system is designed to be extensible. Future implementations could include:

- **VectorMemory** - Vector database backed memory with semantic search
- **FileMemory** - Persistent file-based memory
- **DatabaseMemory** - SQL/NoSQL database backed memory
- **RAGMemory** - Retrieval-Augmented Generation memory
- **CanvasMemory** - Document-oriented memory for collaborative editing

## Complete Example

See `src/examples/memory-example.ts` for a complete working example that demonstrates:
- Creating and using memory instances
- Adding different types of memory content
- Using memory with agents
- Multiple memory instances
- Dynamic memory updates
- Memory queries and manipulation

Run the example:
```bash
npm run example:memory
```

## Comparison with Python AutoGen

This implementation closely follows the Python AutoGen memory API:

| Python AutoGen | autogen_node |
|----------------|--------------|
| `Memory` (ABC) | `IMemory` (interface) |
| `MemoryContent` | `MemoryContent` |
| `MemoryMimeType` | `MemoryMimeType` |
| `ListMemory` | `ListMemory` |
| `update_context()` | `updateContext()` |
| `add()` | `add()` |
| `query()` | `query()` |
| `clear()` | `clear()` |
| `close()` | `close()` |

The main differences:
- TypeScript uses interfaces instead of abstract base classes
- Async/await instead of Python's async/await syntax
- TypeScript type definitions instead of Python type hints
- camelCase instead of snake_case (TypeScript convention)
