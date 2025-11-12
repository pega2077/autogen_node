import { AssistantAgent, UserProxyAgent, HumanInputMode } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Automated conversation example without human input
 * Demonstrates two agents having a programmatic conversation
 */
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    console.log('\nUsage:');
    console.log('1. Create a .env file in the project root');
    console.log('2. Add: OPENAI_API_KEY=your_api_key_here');
    console.log('3. Run: npm run example:auto');
    process.exit(1);
  }

  // Create an assistant agent
  const mathTutor = new AssistantAgent({
    name: 'math_tutor',
    apiKey: apiKey,
    systemMessage: `You are a helpful math tutor. 
    When you solve a problem, show your work step by step.
    End your response with "TERMINATE" when the problem is fully solved.`,
    model: 'gpt-3.5-turbo',
    temperature: 0
  });

  // Create another assistant to ask questions
  const student = new AssistantAgent({
    name: 'student',
    apiKey: apiKey,
    systemMessage: `You are a curious student learning math.
    Ask follow-up questions if you don't understand something.
    When you fully understand the solution, say "Thank you! TERMINATE"`,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  console.log('='.repeat(60));
  console.log('AutoGen Node.js - Automated Conversation Example');
  console.log('='.repeat(60));
  console.log('Two AI agents having a math tutoring session...\n');

  try {
    const initialQuestion = 'Can you help me solve this equation: 3x + 7 = 22?';
    
    console.log(`\n[${student.name}]: ${initialQuestion}\n`);
    
    // Start the conversation
    const messages = await student.initiateChat(
      mathTutor,
      initialQuestion,
      5 // max rounds
    );

    // Print the conversation
    console.log('\n' + '-'.repeat(60));
    console.log('Conversation Summary:');
    console.log('-'.repeat(60));
    
    messages.forEach((msg, index) => {
      console.log(`\n[${msg.name || msg.role}]: ${msg.content}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('Conversation completed successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\nError during conversation:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  }
}

// Run the example
main().catch(console.error);
