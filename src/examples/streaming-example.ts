/**
 * Example: Streaming Responses
 * 
 * This example demonstrates how to use streaming to get real-time responses
 * from LLM providers, which is useful for creating responsive UIs.
 */

import * as dotenv from 'dotenv';
import { AssistantAgent } from '../agents/AssistantAgent';
import { IMessage } from '../core/IAgent';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Create an assistant agent
  const assistant = new AssistantAgent({
    name: 'streaming_assistant',
    systemMessage: 'You are a helpful assistant that provides detailed explanations.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  const messages: IMessage[] = [
    {
      role: 'user',
      content: 'Explain what streaming responses are and why they are useful in AI applications.'
    }
  ];

  console.log('User: Explain what streaming responses are and why they are useful in AI applications.\n');
  console.log('Assistant (streaming): ');

  try {
    let fullResponse = '';

    // Use the streaming API
    for await (const chunk of assistant.generateReplyStream!(messages)) {
      // Print each chunk as it arrives
      process.stdout.write(chunk.delta);
      fullResponse += chunk.delta;

      if (chunk.isComplete) {
        console.log('\n\n[Stream complete]');
      }
    }

    console.log('\nFull response length:', fullResponse.length, 'characters');

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  }

  // Example 2: Compare with non-streaming
  console.log('\n' + '='.repeat(80));
  console.log('Comparison: Non-streaming response');
  console.log('='.repeat(80) + '\n');

  const messages2: IMessage[] = [
    {
      role: 'user',
      content: 'Give me a short poem about technology.'
    }
  ];

  console.log('User: Give me a short poem about technology.\n');
  
  // Traditional non-streaming response
  console.log('Assistant (non-streaming - waiting for complete response...): ');
  const startTime = Date.now();
  const reply = await assistant.generateReply(messages2);
  const endTime = Date.now();
  
  console.log(reply.content);
  console.log(`\n[Response received after ${endTime - startTime}ms]`);
}

main().catch(console.error);
