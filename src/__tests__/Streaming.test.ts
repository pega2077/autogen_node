import { AssistantAgent } from '../agents/AssistantAgent';
import { IMessage, StreamingChunk } from '../core/IAgent';
import { ILLMProvider, LLMProviderConfig } from '../providers/ILLMProvider';

// Mock streaming provider for testing
class MockStreamingProvider implements ILLMProvider {
  private config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  async generateCompletion(messages: IMessage[]): Promise<string> {
    return 'Mock response';
  }

  async generateReplyWithFunctions(messages: IMessage[]): Promise<IMessage> {
    return {
      role: 'assistant',
      content: 'Mock response'
    };
  }

  async* generateStreamingCompletion(messages: IMessage[]): AsyncIterableIterator<StreamingChunk> {
    const chunks = ['Hello', ' ', 'World', '!'];
    for (let i = 0; i < chunks.length; i++) {
      yield {
        delta: chunks[i],
        isComplete: i === chunks.length - 1
      };
    }
  }

  getProviderName(): string {
    return 'MockStreaming';
  }

  updateConfig(config: Partial<LLMProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

describe('Streaming Support', () => {
  it('should support streaming responses', async () => {
    // Create a custom assistant with mock streaming provider
    const assistant = new AssistantAgent({
      name: 'streaming_assistant',
      systemMessage: 'You are a helpful assistant.',
      apiKey: 'test-key'
    });

    // Replace the provider with our mock
    (assistant as any).llmProvider = new MockStreamingProvider({
      model: 'test',
      apiKey: 'test-key'
    });

    const messages: IMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    let fullResponse = '';
    let chunkCount = 0;

    for await (const chunk of assistant.generateReplyStream!(messages)) {
      fullResponse += chunk.delta;
      chunkCount++;
      
      // Verify chunk structure
      expect(chunk).toHaveProperty('delta');
      expect(chunk).toHaveProperty('isComplete');
      expect(typeof chunk.delta).toBe('string');
      expect(typeof chunk.isComplete).toBe('boolean');
    }

    expect(fullResponse).toBe('Hello World!');
    expect(chunkCount).toBe(4);
  });

  it('should throw error if provider does not support streaming', async () => {
    // Create a provider without streaming support
    class NonStreamingProvider implements ILLMProvider {
      async generateCompletion(): Promise<string> {
        return 'response';
      }
      async generateReplyWithFunctions(): Promise<IMessage> {
        return { role: 'assistant', content: 'response' };
      }
      getProviderName(): string {
        return 'NonStreaming';
      }
      updateConfig(): void {}
    }

    const assistant = new AssistantAgent({
      name: 'non_streaming_assistant',
      systemMessage: 'You are a helpful assistant.',
      apiKey: 'test-key'
    });

    (assistant as any).llmProvider = new NonStreamingProvider();

    const messages: IMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    await expect(async () => {
      for await (const chunk of assistant.generateReplyStream!(messages)) {
        // Should not reach here
      }
    }).rejects.toThrow('does not support streaming');
  });

  it('should handle empty streaming responses', async () => {
    class EmptyStreamingProvider implements ILLMProvider {
      async generateCompletion(): Promise<string> {
        return '';
      }
      async generateReplyWithFunctions(): Promise<IMessage> {
        return { role: 'assistant', content: '' };
      }
      async* generateStreamingCompletion(): AsyncIterableIterator<StreamingChunk> {
        yield {
          delta: '',
          isComplete: true
        };
      }
      getProviderName(): string {
        return 'EmptyStreaming';
      }
      updateConfig(): void {}
    }

    const assistant = new AssistantAgent({
      name: 'empty_streaming_assistant',
      systemMessage: 'You are a helpful assistant.',
      apiKey: 'test-key'
    });

    (assistant as any).llmProvider = new EmptyStreamingProvider();

    const messages: IMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    let fullResponse = '';
    for await (const chunk of assistant.generateReplyStream!(messages)) {
      fullResponse += chunk.delta;
    }

    expect(fullResponse).toBe('');
  });
});
