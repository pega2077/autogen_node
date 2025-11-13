/**
 * Example: Sequential Chat
 * 
 * This example demonstrates how to use sequential chat for workflow automation.
 * Sequential chat executes agents in a predefined order, passing outputs from
 * one agent to the next. This is useful for:
 * - Multi-stage workflows
 * - Processing pipelines
 * - Structured task decomposition
 */

import * as dotenv from 'dotenv';
import { AssistantAgent } from '../agents/AssistantAgent';
import {
  runSequentialChat,
  summarizeSequentialChat,
  SequentialChatStep
} from '../core/SequentialChat';

// Load environment variables
dotenv.config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Please set OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('Sequential Chat Example: Article Writing Workflow');
  console.log('='.repeat(80));
  console.log();

  // Create specialized agents for each step of the workflow
  const researcher = new AssistantAgent({
    name: 'researcher',
    systemMessage: `You are a research assistant. Gather key facts and information 
    about the topic. Be concise and factual. Provide 3-5 key points.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  const writer = new AssistantAgent({
    name: 'writer',
    systemMessage: `You are a content writer. Take the research provided and write 
    a well-structured article. Keep it under 200 words. Write clearly and engagingly.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7
  });

  const editor = new AssistantAgent({
    name: 'editor',
    systemMessage: `You are an editor. Review the article for clarity, grammar, 
    and structure. Make improvements and provide the final version. Say TERMINATE 
    when done.`,
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.5
  });

  // Define the sequential workflow
  const steps: SequentialChatStep[] = [
    {
      agent: researcher,
      maxRounds: 1
    },
    {
      agent: writer,
      maxRounds: 1
    },
    {
      agent: editor,
      maxRounds: 1
    }
  ];

  // Execute the workflow
  console.log('Starting article writing workflow...\n');
  console.log('Topic: The benefits of renewable energy\n');
  console.log('-'.repeat(80));

  const startTime = Date.now();

  const result = await runSequentialChat({
    steps,
    initialMessage: 'Research and write an article about: The benefits of renewable energy',
    collectResults: true
  });

  const endTime = Date.now();

  // Display results from each step
  console.log('\n' + '='.repeat(80));
  console.log('WORKFLOW RESULTS');
  console.log('='.repeat(80));
  console.log();

  result.stepResults.forEach((step, index) => {
    console.log(`Step ${index + 1}: ${step.agentName.toUpperCase()}`);
    console.log('-'.repeat(80));
    console.log(step.finalMessage.content);
    console.log();
  });

  // Display summary
  console.log('='.repeat(80));
  console.log(summarizeSequentialChat(result));
  console.log(`Total execution time: ${endTime - startTime}ms`);
  console.log('='.repeat(80));

  // Example 2: Data processing pipeline
  console.log('\n\n' + '='.repeat(80));
  console.log('Sequential Chat Example: Data Processing Pipeline');
  console.log('='.repeat(80));
  console.log();

  const dataCollector = new AssistantAgent({
    name: 'data_collector',
    systemMessage: 'You collect and validate data. Return a JSON object with sample data.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.2
  });

  const dataAnalyzer = new AssistantAgent({
    name: 'data_analyzer',
    systemMessage: 'You analyze data and identify patterns. Provide insights.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.3
  });

  const reportGenerator = new AssistantAgent({
    name: 'report_generator',
    systemMessage: 'You create reports. Summarize findings clearly. Say TERMINATE when done.',
    provider: 'openai',
    apiKey: apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.5
  });

  const pipelineSteps: SequentialChatStep[] = [
    {
      agent: dataCollector,
      message: 'Collect sample user activity data for analysis'
    },
    {
      agent: dataAnalyzer,
      maxRounds: 1
    },
    {
      agent: reportGenerator,
      maxRounds: 1
    }
  ];

  console.log('Running data processing pipeline...\n');

  const pipelineResult = await runSequentialChat({
    steps: pipelineSteps,
    initialMessage: 'Start data pipeline',
    collectResults: true
  });

  console.log('Pipeline completed!\n');
  console.log('Final Report:');
  console.log('-'.repeat(80));
  console.log(pipelineResult.finalMessage.content);
  console.log('-'.repeat(80));

  console.log('\n' + '='.repeat(80));
  console.log('Sequential Chat Benefits:');
  console.log('='.repeat(80));
  console.log('✓ Automated multi-stage workflows');
  console.log('✓ Clear separation of concerns');
  console.log('✓ Predictable execution order');
  console.log('✓ Easy to maintain and modify');
  console.log('✓ Great for ETL, content generation, and more');
  console.log('='.repeat(80));
}

main().catch(console.error);
