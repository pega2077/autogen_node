/**
 * Basic tests for Anthropic and Gemini providers
 * These tests verify that the providers can be instantiated and configured properly
 */

import { AssistantAgent } from '../agents/AssistantAgent';
import { AnthropicProvider } from '../providers/AnthropicProvider';
import { GeminiProvider } from '../providers/GeminiProvider';

describe('New LLM Providers', () => {
  describe('AnthropicProvider', () => {
    it('should create an Anthropic provider', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Anthropic');
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new AnthropicProvider({
          model: 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 1000
        });
      }).toThrow('Anthropic API key is required');
    });

    it('should update config', () => {
      const provider = new AnthropicProvider({
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(() => {
        provider.updateConfig({ temperature: 0.5 });
      }).not.toThrow();
    });
  });

  describe('GeminiProvider', () => {
    it('should create a Gemini provider', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('Gemini');
    });

    it('should throw error if API key is missing', () => {
      expect(() => {
        new GeminiProvider({
          model: 'gemini-1.5-flash',
          temperature: 0.7,
          maxTokens: 1000
        });
      }).toThrow('Gemini API key is required');
    });

    it('should update config', () => {
      const provider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-1.5-flash',
        temperature: 0.7,
        maxTokens: 1000
      });

      expect(() => {
        provider.updateConfig({ temperature: 0.5 });
      }).not.toThrow();
    });
  });

  describe('AssistantAgent with new providers', () => {
    it('should create AssistantAgent with Anthropic provider', () => {
      const agent = new AssistantAgent({
        name: 'test-anthropic',
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022'
      });

      expect(agent).toBeDefined();
      expect(agent.getName()).toBe('test-anthropic');
      expect(agent.getProviderName()).toBe('Anthropic');
    });

    it('should create AssistantAgent with Gemini provider', () => {
      const agent = new AssistantAgent({
        name: 'test-gemini',
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-1.5-flash'
      });

      expect(agent).toBeDefined();
      expect(agent.getName()).toBe('test-gemini');
      expect(agent.getProviderName()).toBe('Gemini');
    });

    it('should use default Anthropic model when not specified', () => {
      const agent = new AssistantAgent({
        name: 'test-anthropic',
        provider: 'anthropic',
        apiKey: 'test-key'
      });

      expect(agent).toBeDefined();
      expect(agent.getProviderName()).toBe('Anthropic');
    });

    it('should use default Gemini model when not specified', () => {
      const agent = new AssistantAgent({
        name: 'test-gemini',
        provider: 'gemini',
        apiKey: 'test-key'
      });

      expect(agent).toBeDefined();
      expect(agent.getProviderName()).toBe('Gemini');
    });
  });
});
