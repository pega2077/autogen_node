/**
 * Example demonstrating Google Gemini integration
 * 
 * This example shows how to use Gemini models with AutoGen Node.js
 */

import { AssistantAgent, UserProxyAgent, HumanInputMode, IMessage } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is not set.');
    console.error('Please set it in your .env file or environment:');
    console.error('  export GEMINI_API_KEY=your_api_key_here');
    console.error('\nGet your API key from: https://makersuite.google.com/app/apikey');
    process.exit(1);
  }

  console.log('=== Google Gemini Example ===\n');
  console.log('This example uses Gemini via the Google Generative AI SDK.\n');

  // Create an assistant using Google Gemini
  const assistant = new AssistantAgent({
    name: 'gemini_assistant',
    provider: 'gemini',
    apiKey: apiKey,
    model: 'gemini-1.5-flash', // Can also use: gemini-1.5-pro, gemini-pro
    systemMessage: 'You are a helpful AI assistant powered by Google Gemini. Be concise and helpful.',
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
    'What are the key features of Google Gemini in 2-3 sentences?',
    3
  );

  console.log('\n--- Example 2: Creative Task ---');
  // Reset conversation
  userProxy.clearHistory();
  assistant.clearHistory();

  await userProxy.initiateChat(
    assistant,
    'Write a limerick about machine learning. Then say TERMINATE.',
    3
  );

  console.log('\n--- Example 3: Math Problem ---');
  // Reset conversation
  userProxy.clearHistory();
  assistant.clearHistory();

  await userProxy.initiateChat(
    assistant,
    'Calculate the factorial of 8 and explain the steps. Then say TERMINATE.',
    5
  );

  console.log('\n=== Example Complete ===');
  console.log('\nTry different Gemini models:');
  console.log('  - gemini-1.5-flash (Fast and efficient)');
  console.log('  - gemini-1.5-pro (More capable, balanced)');
  console.log('  - gemini-pro (Standard model)');
}

main().catch(console.error);
