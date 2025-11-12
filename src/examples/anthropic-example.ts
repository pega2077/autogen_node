/**
 * Example demonstrating Anthropic Claude integration
 * 
 * This example shows how to use Claude models with AutoGen Node.js
 */

import { AssistantAgent, UserProxyAgent, HumanInputMode, IMessage } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is not set.');
    console.error('Please set it in your .env file or environment:');
    console.error('  export ANTHROPIC_API_KEY=your_api_key_here');
    console.error('\nGet your API key from: https://console.anthropic.com/');
    process.exit(1);
  }

  console.log('=== Anthropic Claude Example ===\n');
  console.log('This example uses Claude via the Anthropic SDK.\n');

  // Create an assistant using Anthropic Claude
  const assistant = new AssistantAgent({
    name: 'claude_assistant',
    provider: 'anthropic',
    apiKey: apiKey,
    model: 'claude-3-5-sonnet-20241022', // Can also use: claude-3-opus-20240229, claude-3-haiku-20240307
    systemMessage: 'You are a helpful AI assistant powered by Claude. Be concise and helpful.',
    temperature: 0.7,
    maxTokens: 1000
  });

  // Create a user proxy that will auto-terminate
  const userProxy = new UserProxyAgent({
    name: 'user',
    humanInputMode: HumanInputMode.NEVER,
    isTerminationMsg: (msg: IMessage) => {
      return msg.content?.toLowerCase().includes('terminate') || false;
    }
  });

  console.log(`Provider: ${assistant.getProviderName()}\n`);

  // Example 1: Simple question
  console.log('--- Example 1: Simple Question ---');
  await userProxy.initiateChat(
    assistant,
    'Explain what makes Claude different from other AI assistants in 2-3 sentences.',
    3
  );

  console.log('\n--- Example 2: Creative Task ---');
  // Reset conversation
  userProxy.clearHistory();
  assistant.clearHistory();

  await userProxy.initiateChat(
    assistant,
    'Write a haiku about artificial intelligence. Then say TERMINATE.',
    3
  );

  console.log('\n--- Example 3: Problem Solving ---');
  // Reset conversation
  userProxy.clearHistory();
  assistant.clearHistory();

  await userProxy.initiateChat(
    assistant,
    'What is the sum of all prime numbers between 1 and 20? Show your work. Then say TERMINATE.',
    5
  );

  console.log('\n=== Example Complete ===');
  console.log('\nTry different Claude models:');
  console.log('  - claude-3-5-sonnet-20241022 (Best balance of speed and capability)');
  console.log('  - claude-3-opus-20240229 (Most capable, slower)');
  console.log('  - claude-3-haiku-20240307 (Fastest, most cost-effective)');
}

main().catch(console.error);
