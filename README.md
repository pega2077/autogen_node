# autogen_node

A Node.js/TypeScript implementation of [microsoft/autogen](https://github.com/microsoft/autogen), providing a framework for building multi-agent AI systems with conversational agents.

## Overview

This project brings the powerful multi-agent orchestration capabilities of Microsoft's AutoGen framework to the Node.js ecosystem. It's designed based on the .NET code structure and class definitions, providing a familiar API for developers working with AutoGen in different languages.

## Features

- **Base Agent Framework**: Core interfaces and abstract classes for building custom agents
- **AssistantAgent**: OpenAI-powered conversational agent (similar to .NET's AssistantAgent)
- **UserProxyAgent**: Human-in-the-loop agent for interactive conversations
- **Type-Safe**: Built with TypeScript for enhanced developer experience
- **Flexible Message System**: Support for different message types and roles
- **Conversation Management**: Built-in conversation history and state management

## Installation

```bash
npm install
```

## Quick Start

```typescript
import { AssistantAgent, UserProxyAgent, HumanInputMode } from './src/index';

// Create an AI assistant
const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful assistant.',
  model: 'gpt-3.5-turbo',
  temperature: 0
});

// Create a user proxy for human interaction
const userProxy = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS
});

// Start a conversation
await userProxy.initiateChat(
  assistant,
  'Hello! Can you help me?',
  10 // max rounds
);
```

## Project Structure

```
autogen_node/
├── src/
│   ├── core/              # Core interfaces and base classes
│   │   ├── IAgent.ts      # Agent interface definitions
│   │   └── BaseAgent.ts   # Base agent implementation
│   ├── agents/            # Agent implementations
│   │   ├── AssistantAgent.ts    # OpenAI-powered assistant
│   │   └── UserProxyAgent.ts    # Human proxy agent
│   ├── examples/          # Example applications
│   │   └── basic-chat.ts  # Basic two-agent conversation
│   └── index.ts           # Main export file
├── dist/                  # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

This implementation follows the .NET AutoGen architecture:

### Core Components

1. **IAgent Interface**: Defines the contract for all agents
   - `generateReply()`: Generate responses to messages
   - `getName()`: Get the agent's name

2. **BaseAgent**: Abstract base class providing:
   - Conversation history management
   - Message sending and receiving
   - Chat initiation logic
   - Termination detection

3. **Agent Implementations**:
   - **AssistantAgent**: Uses OpenAI's API for intelligent responses
   - **UserProxyAgent**: Facilitates human interaction with configurable input modes

### Message System

Messages follow a structured format:
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

## Configuration

Create a `.env` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Scripts

```bash
# Build the project
npm run build

# Run the basic example
npm run example:basic

# Development mode with auto-reload
npm run dev

# Clean build artifacts
npm run clean
```

## Examples

### Basic Two-Agent Chat

```typescript
import { AssistantAgent, UserProxyAgent, HumanInputMode } from './src/index';

const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  systemMessage: 'You are a helpful math tutor.',
  model: 'gpt-3.5-turbo'
});

const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.ALWAYS
});

await user.initiateChat(assistant, 'Help me solve 2x + 3 = 7', 10);
```

### Automated Conversation (No Human Input)

```typescript
const user = new UserProxyAgent({
  name: 'user',
  humanInputMode: HumanInputMode.NEVER
});

// Agent will auto-reply without human intervention
```

## Comparison with .NET AutoGen

| Feature | .NET AutoGen | autogen_node |
|---------|--------------|--------------|
| Base Agent Framework | ✅ | ✅ |
| AssistantAgent | ✅ | ✅ |
| UserProxyAgent | ✅ | ✅ |
| OpenAI Integration | ✅ | ✅ |
| Function Calling | ✅ | 🚧 Planned |
| Group Chat | ✅ | 🚧 Planned |
| Code Execution | ✅ | 🚧 Planned |

## Roadmap

- [ ] Function calling support
- [ ] Group chat capabilities
- [ ] Code execution agent
- [ ] Additional LLM provider integrations (Anthropic, Gemini, etc.)
- [ ] Advanced conversation patterns
- [ ] Testing framework
- [ ] Comprehensive documentation

## Contributing

Contributions are welcome! This project aims to maintain feature parity with the .NET version of AutoGen while adapting to Node.js/TypeScript best practices.

## License

MIT

## Acknowledgments

This project is inspired by and based on the architecture of [microsoft/autogen](https://github.com/microsoft/autogen). Special thanks to the AutoGen team for creating such a powerful framework.

## Related Projects

- [microsoft/autogen](https://github.com/microsoft/autogen) - Original Python implementation
- [microsoft/autogen (dotnet)](https://github.com/microsoft/autogen/tree/main/dotnet) - .NET implementation

