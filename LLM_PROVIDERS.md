# LLM Provider Support

AutoGen Node.js now supports multiple LLM providers, allowing you to use different AI models and services.

## Supported Providers

### 1. OpenAI
The original and default provider.

**Setup:**
```bash
# Get API key from https://platform.openai.com/api-keys
export OPENAI_API_KEY=sk-your-key-here
```

**Usage:**
```typescript
import { AssistantAgent } from 'autogen_node';

const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',  // or omit (default)
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-3.5-turbo',  // or 'gpt-4', 'gpt-4-turbo', etc.
  temperature: 0.7,
  maxTokens: 1000
});
```

**Available Models:**
- `gpt-3.5-turbo` - Fast, cost-effective
- `gpt-4` - More capable, higher quality
- `gpt-4-turbo` - Latest GPT-4 variant
- `gpt-4-vision` - Multimodal (text + images)

### 2. OpenRouter
Access to multiple LLM providers through a single API.

**Setup:**
```bash
# Get API key from https://openrouter.ai/
export OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Usage:**
```typescript
import { AssistantAgent } from 'autogen_node';

const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'openai/gpt-3.5-turbo',  // Note: provider/model format
  temperature: 0.7,
  maxTokens: 1000
});
```

**Available Models (Examples):**
- `openai/gpt-3.5-turbo` - OpenAI GPT-3.5
- `openai/gpt-4` - OpenAI GPT-4
- `anthropic/claude-2` - Anthropic Claude 2
- `anthropic/claude-instant-v1` - Claude Instant
- `google/palm-2-chat-bison` - Google PaLM 2
- `meta-llama/llama-2-70b-chat` - Meta Llama 2
- `mistralai/mistral-7b-instruct` - Mistral 7B

See full list at: https://openrouter.ai/docs#models

**Benefits:**
- Single API key for multiple providers
- Automatic fallbacks
- Cost optimization
- Access to open-source models

### 3. Ollama
Run LLMs locally on your machine.

**Setup:**
```bash
# 1. Install Ollama
# macOS/Linux:
curl https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.ai/download

# 2. Pull a model
ollama pull llama2
ollama pull mistral
ollama pull codellama

# 3. Ollama server starts automatically
```

**Usage:**
```typescript
import { AssistantAgent } from 'autogen_node';

const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'ollama',
  model: 'llama2',  // or 'mistral', 'codellama', etc.
  baseURL: 'http://localhost:11434/v1',  // optional, this is default
  temperature: 0.7,
  maxTokens: 500
});
```

**Available Models (Examples):**
- `llama2` - Meta's Llama 2 (7B, 13B, 70B)
- `llama2:70b` - Specific size variant
- `mistral` - Mistral 7B
- `codellama` - Code-specialized Llama
- `vicuna` - Vicuna
- `orca-mini` - Smaller, faster models
- `neural-chat` - Intel's Neural Chat
- `starling-lm` - Starling

See full list: `ollama list` or https://ollama.ai/library

**Benefits:**
- Completely local, no API key needed
- Works offline
- Privacy - data stays on your machine
- No usage costs
- Fast inference on local GPU

### 4. Anthropic
Use Claude models via the official Anthropic SDK.

**Setup:**
```bash
# Get API key from https://console.anthropic.com/
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Usage:**
```typescript
import { AssistantAgent } from 'autogen_node';

const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 1000
});
```

**Available Models:**
- `claude-3-5-sonnet-20241022` - Best balance of speed and capability
- `claude-3-opus-20240229` - Most capable, highest intelligence
- `claude-3-haiku-20240307` - Fastest, most cost-effective

**Benefits:**
- Native Anthropic SDK integration
- Full support for Claude's advanced features
- Tool/function calling support
- Large context windows (up to 200K tokens)
- Strong reasoning and coding capabilities

### 5. Google Gemini
Use Google's Gemini models via the official Google Generative AI SDK.

**Setup:**
```bash
# Get API key from https://makersuite.google.com/app/apikey
export GEMINI_API_KEY=your-gemini-key-here
```

**Usage:**
```typescript
import { AssistantAgent } from 'autogen_node';

const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 1000
});
```

**Available Models:**
- `gemini-1.5-flash` - Fast and efficient, cost-effective
- `gemini-1.5-pro` - More capable, balanced performance
- `gemini-pro` - Standard model

**Benefits:**
- Native Google Generative AI SDK integration
- Fast response times
- Competitive pricing
- Function calling support
- Large context windows
- Multimodal capabilities

## Provider Comparison

| Feature | OpenAI | OpenRouter | Ollama | Anthropic | Gemini |
|---------|--------|------------|--------|-----------|--------|
| **API Key Required** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Cost** | Pay per token | Pay per token | Free (local) | Pay per token | Pay per token |
| **Internet Required** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Privacy** | Cloud | Cloud | Local | Cloud | Cloud |
| **Speed** | Fast | Fast | Depends on hardware | Fast | Very Fast |
| **Model Selection** | OpenAI only | 100+ models | 50+ models | Claude models | Gemini models |
| **Setup Difficulty** | Easy | Easy | Medium | Easy | Easy |
| **Function Calling** | ✅ Yes | ✅ Yes | Limited | ✅ Yes | ✅ Yes |
| **Best For** | Production, OpenAI models | Multi-model access | Privacy, offline use | Advanced reasoning | Fast, cost-effective |

## Examples

### Example 1: Using Different Providers

```typescript
import { AssistantAgent } from 'autogen_node';

// OpenAI agent
const openaiAgent = new AssistantAgent({
  name: 'openai_assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-3.5-turbo'
});

// OpenRouter agent with Claude
const claudeAgent = new AssistantAgent({
  name: 'claude_assistant',
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'anthropic/claude-2'
});

// Native Anthropic agent
const anthropicAgent = new AssistantAgent({
  name: 'anthropic_assistant',
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-3-5-sonnet-20241022'
});

// Google Gemini agent
const geminiAgent = new AssistantAgent({
  name: 'gemini_assistant',
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-1.5-flash'
});

// Local Ollama agent
const localAgent = new AssistantAgent({
  name: 'local_assistant',
  provider: 'ollama',
  model: 'llama2'
});

// All agents have the same interface!
const reply = await openaiAgent.generateReply([
  { role: 'user', content: 'Hello!' }
]);
```

### Example 2: Group Chat with Mixed Providers

```typescript
import { AssistantAgent, GroupChat, GroupChatManager } from 'autogen_node';

// Create agents using different providers
const gptExpert = new AssistantAgent({
  name: 'gpt_expert',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4',
  systemMessage: 'You are an expert analyst.'
});

const localCritic = new AssistantAgent({
  name: 'local_critic',
  provider: 'ollama',
  model: 'llama2',
  systemMessage: 'You are a critical reviewer.'
});

// Mix them in a group chat
const groupChat = new GroupChat({
  agents: [gptExpert, localCritic],
  maxRound: 6
});

const manager = new GroupChatManager({ groupChat });
await manager.runChat('Analyze this business proposal...');
```

### Example 3: Provider Failover Pattern

```typescript
async function createResilientAgent(name: string): Promise<AssistantAgent> {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    return new AssistantAgent({
      name,
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo'
    });
  }
  
  // Fallback to OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    return new AssistantAgent({
      name,
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: 'openai/gpt-3.5-turbo'
    });
  }
  
  // Final fallback to local Ollama
  return new AssistantAgent({
    name,
    provider: 'ollama',
    model: 'llama2'
  });
}
```

## Running the Examples

```bash
# OpenAI example (original)
export OPENAI_API_KEY=sk-your-key
npm run example:auto

# OpenRouter example
export OPENROUTER_API_KEY=sk-or-v1-your-key
npm run example:openrouter

# Anthropic example
export ANTHROPIC_API_KEY=sk-ant-your-key
npm run example:anthropic

# Gemini example
export GEMINI_API_KEY=your-gemini-key
npm run example:gemini

# Ollama example (requires Ollama installed)
ollama pull llama2
npm run example:ollama
```

## Configuration Reference

### AssistantAgentConfig

```typescript
interface AssistantAgentConfig {
  name: string;                      // Agent name
  provider?: 'openai' | 'openrouter' | 'ollama' | 'anthropic' | 'gemini';  // LLM provider (default: 'openai')
  apiKey?: string;                   // API key (required for openai/openrouter/anthropic/gemini)
  model?: string;                    // Model name
  baseURL?: string;                  // Custom base URL (optional)
  temperature?: number;              // 0.0 to 1.0 (default: 0)
  maxTokens?: number;                // Max tokens in response (default: 1000)
  systemMessage?: string;            // System prompt
}
```

## Backward Compatibility

The original `OpenAIAgentConfig` is still supported:

```typescript
// Old way (still works)
const agent = new AssistantAgent({
  name: 'assistant',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-3.5-turbo'
});

// New way (recommended)
const agent = new AssistantAgent({
  name: 'assistant',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-3.5-turbo'
});
```

## Troubleshooting

### OpenRouter Issues

**Problem:** "Invalid API key"
```bash
# Solution: Check your API key
curl https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

**Problem:** Model not found
- Check model name format: `provider/model`
- See available models: https://openrouter.ai/docs#models

### Anthropic Issues

**Problem:** "Invalid API key"
```bash
# Solution: Check your API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

**Problem:** Model not found
- Check model name is correct (e.g., `claude-3-5-sonnet-20241022`, not `claude-3.5-sonnet`)
- See available models: https://docs.anthropic.com/claude/docs/models-overview

**Problem:** Rate limits or quota exceeded
- Check your plan limits at https://console.anthropic.com/
- Implement retry logic with exponential backoff

### Gemini Issues

**Problem:** "API key not valid"
```bash
# Solution: Verify your API key at Google AI Studio
# Visit: https://makersuite.google.com/app/apikey
```

**Problem:** Model not found
- Check model name (e.g., `gemini-1.5-flash`, `gemini-1.5-pro`)
- See available models: https://ai.google.dev/models/gemini

**Problem:** "Resource has been exhausted"
- You've hit the rate limit
- Wait a moment and try again
- Consider upgrading your quota

### Ollama Issues

**Problem:** "ECONNREFUSED" or "Connection refused"
```bash
# Solution: Check if Ollama is running
ollama serve  # Start Ollama server

# Or check status
curl http://localhost:11434/api/tags
```

**Problem:** Model not found
```bash
# Solution: Pull the model first
ollama pull llama2
ollama list  # See installed models
```

**Problem:** Slow responses
- Use smaller models (e.g., `llama2:7b` instead of `llama2:70b`)
- Check your hardware (GPU recommended)
- Reduce `maxTokens`

## Best Practices

1. **Development**: Use Ollama for fast, free local testing or Gemini for cost-effective cloud testing
2. **Production**: Use OpenAI, Anthropic, or Gemini for reliability
3. **Privacy-Sensitive**: Use Ollama exclusively
4. **Cost Optimization**: Use Gemini or OpenRouter to access cheaper models
5. **Experimentation**: Use OpenRouter to try different models
6. **Advanced Reasoning**: Use Anthropic Claude for complex analytical tasks
7. **Speed Priority**: Use Gemini Flash or Claude Haiku for fastest responses

## Next Steps

- Try the examples:
  - `npm run example:anthropic` - Anthropic Claude
  - `npm run example:gemini` - Google Gemini
  - `npm run example:openrouter` - OpenRouter
  - `npm run example:ollama` - Local Ollama
- Read provider documentation:
  - [OpenAI](https://platform.openai.com/docs)
  - [Anthropic](https://docs.anthropic.com/)
  - [Google Gemini](https://ai.google.dev/docs)
  - [OpenRouter](https://openrouter.ai/docs)
  - [Ollama](https://ollama.ai)
- Explore available models for each provider
- Build multi-provider agent systems
