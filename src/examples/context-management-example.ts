/**
 * Example: Context Management and Compression
 * 
 * This example demonstrates how to manage long conversation histories
 * using the ContextManager to prevent context window overflow.
 * This is essential for:
 * - Long-running conversations
 * - Token budget management
 * - Preventing API errors from context limits
 */

import { IMessage } from '../core/IAgent';
import {
  ContextManager,
  CompressionStrategy
} from '../core/ContextManager';

function main() {
  console.log('='.repeat(80));
  console.log('Context Management Example');
  console.log('='.repeat(80));
  console.log();

  // Create a long conversation history
  const longConversation: IMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' },
    { role: 'assistant', content: 'I\'m doing great! How can I help you today?' },
    { role: 'user', content: 'I need help with a task.' },
    { role: 'assistant', content: 'Sure, I\'d be happy to help! What task do you need assistance with?' },
    { role: 'user', content: 'I want to learn about context management.' },
    { role: 'assistant', content: 'Context management is crucial for maintaining efficient conversations with language models. It involves strategies to keep conversation history within token limits while preserving important information.' },
    { role: 'user', content: 'What are some strategies?' },
    { role: 'assistant', content: 'Common strategies include: 1) Truncating oldest messages, 2) Summarizing old content, 3) Keeping only important messages, and 4) Using bookend compression to keep first and last messages.' },
    { role: 'user', content: 'Tell me more about truncation.' },
    { role: 'assistant', content: 'Truncation simply removes the oldest messages when the conversation gets too long, while preserving system messages and function calls.' },
    { role: 'user', content: 'Interesting!' },
    { role: 'assistant', content: 'Yes, it\'s a simple but effective strategy for managing conversation length.' },
  ];

  console.log(`Original conversation: ${longConversation.length} messages\n`);

  // Example 1: Truncate Oldest Strategy
  console.log('--- Strategy 1: Truncate Oldest ---');
  const truncateManager = new ContextManager({
    maxMessages: 8,
    strategy: CompressionStrategy.TRUNCATE_OLDEST,
    preserveSystem: true
  });

  const stats1 = truncateManager.getStats(longConversation);
  console.log(`Before compression:`);
  console.log(`  Messages: ${stats1.messageCount}`);
  console.log(`  Estimated tokens: ${stats1.estimatedTokens}`);
  console.log(`  Needs compression: ${stats1.needsCompression}`);
  console.log();

  const result1 = truncateManager.compress(longConversation);
  console.log(`After compression:`);
  console.log(`  Messages: ${result1.messages.length}`);
  console.log(`  Removed: ${result1.messagesRemoved}`);
  console.log(`  Tokens saved: ~${result1.tokensSaved}`);
  console.log(`  System message preserved: ${result1.messages[0].role === 'system'}`);
  console.log();

  // Example 2: Selective Strategy
  console.log('--- Strategy 2: Selective Compression ---');
  const selectiveManager = new ContextManager({
    maxMessages: 10,
    strategy: CompressionStrategy.SELECTIVE
  });

  const result2 = selectiveManager.compress(longConversation);
  console.log(`After selective compression:`);
  console.log(`  Messages: ${result2.messages.length}`);
  console.log(`  Removed: ${result2.messagesRemoved}`);
  console.log();

  // Example 3: Bookend Strategy
  console.log('--- Strategy 3: Bookend Compression ---');
  const bookendManager = new ContextManager({
    maxMessages: 6,
    strategy: CompressionStrategy.BOOKEND
  });

  const result3 = bookendManager.compress(longConversation);
  console.log(`After bookend compression:`);
  console.log(`  Messages: ${result3.messages.length}`);
  console.log(`  Removed: ${result3.messagesRemoved}`);
  console.log(`  Summary: ${result3.summary}`);
  console.log();

  // Example 4: Token-Based Compression
  console.log('--- Strategy 4: Token-Based Compression ---');
  const tokenManager = new ContextManager({
    maxMessages: 100,  // High message limit
    maxTokens: 500,    // Low token limit
    strategy: CompressionStrategy.TRUNCATE_OLDEST
  });

  const stats4 = tokenManager.getStats(longConversation);
  console.log(`Token-based compression:`);
  console.log(`  Estimated tokens: ${stats4.estimatedTokens}`);
  console.log(`  Max tokens: 500`);
  console.log(`  Needs compression: ${stats4.needsCompression}`);

  const result4 = tokenManager.compress(longConversation);
  console.log(`  After compression: ${result4.messages.length} messages`);
  console.log();

  // Example 5: Dynamic Configuration
  console.log('--- Example 5: Dynamic Configuration ---');
  const dynamicManager = new ContextManager({
    maxMessages: 5
  });

  console.log(`Initial config: maxMessages = 5`);
  console.log(`  Needs compression: ${dynamicManager.needsCompression(longConversation)}`);

  dynamicManager.updateConfig({ maxMessages: 20 });
  console.log(`After update: maxMessages = 20`);
  console.log(`  Needs compression: ${dynamicManager.needsCompression(longConversation)}`);
  console.log();

  // Example 6: Preserving Important Messages
  console.log('--- Example 6: Preserving Important Messages ---');
  const conversationWithFunctions: IMessage[] = [
    { role: 'system', content: 'You are a helpful assistant with tools.' },
    { role: 'user', content: 'Get the weather' },
    {
      role: 'assistant',
      content: '',
      toolCalls: [{
        id: 'call_123',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"NYC"}' }
      }]
    },
    { 
      role: 'tool', 
      content: '{"temperature": 72, "condition": "sunny"}',
      toolCallId: 'call_123'
    },
    { role: 'assistant', content: 'The weather in NYC is 72°F and sunny.' },
    ...Array(10).fill(null).map((_, i) => ({
      role: 'user' as const,
      content: `Message ${i}`
    }))
  ];

  const preserveManager = new ContextManager({
    maxMessages: 8,
    strategy: CompressionStrategy.TRUNCATE_OLDEST,
    preserveSystem: true,
    preserveFunctions: true
  });

  const result6 = preserveManager.compress(conversationWithFunctions);
  console.log(`Original: ${conversationWithFunctions.length} messages`);
  console.log(`After compression: ${result6.messages.length} messages`);
  console.log(`System preserved: ${result6.messages.some(m => m.role === 'system')}`);
  console.log(`Functions preserved: ${result6.messages.some(m => m.toolCalls || m.role === 'tool')}`);
  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('Context Management Benefits:');
  console.log('='.repeat(80));
  console.log('✓ Prevent context window overflow');
  console.log('✓ Manage token budgets effectively');
  console.log('✓ Multiple compression strategies');
  console.log('✓ Preserve important messages (system, functions)');
  console.log('✓ Dynamic configuration updates');
  console.log('✓ Token estimation and monitoring');
  console.log('='.repeat(80));
}

main();
