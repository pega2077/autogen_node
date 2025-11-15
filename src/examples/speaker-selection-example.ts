/**
 * Example: Speaker Selection Strategies
 * 
 * This example demonstrates different speaker selection strategies for group chats:
 * - Round-robin: Sequential turn-taking
 * - Random: Random speaker selection
 * - Manual: Explicit speaker control
 * - Constrained: Limited speaker pool
 * - Auto: LLM-based intelligent selection
 */

import * as dotenv from 'dotenv';
import { AssistantAgent } from '../agents/AssistantAgent';
import { GroupChat } from '../core/GroupChat';
import {
  RoundRobinSelector,
  RandomSelector,
  ManualSelector,
  ConstrainedSelector
} from '../core/SpeakerSelectors';
import { AutoSelector } from '../core/AutoSelector';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('Speaker Selection Strategies Example');
  console.log('='.repeat(80));
  console.log();

  // Create specialized agents
  const productManager = new AssistantAgent({
    name: 'product_manager',
    systemMessage: 'You are a product manager focused on user needs and business value. Keep responses brief.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  const engineer = new AssistantAgent({
    name: 'engineer',
    systemMessage: 'You are a software engineer focused on technical implementation. Keep responses brief.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.5
  });

  const designer = new AssistantAgent({
    name: 'designer',
    systemMessage: 'You are a UX designer focused on user experience and design. Keep responses brief.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  const agents = [productManager, engineer, designer];

  // Example 1: Round-Robin Selection (Default)
  console.log('--- Example 1: Round-Robin Speaker Selection ---\n');
  console.log('Each agent speaks in turn, cycling through the list.\n');

  const roundRobinChat = new GroupChat({
    agents,
    maxRound: 6,
    speakerSelector: new RoundRobinSelector()
  });

  await roundRobinChat.run('Design a new mobile app feature for task management.');
  
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 2: Random Selection
  console.log('--- Example 2: Random Speaker Selection ---\n');
  console.log('Speakers are chosen randomly, promoting varied participation.\n');

  const randomChat = new GroupChat({
    agents,
    maxRound: 6,
    speakerSelector: new RandomSelector()
  });

  await randomChat.run('How should we prioritize our next sprint?');

  console.log('\n' + '='.repeat(80) + '\n');

  // Example 3: Manual Selection
  console.log('--- Example 3: Manual Speaker Selection ---\n');
  console.log('Manually control who speaks next.\n');

  const manualSelector = new ManualSelector();
  const manualChat = new GroupChat({
    agents,
    maxRound: 6,
    speakerSelector: manualSelector
  });

  // Start the chat in the background
  console.log('Starting chat with manual speaker control...\n');
  
  // Create a controlled sequence: PM -> Engineer -> Designer -> PM
  const manualSequence = async () => {
    manualSelector.setNextSpeaker('product_manager');
    console.log('→ Manually selected: product_manager\n');
    
    const messages1 = await manualChat.run('What features should our next product have?');
    
    // Normally you'd interact with the chat dynamically, but for demo we'll reset
    manualChat.reset();
    
    return messages1;
  };

  await manualSequence();

  console.log('\n' + '='.repeat(80) + '\n');

  // Example 4: Constrained Selection
  console.log('--- Example 4: Constrained Speaker Selection ---\n');
  console.log('Only specific agents can participate.\n');

  // Only allow PM and Designer to speak (engineer is excluded)
  const constrainedChat = new GroupChat({
    agents,
    maxRound: 6,
    speakerSelector: new ConstrainedSelector(['product_manager', 'designer'])
  });

  await constrainedChat.run('Discuss the user interface for the new feature.');

  console.log('\nNote: Only product_manager and designer participated.\n');
  console.log('='.repeat(80) + '\n');

  // Example 5: Auto Selection (LLM-based)
  console.log('--- Example 5: Auto (LLM-based) Speaker Selection ---\n');
  console.log('An AI coordinator intelligently selects speakers based on context.\n');

  // Create a selector agent
  const selectorAgent = new AssistantAgent({
    name: 'coordinator',
    systemMessage: `You are a meeting coordinator. Select the most appropriate team member 
    to speak next based on the conversation context. Respond with only the agent name: 
    product_manager, engineer, or designer.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  const autoChat = new GroupChat({
    agents,
    maxRound: 6,
    speakerSelector: new AutoSelector({ selectorAgent })
  });

  await autoChat.run('We need to implement a real-time collaboration feature. Let\'s discuss.');

  console.log('\nNote: The AI coordinator selected speakers based on their expertise.\n');

  // Summary
  console.log('='.repeat(80));
  console.log('Speaker Selection Strategies Summary');
  console.log('='.repeat(80));
  console.log('✓ Round-Robin: Predictable, fair turn-taking');
  console.log('✓ Random: Varied participation, less predictable');
  console.log('✓ Manual: Full control over speaker order');
  console.log('✓ Constrained: Limit speakers to specific agents');
  console.log('✓ Auto: Intelligent, context-aware selection');
  console.log('='.repeat(80));
}

main().catch(console.error);
