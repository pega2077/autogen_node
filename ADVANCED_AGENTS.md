# Advanced Agent Types

This document describes the advanced agent types available in autogen_node, based on Microsoft AutoGen.

## Table of Contents

- [ConversableAgent](#conversableagent)
- [RetrieveUserProxyAgent](#retrieveuserproxyagent)
- [GPTAssistantAgent](#gptassistantagent)
- [MultimodalConversableAgent](#multimodalconversableagent)
- [TeachableAgent](#teachableagent)
- [CompressibleAgent](#compressibleagent)
- [SocietyOfMindAgent](#societyofmindagent)

## ConversableAgent

A more flexible conversable agent that extends BaseAgent with optional LLM integration and configurable auto-reply behaviors.

### Features

- Optional LLM integration (can work without LLM)
- Configurable human input modes
- Auto-reply limits
- Function calling support
- Termination message detection
- More flexible than AssistantAgent or UserProxyAgent

### Example Usage

```typescript
import { ConversableAgent } from 'autogen_node';

// Create agent without LLM (simple auto-reply)
const simpleAgent = new ConversableAgent({
  name: 'simple_agent',
  defaultAutoReply: 'I acknowledge your message.',
  maxConsecutiveAutoReply: 5
});

// Create agent with LLM
const llmAgent = new ConversableAgent({
  name: 'llm_agent',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-3.5-turbo',
  maxConsecutiveAutoReply: 10
});

// Use custom termination function
const customAgent = new ConversableAgent({
  name: 'custom_agent',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  isTerminationMsg: (msg) => msg.content.includes('DONE')
});
```

## RetrieveUserProxyAgent

A user proxy agent with Retrieval-Augmented Generation (RAG) capabilities for knowledge base integration.

### Features

- Retrieve relevant documents from a knowledge base
- Augment conversations with retrieved context
- Support code execution like UserProxyAgent
- Work with vector databases or custom retrieval functions
- Multiple task types (QA, code, default)

### Example Usage

```typescript
import { RetrieveUserProxyAgent, DocumentChunk } from 'autogen_node';

// Define a custom retrieval function
async function retrieveDocuments(query: string, nResults?: number): Promise<DocumentChunk[]> {
  // Your vector DB or search logic here
  return [
    {
      content: 'Relevant document content',
      score: 0.95,
      metadata: { source: 'docs/tutorial.md' }
    }
  ];
}

// Create RAG agent for Q&A
const ragAgent = new RetrieveUserProxyAgent({
  name: 'rag_agent',
  retrieveConfig: {
    task: 'qa',
    retrievalFunction: retrieveDocuments,
    nResults: 5,
    distanceThreshold: 0.8,
    updateContext: true
  }
});

// Use in conversation
const messages = [
  { role: 'assistant', content: 'What is the main feature of this product?' }
];

const reply = await ragAgent.generateReply(messages);
console.log(reply.content); // Includes retrieved context
```

## GPTAssistantAgent

An agent that integrates with OpenAI's Assistant API for persistent assistant instances and advanced features.

### Features

- Integration with OpenAI Assistant API
- Persistent assistant instances
- Built-in tools (code interpreter, retrieval)
- Thread-based conversation management
- File handling capabilities

### Example Usage

```typescript
import { GPTAssistantAgent } from 'autogen_node';

// Create new assistant
const assistant = new GPTAssistantAgent({
  name: 'gpt_assistant',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-turbo-preview',
  instructions: 'You are a helpful coding assistant.',
  tools: [
    { type: 'code_interpreter' },
    { type: 'retrieval' }
  ]
});

// Use existing assistant
const existingAssistant = new GPTAssistantAgent({
  name: 'existing_assistant',
  apiKey: process.env.OPENAI_API_KEY,
  assistantId: 'asst_abc123'
});

// Upload and attach files
const fileId = await assistant.uploadFile('./docs/api.md');
await assistant.addFile(fileId);

// Generate reply
const reply = await assistant.generateReply([
  { role: 'user', content: 'Explain the API documentation' }
]);

// Reset conversation thread
await assistant.resetThread();
```

## MultimodalConversableAgent

A conversable agent that supports multimodal inputs including images, audio, and video.

### Features

- Support for images, audio, and video inputs
- Vision capabilities (image understanding)
- Audio processing
- Flexible content handling
- Compatible with multimodal LLMs (GPT-4 Vision, Gemini Pro Vision)

### Example Usage

```typescript
import { MultimodalConversableAgent } from 'autogen_node';

// Create multimodal agent
const visionAgent = new MultimodalConversableAgent({
  name: 'vision_agent',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4-vision-preview',
  imageDetailLevel: 'high'
});

// Describe an image from URL
const description = await visionAgent.describeImage(
  'https://example.com/image.jpg',
  'What objects are in this image?'
);

// Describe an image from file
const fileDescription = await visionAgent.describeImageFile(
  './photo.jpg',
  'Analyze this photo',
  'image/jpeg'
);

// Compare two images
const comparison = await visionAgent.compareImages(
  'https://example.com/before.jpg',
  'https://example.com/after.jpg',
  'What changed between these images?'
);

// Create multimodal message manually
const message = visionAgent.createMultimodalMessage([
  MultimodalConversableAgent.createTextContent('Describe these images'),
  MultimodalConversableAgent.createImageUrlContent('https://example.com/img1.jpg'),
  MultimodalConversableAgent.createImageUrlContent('https://example.com/img2.jpg')
], 'user');
```

## TeachableAgent

A conversable agent that can learn from user interactions and remember preferences.

### Features

- Learning from user corrections and feedback
- Remembering user preferences
- Storing and recalling facts
- Personalized responses based on learned information
- Persistent memory across sessions

### Example Usage

```typescript
import { TeachableAgent } from 'autogen_node';

// Create teachable agent
const teachable = new TeachableAgent({
  name: 'teachable_agent',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  teachMode: true,
  memoryStoragePath: './agent_memory.json'
});

// Manually teach the agent
await teachable.teach('user_name', 'Alice', 'user_fact');
await teachable.teach('preferred_language', 'TypeScript', 'user_preference');

// Agent learns automatically from conversations
const messages = [
  { role: 'user', content: 'Remember that I prefer dark mode.' }
];
await teachable.generateReply(messages);

// Recall information
const userName = teachable.recall('user_name');
console.log(userName?.value); // 'Alice'

// Search memories
const preferences = teachable.recallByCategory('user_preference');
const searchResults = teachable.searchMemories('TypeScript');

// Export/import memories
const exported = teachable.exportMemories();
await teachable.importMemories(exported);

// Get statistics
const stats = teachable.getMemoryStats();
console.log(`Total memories: ${stats.totalMemories}`);
```

## CompressibleAgent

A conversable agent that can compress conversation history for long dialogues.

### Features

- Automatic conversation history compression
- Multiple compression strategies (summarize, truncate, sliding window, hybrid)
- Configurable compression triggers
- Preservation of important context
- Memory-efficient long conversations

### Example Usage

```typescript
import { CompressibleAgent } from 'autogen_node';

// Create agent with summarization compression
const summarizer = new CompressibleAgent({
  name: 'summarizer',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  compressionStrategy: 'summarize',
  compressionTrigger: 50,
  maxMessages: 100,
  preserveRecentMessages: 10
});

// Create agent with truncate compression
const truncator = new CompressibleAgent({
  name: 'truncator',
  compressionStrategy: 'truncate',
  compressionTrigger: 30,
  maxMessages: 50,
  defaultAutoReply: 'Understood.'
});

// Agent automatically compresses when threshold is reached
for (let i = 0; i < 60; i++) {
  await agent.generateReply([
    { role: 'user', content: `Message ${i}` }
  ]);
}

// Manual compression
await agent.compress();

// Get compression statistics
const stats = agent.getCompressionStats();
console.log(`Compressed ${stats.compressionCount} times`);
console.log(`Current messages: ${stats.currentMessageCount}`);

// Change strategy
agent.setCompressionStrategy('hybrid');
agent.setCompressionTrigger(40);
```

## SocietyOfMindAgent

A Society of Mind agent that uses multiple internal agents for complex reasoning.

### Features

- Multiple specialized inner agents working together
- Different orchestration strategies (sequential, parallel, debate, voting)
- Complex problem decomposition and solving
- Consensus-based decision making
- Emergent intelligence from agent collaboration

### Example Usage

```typescript
import { SocietyOfMindAgent, ConversableAgent } from 'autogen_node';

// Create specialized inner agents
const analyst = new ConversableAgent({
  name: 'analyst',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  systemMessage: 'You are a data analyst focusing on facts and numbers.'
});

const critic = new ConversableAgent({
  name: 'critic',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  systemMessage: 'You are a critical thinker who challenges assumptions.'
});

const designer = new ConversableAgent({
  name: 'designer',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  systemMessage: 'You are a creative designer focused on user experience.'
});

// Create society with sequential processing
const society = new SocietyOfMindAgent({
  name: 'society',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  orchestrationStrategy: 'sequential',
  maxInnerRounds: 5,
  innerAgents: [
    { agent: analyst, role: 'Data Analyst', expertise: 'Statistics', priority: 3 },
    { agent: critic, role: 'Critical Thinker', expertise: 'Logic', priority: 2 },
    { agent: designer, role: 'UX Designer', expertise: 'Design', priority: 1 }
  ]
});

// Use parallel processing for independent analysis
const parallelSociety = new SocietyOfMindAgent({
  name: 'parallel_society',
  orchestrationStrategy: 'parallel',
  innerAgents: [
    { agent: analyst, role: 'Analyst' },
    { agent: designer, role: 'Designer' }
  ]
});

// Use debate for refined answers
const debateSociety = new SocietyOfMindAgent({
  name: 'debate_society',
  orchestrationStrategy: 'debate',
  maxInnerRounds: 3,
  enableDebate: true,
  innerAgents: [
    { agent: analyst, role: 'Analyst' },
    { agent: critic, role: 'Critic' }
  ]
});

// Generate reply
const reply = await society.generateReply([
  { role: 'user', content: 'Design a new mobile app feature' }
]);

// Get statistics
const stats = society.getSocietyStats();
console.log(`Society has ${stats.innerAgentCount} agents`);
console.log(`Using ${stats.orchestrationStrategy} strategy`);
```

## Comparison Table

| Feature | ConversableAgent | RetrieveUserProxyAgent | GPTAssistantAgent | MultimodalConversableAgent | TeachableAgent | CompressibleAgent | SocietyOfMindAgent |
|---------|-----------------|------------------------|-------------------|---------------------------|----------------|-------------------|-------------------|
| LLM Integration | Optional | No | Required (OpenAI) | Optional | Optional | Optional | Optional |
| RAG Support | No | ✅ | Via Assistant API | No | No | No | No |
| Multimodal | No | No | No | ✅ | No | No | No |
| Memory/Learning | No | No | No | No | ✅ | No | No |
| Compression | No | No | No | No | No | ✅ | No |
| Multi-Agent | No | No | No | No | No | No | ✅ |
| Code Execution | No | ✅ | Via Assistant API | No | No | No | No |
| Use Case | Flexible agent | Document Q&A | Persistent assistant | Image/audio analysis | Personalized assistant | Long conversations | Complex reasoning |

## Migration Guide

### From AssistantAgent to ConversableAgent

```typescript
// Before
const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});

// After (same functionality)
const agent = new ConversableAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY
});
```

### From UserProxyAgent to RetrieveUserProxyAgent

```typescript
// Before
const proxy = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.NEVER
});

// After (with RAG)
const proxy = new RetrieveUserProxyAgent({
  name: 'user',
  humanInputMode: 'NEVER',
  retrieveConfig: {
    task: 'qa',
    retrievalFunction: myRetrievalFunction
  }
});
```

## Best Practices

1. **ConversableAgent**: Use when you need flexibility - can work with or without LLM, good for prototyping
2. **RetrieveUserProxyAgent**: Use for knowledge-based Q&A, document search, and RAG applications
3. **GPTAssistantAgent**: Use when you need persistent state, file handling, or OpenAI's advanced features
4. **MultimodalConversableAgent**: Use for image analysis, vision tasks, or any multimodal interactions
5. **TeachableAgent**: Use for personalized assistants that need to learn user preferences over time
6. **CompressibleAgent**: Use for long-running conversations that might exceed context limits
7. **SocietyOfMindAgent**: Use for complex problems that benefit from multiple perspectives

## See Also

- [Main README](./README.md)
- [API Documentation](./API.md)
- [LLM Providers](./LLM_PROVIDERS.md)
- [Memory System](./MEMORY.md)
