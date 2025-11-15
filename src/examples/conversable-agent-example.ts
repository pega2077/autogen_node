/**
 * Example demonstrating the ConversableAgent
 * A flexible agent that can work with or without LLM
 */

import { ConversableAgent } from '../index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('=== ConversableAgent Example ===\n');

  // Example 1: Simple auto-reply agent (no LLM)
  console.log('1. Simple Auto-Reply Agent:');
  const simpleAgent = new ConversableAgent({
    name: 'simple_agent',
    defaultAutoReply: 'I acknowledge your message.',
    maxConsecutiveAutoReply: 3
  });

  for (let i = 0; i < 4; i++) {
    const reply = await simpleAgent.generateReply([
      { role: 'user', content: `Message ${i + 1}` }
    ]);
    console.log(`Reply ${i + 1}: ${reply.content}`);
  }

  console.log('\n2. LLM-Powered Agent:');
  // Example 2: Agent with LLM
  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping LLM example - OPENAI_API_KEY not set');
  } else {
    const llmAgent = new ConversableAgent({
      name: 'llm_agent',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
      systemMessage: 'You are a helpful assistant.',
      maxConsecutiveAutoReply: 5
    });

    const reply = await llmAgent.generateReply([
      { role: 'user', content: 'What is 2+2?' }
    ]);
    console.log('LLM Reply:', reply.content);

    // Reset counter
    llmAgent.resetConsecutiveAutoReplyCounter();
  }

  console.log('\n3. Custom Termination:');
  // Example 3: Custom termination
  const customAgent = new ConversableAgent({
    name: 'custom_agent',
    defaultAutoReply: 'Continuing...',
    isTerminationMsg: (msg) => msg.content.includes('DONE')
  });

  const testMessages = [
    { role: 'assistant' as const, content: 'Working on it...' },
    { role: 'assistant' as const, content: 'Task DONE successfully!' }
  ];

  for (const msg of testMessages) {
    const isTermination = customAgent['isTerminationMessage'](msg);
    console.log(`Message: "${msg.content}" - Terminates: ${isTermination}`);
  }

  console.log('\n=== Example Complete ===');
}

main().catch(console.error);
