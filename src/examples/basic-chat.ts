import { AssistantAgent, UserProxyAgent, HumanInputMode } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Basic example of two-agent conversation
 * Similar to the .NET example in the README
 */
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Create an assistant agent
  const assistant = new AssistantAgent({
    name: 'assistant',
    apiKey: apiKey,
    systemMessage: 'You are a helpful assistant that helps users with various tasks.',
    model: 'gpt-3.5-turbo',
    temperature: 0
  });

  // Create a user proxy agent
  const userProxy = new UserProxyAgent({
    name: 'user',
    humanInputMode: HumanInputMode.ALWAYS
  });

  console.log('='.repeat(50));
  console.log('AutoGen Node.js - Basic Example');
  console.log('='.repeat(50));
  console.log('Starting conversation... (type "TERMINATE" to end)\n');

  try {
    // Initiate a chat
    await userProxy.initiateChat(
      assistant,
      'Hello! Can you help me with a math problem?',
      10 // max rounds
    );

    console.log('\n' + '='.repeat(50));
    console.log('Conversation ended');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Error during conversation:', error);
  } finally {
    userProxy.close();
  }
}

// Run the example
main().catch(console.error);
