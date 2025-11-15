/**
 * Example demonstrating the TeachableAgent
 * An agent that learns user preferences and remembers information
 */

import { TeachableAgent } from '../index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('=== TeachableAgent Example ===\n');

  // Create a teachable agent
  const agent = new TeachableAgent({
    name: 'teachable_assistant',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    systemMessage: 'You are a helpful, personalized assistant.',
    teachMode: true,
    maxMemoryItems: 100
  });

  console.log('1. Teaching the agent manually:');
  
  // Manually teach some facts
  await agent.teach('user_name', 'Alice Smith', 'user_fact');
  await agent.teach('favorite_color', 'Blue', 'user_preference');
  await agent.teach('job_title', 'Software Engineer', 'user_fact');
  await agent.teach('preferred_language', 'TypeScript', 'user_preference');
  
  console.log('Taught 4 facts to the agent\n');

  console.log('2. Recalling information:');
  
  // Recall specific information
  const userName = agent.recall('user_name');
  console.log(`User name: ${userName?.value}`);
  
  const favColor = agent.recall('favorite_color');
  console.log(`Favorite color: ${favColor?.value}\n`);

  console.log('3. Searching by category:');
  
  // Get all preferences
  const preferences = agent.recallByCategory('user_preference');
  console.log('User preferences:');
  preferences.forEach(pref => {
    console.log(`  - ${pref.key}: ${pref.value}`);
  });
  console.log();

  console.log('4. Searching memories:');
  
  // Search for TypeScript-related memories
  const tsResults = agent.searchMemories('TypeScript');
  console.log('TypeScript-related memories:');
  tsResults.forEach(result => {
    console.log(`  - ${result.key}: ${result.value}`);
  });
  console.log();

  console.log('5. Memory statistics:');
  
  const stats = agent.getMemoryStats();
  console.log(`Total memories: ${stats.totalMemories}`);
  console.log('Memories by category:');
  Object.entries(stats.categoryCounts).forEach(([category, count]) => {
    console.log(`  - ${category}: ${count}`);
  });
  console.log();

  console.log('6. Learning from conversation:');
  
  if (process.env.OPENAI_API_KEY) {
    // Agent will automatically learn from this message
    const messages = [
      { role: 'user', content: 'Remember that I prefer formal language in documentation.' }
    ];
    
    const reply = await agent.generateReply(messages);
    console.log('User:', messages[0].content);
    console.log('Agent:', reply.content);
    
    // Check what was learned
    const allMemories = agent.getAllMemories();
    console.log(`\nTotal memories after conversation: ${allMemories.length}\n`);
  } else {
    console.log('Skipping conversation example - OPENAI_API_KEY not set\n');
  }

  console.log('7. Export and import:');
  
  // Export memories
  const exported = agent.exportMemories();
  console.log('Exported memories (first 200 chars):', exported.substring(0, 200) + '...\n');

  // Clear and reimport
  await agent.clearMemories();
  console.log('Memories cleared:', agent.getAllMemories().length);
  
  await agent.importMemories(exported);
  console.log('Memories reimported:', agent.getAllMemories().length);

  console.log('\n=== Example Complete ===');
}

main().catch(console.error);
