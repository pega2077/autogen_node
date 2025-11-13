/**
 * Example: Nested Chat
 * 
 * This example demonstrates how agents can delegate tasks to other agents
 * through nested conversations. This is useful for:
 * - Task decomposition and delegation
 * - Specialist consultations
 * - Hierarchical multi-agent systems
 */

import * as dotenv from 'dotenv';
import { AssistantAgent } from '../agents/AssistantAgent';
import { supportsNestedChat } from '../core/INestedChat';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  // Create a project manager agent
  const projectManager = new AssistantAgent({
    name: 'project_manager',
    systemMessage: `You are a project manager. When you need specialized work done, 
    you can delegate to specialists. Keep your responses brief and focused.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  // Create specialist agents
  const codeReviewer = new AssistantAgent({
    name: 'code_reviewer',
    systemMessage: `You are a code review specialist. Review code for quality, 
    best practices, and potential issues. Be concise in your review.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  const securityExpert = new AssistantAgent({
    name: 'security_expert',
    systemMessage: `You are a security expert. Analyze code and systems for 
    security vulnerabilities. Be specific and actionable. Say TERMINATE when done.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  console.log('='.repeat(80));
  console.log('Nested Chat Example: Project Manager with Specialists');
  console.log('='.repeat(80));
  console.log();

  // Check if agents support nested chat
  if (supportsNestedChat(projectManager)) {
    console.log('✓ Project manager supports nested chat\n');
  }

  // Example 1: Code review delegation
  console.log('--- Scenario 1: Code Review Delegation ---\n');
  
  const codeToReview = `
function authenticateUser(username, password) {
  const query = "SELECT * FROM users WHERE username='" + username + 
                "' AND password='" + password + "'";
  return db.execute(query);
}
`;

  console.log('Code to review:');
  console.log(codeToReview);
  console.log('\nProject Manager delegating to Code Reviewer...\n');

  const reviewResult = await projectManager.initiateNestedChat(
    `Please review this authentication code:\n${codeToReview}`,
    codeReviewer,
    {
      maxRounds: 3,
      addToParentHistory: true  // Add summary to project manager's context
    }
  );

  console.log('Code Review Result:');
  console.log('-'.repeat(80));
  reviewResult.messages.forEach((msg, idx) => {
    console.log(`[${msg.name}]: ${msg.content}`);
    if (idx < reviewResult.messages.length - 1) {
      console.log();
    }
  });
  console.log('-'.repeat(80));
  console.log(`Completed in ${reviewResult.rounds} rounds`);
  console.log();

  // Example 2: Security analysis delegation
  console.log('\n--- Scenario 2: Security Analysis Delegation ---\n');
  
  console.log('Project Manager delegating to Security Expert...\n');

  const securityResult = await projectManager.initiateNestedChat(
    `Based on the code review, please analyze the security implications of the SQL injection vulnerability found in the authentication code.`,
    securityExpert,
    {
      maxRounds: 5,
      addToParentHistory: true,
      terminationMessage: 'TERMINATE'
    }
  );

  console.log('Security Analysis Result:');
  console.log('-'.repeat(80));
  securityResult.messages.forEach((msg, idx) => {
    console.log(`[${msg.name}]: ${msg.content}`);
    if (idx < securityResult.messages.length - 1) {
      console.log();
    }
  });
  console.log('-'.repeat(80));
  console.log(`Completed in ${securityResult.rounds} rounds`);
  console.log(`Terminated: ${securityResult.terminated}`);
  console.log();

  // Show that project manager now has context from both nested chats
  console.log('\n--- Project Manager\'s Updated Context ---\n');
  const pmHistory = projectManager.getConversationHistory();
  console.log(`Project manager now has ${pmHistory.length} messages in history`);
  console.log('\nRecent context summaries:');
  pmHistory
    .filter(msg => msg.content.includes('Nested conversation'))
    .forEach(msg => {
      console.log(`- ${msg.content.split('\n')[0]}`);
    });

  console.log('\n' + '='.repeat(80));
  console.log('Nested Chat Benefits:');
  console.log('='.repeat(80));
  console.log('✓ Task delegation to specialists');
  console.log('✓ Isolated conversation contexts');
  console.log('✓ Optional context integration');
  console.log('✓ Hierarchical agent organization');
  console.log('='.repeat(80));
}

main().catch(console.error);
