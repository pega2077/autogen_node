# Getting Started with AutoGen Node.js

This guide will help you get started with building multi-agent AI systems using autogen_node.

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- An OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ojama/autogen_node.git
cd autogen_node
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Building the Project

Compile the TypeScript code:
```bash
npm run build
```

This will create the compiled JavaScript in the `dist/` directory.

## Running Examples

### Example 1: Automated Conversation

This example demonstrates two AI agents having an automated conversation about solving a math problem:

```bash
npm run example:auto
```

### Example 2: Interactive Chat

This example allows you to chat interactively with an AI assistant:

```bash
npm run example:basic
```

## Core Concepts

### Agents

An **agent** is an autonomous entity that can:
- Generate responses to messages
- Maintain conversation history
- Initiate conversations with other agents
- Handle different message types

### Agent Types

#### AssistantAgent

An AI-powered agent that uses OpenAI's API to generate intelligent responses.

```typescript
import { AssistantAgent } from './src/index';

const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful assistant.',
  model: 'gpt-3.5-turbo',
  temperature: 0
});
```

#### UserProxyAgent

An agent that can represent a human user with configurable input modes.

```typescript
import { UserProxyAgent, HumanInputMode } from './src/index';

const userProxy = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS // Request human input for every message
});
```

### Human Input Modes

- **ALWAYS**: Always request human input
- **NEVER**: Never request human input (agent auto-replies)
- **TERMINATE**: Only request human input when a termination message is detected

### Message Format

Messages follow a structured format:

```typescript
interface IMessage {
  content: string;                    // The message content
  role: 'user' | 'assistant' | 'system' | 'function';
  name?: string;                       // The agent's name
  functionCall?: {                     // Optional function call data
    name: string;
    arguments: string;
  };
}
```

## Creating Your First Agent System

### Step 1: Import Required Classes

```typescript
import { AssistantAgent, UserProxyAgent, HumanInputMode } from './src/index';
import * as dotenv from 'dotenv';

dotenv.config();
```

### Step 2: Create Agents

```typescript
// Create an AI assistant
const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful coding assistant.',
  model: 'gpt-3.5-turbo',
  temperature: 0
});

// Create a user proxy
const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS
});
```

### Step 3: Initiate Conversation

```typescript
await user.initiateChat(
  assistant,
  'Hello! Can you help me write a function to reverse a string in JavaScript?',
  10 // maximum conversation rounds
);
```

### Step 4: Clean Up

```typescript
user.close(); // Close the readline interface
```

## Advanced Usage

### Custom System Messages

You can customize an agent's behavior with detailed system messages:

```typescript
const codeReviewer = new AssistantAgent({
  name: 'reviewer',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: `You are an expert code reviewer. 
    When reviewing code:
    1. Check for bugs and logic errors
    2. Suggest improvements for readability
    3. Identify performance issues
    4. Recommend best practices
    Always be constructive and helpful.`,
  model: 'gpt-4',
  temperature: 0.3
});
```

### Configuring Temperature

Temperature controls randomness in responses:
- **0.0**: Deterministic, focused responses
- **0.5**: Balanced creativity and consistency
- **1.0**: Maximum creativity and variation

```typescript
const creativeWriter = new AssistantAgent({
  name: 'writer',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a creative story writer.',
  model: 'gpt-3.5-turbo',
  temperature: 0.9 // High creativity
});
```

### Accessing Conversation History

```typescript
// Get the full conversation history
const history = assistant.getConversationHistory();

console.log('Conversation history:');
history.forEach((msg, i) => {
  console.log(`${i + 1}. [${msg.role}] ${msg.content}`);
});

// Clear conversation history (except system message)
assistant.clearHistory();
```

### Custom Termination Conditions

```typescript
const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.TERMINATE,
  isTerminationMsg: (msg) => {
    // Custom termination logic
    return msg.content.includes('goodbye') || 
           msg.content.includes('done') ||
           msg.content.includes('TERMINATE');
  }
});
```

## Use Cases

### 1. Customer Support Bot

```typescript
const supportBot = new AssistantAgent({
  name: 'support',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: `You are a customer support agent.
    Be friendly, helpful, and professional.
    If you cannot solve an issue, escalate to a human agent.`,
  model: 'gpt-3.5-turbo'
});
```

### 2. Code Generation Assistant

```typescript
const codingAssistant = new AssistantAgent({
  name: 'coder',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: `You are an expert programmer.
    Write clean, well-documented code.
    Explain your code choices.`,
  model: 'gpt-4'
});
```

### 3. Educational Tutor

```typescript
const tutor = new AssistantAgent({
  name: 'tutor',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: `You are a patient tutor.
    Break down complex topics into simple explanations.
    Use examples and analogies to aid understanding.`,
  model: 'gpt-3.5-turbo'
});
```

## Next Steps

- Explore the examples in `src/examples/`
- Read the full API documentation
- Check out the roadmap for upcoming features
- Contribute to the project!

## Troubleshooting

### Issue: "Please set OPENAI_API_KEY environment variable"

**Solution**: Create a `.env` file in the project root with your OpenAI API key:
```
OPENAI_API_KEY=sk-...your-key-here...
```

### Issue: Build errors with TypeScript

**Solution**: Make sure you have TypeScript installed and run:
```bash
npm install
npm run build
```

### Issue: Module not found errors

**Solution**: Ensure all dependencies are installed:
```bash
npm install
```

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/ojama/autogen_node).
