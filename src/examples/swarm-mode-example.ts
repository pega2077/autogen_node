/**
 * Example: Swarm Mode
 * 
 * This example demonstrates swarm mode for dynamic agent collaboration:
 * - Multiple tasks distributed among agents
 * - Dynamic task assignment
 * - Parallel-like task processing
 * - Task status tracking
 */

import * as dotenv from 'dotenv';
import { AssistantAgent } from '../agents/AssistantAgent';
import { SwarmChat, TaskStatus } from '../core/SwarmChat';
import { RoundRobinSelector, RandomSelector } from '../core/SpeakerSelectors';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('Swarm Mode Example: Multi-Agent Task Distribution');
  console.log('='.repeat(80));
  console.log();

  // Create specialized worker agents
  const researcher = new AssistantAgent({
    name: 'researcher',
    systemMessage: `You are a research specialist. Gather information and provide concise 
    summaries. Say DONE when you've completed your research.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  const writer = new AssistantAgent({
    name: 'writer',
    systemMessage: `You are a content writer. Create engaging, well-written content. 
    Say DONE when you've finished writing.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  const coder = new AssistantAgent({
    name: 'coder',
    systemMessage: `You are a software developer. Write clean, efficient code. 
    Say DONE when your code is complete.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.5
  });

  const reviewer = new AssistantAgent({
    name: 'reviewer',
    systemMessage: `You are a quality reviewer. Review work and provide feedback. 
    Say DONE when your review is complete.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.4
  });

  // Example 1: Basic Swarm with Multiple Tasks
  console.log('--- Example 1: Basic Task Distribution ---\n');
  console.log('Creating a swarm with 4 agents to handle 6 tasks...\n');

  const swarm = new SwarmChat({
    agents: [researcher, writer, coder, reviewer],
    maxRoundsPerTask: 3,
    maxTotalRounds: 30,
    taskAssignmentSelector: new RoundRobinSelector()
  });

  const tasks = [
    'Research the benefits of TypeScript for large projects',
    'Write a blog post about multi-agent AI systems',
    'Create a simple function to calculate Fibonacci numbers',
    'Review best practices for REST API design',
    'Research the latest trends in web development',
    'Write documentation for a new feature'
  ];

  console.log('Tasks to distribute:');
  tasks.forEach((task, idx) => {
    console.log(`  ${idx + 1}. ${task}`);
  });
  console.log();

  const result = await swarm.run(tasks);

  console.log('\n' + '='.repeat(80));
  console.log('SWARM EXECUTION RESULTS');
  console.log('='.repeat(80));
  console.log(`Total tasks: ${result.tasks.length}`);
  console.log(`Completed: ${result.completedTasks.length}`);
  console.log(`Failed: ${result.failedTasks.length}`);
  console.log(`Total rounds: ${result.totalRounds}`);
  console.log();

  result.tasks.forEach((task, idx) => {
    console.log(`Task ${idx + 1}: ${task.description.substring(0, 50)}...`);
    console.log(`  Status: ${task.status}`);
    console.log(`  Assigned to: ${task.assignedAgent?.getName()}`);
    console.log(`  Messages: ${task.messages.length}`);
    if (task.result) {
      console.log(`  Result: ${task.result.content.substring(0, 100)}...`);
    }
    console.log();
  });

  // Example 2: Single Task Assignment
  console.log('\n' + '='.repeat(80));
  console.log('--- Example 2: Single Task Execution ---\n');

  const singleSwarm = new SwarmChat({
    agents: [researcher, writer, coder, reviewer],
    maxRoundsPerTask: 3
  });

  const singleTask = await singleSwarm.runSingleTask(
    'Research and summarize the key features of Node.js'
  );

  console.log(`Task: ${singleTask.description}`);
  console.log(`Status: ${singleTask.status}`);
  console.log(`Assigned to: ${singleTask.assignedAgent?.getName()}\n`);
  console.log('Conversation:');
  singleTask.messages.forEach((msg, idx) => {
    console.log(`  [${msg.name || msg.role}]: ${msg.content.substring(0, 150)}${msg.content.length > 150 ? '...' : ''}`);
  });

  // Example 3: Dynamic Agent Management
  console.log('\n' + '='.repeat(80));
  console.log('--- Example 3: Dynamic Agent Management ---\n');

  const dynamicSwarm = new SwarmChat({
    agents: [researcher, writer],
    allowDynamicAgents: true,
    taskAssignmentSelector: new RandomSelector()
  });

  console.log('Initial agents:', dynamicSwarm.getAgents().map(a => a.getName()).join(', '));

  // Add an agent dynamically
  dynamicSwarm.addAgent(coder);
  console.log('After adding coder:', dynamicSwarm.getAgents().map(a => a.getName()).join(', '));

  // Run tasks with the expanded team
  const dynamicResult = await dynamicSwarm.run([
    'Research TypeScript benefits',
    'Write a tutorial about async/await',
    'Create a code example for promises'
  ]);

  console.log(`\nCompleted ${dynamicResult.completedTasks.length} tasks with dynamic team`);

  // Remove an agent
  dynamicSwarm.removeAgent('writer');
  console.log('After removing writer:', dynamicSwarm.getAgents().map(a => a.getName()).join(', '));

  // Example 4: Task Assignment Strategies
  console.log('\n' + '='.repeat(80));
  console.log('--- Example 4: Different Task Assignment Strategies ---\n');

  // Random assignment
  const randomSwarm = new SwarmChat({
    agents: [researcher, writer, coder],
    taskAssignmentSelector: new RandomSelector()
  });

  console.log('Using Random Assignment Strategy:');
  const randomResult = await randomSwarm.run([
    'Quick task 1',
    'Quick task 2',
    'Quick task 3'
  ]);

  console.log('Task assignments:');
  randomResult.tasks.forEach(task => {
    console.log(`  ${task.description} → ${task.assignedAgent?.getName()}`);
  });

  // Round-robin assignment
  const rrSwarm = new SwarmChat({
    agents: [researcher, writer, coder],
    taskAssignmentSelector: new RoundRobinSelector()
  });

  console.log('\nUsing Round-Robin Assignment Strategy:');
  const rrResult = await rrSwarm.run([
    'Quick task 1',
    'Quick task 2',
    'Quick task 3'
  ]);

  console.log('Task assignments:');
  rrResult.tasks.forEach(task => {
    console.log(`  ${task.description} → ${task.assignedAgent?.getName()}`);
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Swarm Mode Benefits');
  console.log('='.repeat(80));
  console.log('✓ Distribute tasks among multiple agents');
  console.log('✓ Dynamic agent scaling (add/remove agents)');
  console.log('✓ Flexible task assignment strategies');
  console.log('✓ Independent task execution');
  console.log('✓ Comprehensive task tracking and results');
  console.log('✓ Ideal for parallel workloads and batch processing');
  console.log('='.repeat(80));

  console.log('\nUse Cases:');
  console.log('• Content generation pipeline (research → write → review)');
  console.log('• Code review and testing (multiple reviewers)');
  console.log('• Data processing workflows');
  console.log('• Multi-step task automation');
  console.log('• Distributed problem solving');
  console.log('='.repeat(80));
}

main().catch(console.error);
