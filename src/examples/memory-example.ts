/**
 * Memory Example
 * 
 * This example demonstrates how to use memory with agents to maintain
 * context across conversations, following the Microsoft AutoGen memory pattern.
 */

import { AssistantAgent, ListMemory, MemoryContent, MemoryMimeType } from '../index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Get API key from environment
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set.');
    console.error('Please set it in your .env file or environment.');
    process.exit(1);
  }

  console.log('=== Memory Example ===\n');

  // Create a memory instance with user preferences
  const userMemory = new ListMemory({ name: 'user_preferences' });

  // Add some memory items about user preferences
  await userMemory.add({
    content: 'User prefers formal and professional language',
    mimeType: MemoryMimeType.TEXT,
    metadata: { timestamp: Date.now(), source: 'user_preference' }
  });

  await userMemory.add({
    content: 'User is interested in TypeScript and AI programming',
    mimeType: MemoryMimeType.TEXT,
    metadata: { timestamp: Date.now(), source: 'user_interest' }
  });

  await userMemory.add({
    content: 'User works in software engineering',
    mimeType: MemoryMimeType.TEXT,
    metadata: { timestamp: Date.now(), source: 'user_context' }
  });

  console.log('Memory contents added:');
  const memoryQuery = await userMemory.query();
  memoryQuery.results.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.content}`);
  });
  console.log();

  // Create an assistant agent with memory
  const assistant = new AssistantAgent({
    name: 'assistant',
    provider: 'openai',
    apiKey,
    model: 'gpt-3.5-turbo',
    systemMessage: 'You are a helpful assistant.',
    memory: [userMemory]
  });

  console.log('=== Conversation with Memory ===\n');

  // First interaction
  const messages1 = [
    { role: 'user' as const, content: 'Can you recommend a programming language for me to learn?' }
  ];

  console.log('User: Can you recommend a programming language for me to learn?\n');
  const reply1 = await assistant.generateReply(messages1);
  console.log(`Assistant: ${reply1.content}\n`);

  // Second interaction - the assistant should remember the user's context
  const messages2 = [
    { role: 'user' as const, content: 'What kind of projects could I build with it?' }
  ];

  console.log('User: What kind of projects could I build with it?\n');
  const reply2 = await assistant.generateReply([...messages1, reply1, ...messages2]);
  console.log(`Assistant: ${reply2.content}\n`);

  // Demonstrate adding new memory dynamically
  console.log('\n=== Adding New Memory ===\n');
  await userMemory.add({
    content: 'User recently completed a course on machine learning',
    mimeType: MemoryMimeType.TEXT,
    metadata: { timestamp: Date.now(), source: 'recent_activity' }
  });

  console.log('New memory added: "User recently completed a course on machine learning"\n');

  // Third interaction with updated memory
  const messages3 = [
    { role: 'user' as const, content: 'What would you suggest I learn next?' }
  ];

  console.log('User: What would you suggest I learn next?\n');
  const reply3 = await assistant.generateReply(messages3);
  console.log(`Assistant: ${reply3.content}\n`);

  // Demonstrate memory query
  console.log('\n=== Querying Memory ===\n');
  const allMemories = await userMemory.query();
  console.log(`Total memories stored: ${allMemories.results.length}`);
  console.log('Memory contents:');
  allMemories.results.forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.content}`);
    if (item.metadata) {
      console.log(`     Metadata: ${JSON.stringify(item.metadata)}`);
    }
  });

  // Demonstrate memory with JSON content
  console.log('\n=== JSON Memory Content ===\n');
  const structuredMemory = new ListMemory({ name: 'structured_data' });
  
  await structuredMemory.add({
    content: {
      skill_level: 'intermediate',
      preferred_topics: ['AI', 'TypeScript', 'Node.js'],
      learning_pace: 'self-paced'
    },
    mimeType: MemoryMimeType.JSON,
    metadata: { type: 'user_profile' }
  });

  const jsonMemories = await structuredMemory.query();
  console.log('Structured memory content:');
  console.log(JSON.stringify(jsonMemories.results[0].content, null, 2));

  // Demonstrate memory clearing
  console.log('\n=== Clearing Memory ===\n');
  console.log(`Memories before clear: ${(await userMemory.query()).results.length}`);
  await userMemory.clear();
  console.log(`Memories after clear: ${(await userMemory.query()).results.length}`);

  // Cleanup
  await userMemory.close();
  await structuredMemory.close();

  console.log('\n=== Memory Example Complete ===');
}

// Run the example
main().catch(console.error);
