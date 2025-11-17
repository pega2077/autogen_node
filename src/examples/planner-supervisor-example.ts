import { PlannerAgent } from '../agents/PlannerAgent';
import { SupervisorAgent } from '../agents/SupervisorAgent';
import { AssistantAgent } from '../agents/AssistantAgent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example demonstrating planning and supervisor agents with Ollama
 * 
 * This example shows:
 * 1. User provides a requirement
 * 2. PlannerAgent breaks down the requirement into tasks
 * 3. Tasks are assigned to worker agents for execution
 * 4. SupervisorAgent verifies completion and provides feedback
 * 5. Loop continues until all requirements are met
 */
async function main() {
  console.log('='.repeat(60));
  console.log('AutoGen Node.js - Planner-Supervisor Example (Ollama)');
  console.log('='.repeat(60));
  console.log('This example demonstrates multi-agent collaboration with');
  console.log('planning, execution, and supervision.\n');

  console.log('Prerequisites:');
  console.log('1. Install Ollama from https://ollama.ai/');
  console.log('2. Run: ollama pull llama2 (or your preferred model)');
  console.log('3. Ensure Ollama server is running');
  console.log('4. Run this example\n');

  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const model = process.env.OLLAMA_MODEL || 'llama2';

  console.log(`Configuration:`);
  console.log(`  Ollama URL: ${ollamaURL}`);
  console.log(`  Model: ${model}\n`);

  try {
    // Create the planning agent
    const planner = new PlannerAgent({
      name: 'planner',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      temperature: 0.7,
      maxTokens: 1000
    });

    // Create the supervisor agent
    const supervisor = new SupervisorAgent({
      name: 'supervisor',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      temperature: 0.3,
      maxTokens: 1000,
      maxIterations: 3
    });

    // Create worker agents with different specializations
    const researcher = new AssistantAgent({
      name: 'researcher',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: 'You are a research agent. Your role is to gather information, analyze topics, and provide well-researched answers. Be thorough and factual.',
      temperature: 0.5,
      maxTokens: 800
    });

    const writer = new AssistantAgent({
      name: 'writer',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: 'You are a writer agent. Your role is to create clear, well-structured content. Focus on clarity, coherence, and good writing style.',
      temperature: 0.8,
      maxTokens: 800
    });

    const reviewer = new AssistantAgent({
      name: 'reviewer',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: 'You are a reviewer agent. Your role is to review content for accuracy, completeness, and quality. Provide constructive feedback.',
      temperature: 0.4,
      maxTokens: 800
    });

    // Map of available worker agents
    const workerAgents: { [key: string]: AssistantAgent } = {
      'researcher': researcher,
      'writer': writer,
      'reviewer': reviewer
    };

    // User requirement
    const userRequirement = `Create a brief guide about Node.js for beginners. 
The guide should include:
1. What Node.js is and why it's useful
2. Basic setup instructions
3. A simple "Hello World" example`;

    console.log('='.repeat(60));
    console.log('USER REQUIREMENT:');
    console.log('='.repeat(60));
    console.log(userRequirement);
    console.log('\n');

    // Step 1: Planner creates a plan
    console.log('='.repeat(60));
    console.log('STEP 1: PLANNING PHASE');
    console.log('='.repeat(60));
    console.log(`[${planner.getName()}]: Creating plan...\n`);

    const plan = await planner.createPlan(userRequirement);
    
    console.log(planner.getPlanSummary());
    console.log('\n');

    // Step 2: Execute tasks with worker agents
    console.log('='.repeat(60));
    console.log('STEP 2: EXECUTION PHASE');
    console.log('='.repeat(60));

    const executionResults: string[] = [];
    
    for (const task of plan.tasks) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Executing Task ${task.id}: ${task.description}`);
      console.log(`${'─'.repeat(60)}\n`);

      // Assign task based on keywords in description
      let selectedAgent: AssistantAgent;
      let agentName: string;

      const taskLower = task.description.toLowerCase();
      if (taskLower.includes('research') || taskLower.includes('gather') || taskLower.includes('what is') || taskLower.includes('why')) {
        selectedAgent = researcher;
        agentName = 'researcher';
      } else if (taskLower.includes('write') || taskLower.includes('create') || taskLower.includes('guide') || taskLower.includes('example')) {
        selectedAgent = writer;
        agentName = 'writer';
      } else {
        selectedAgent = reviewer;
        agentName = 'reviewer';
      }

      planner.assignTask(task.id, agentName);
      planner.updateTaskStatus(task.id, 'in_progress');

      console.log(`[Assigned to: ${agentName}]`);
      console.log(`Processing...\n`);

      // Execute the task
      const taskMessage = `Please complete this task: ${task.description}\n\nContext: ${userRequirement}`;
      const result = await selectedAgent.generateReply([
        { role: 'user', content: taskMessage }
      ]);

      console.log(`[${agentName}]: ${result.content}\n`);

      // Update task status
      planner.updateTaskStatus(task.id, 'completed', result.content);
      executionResults.push(`Task ${task.id} (${agentName}): ${result.content}`);
    }

    console.log('\n');
    console.log(planner.getPlanSummary());
    console.log('\n');

    // Step 3: Supervisor verifies completion
    console.log('='.repeat(60));
    console.log('STEP 3: SUPERVISION & VERIFICATION');
    console.log('='.repeat(60));
    console.log(`[${supervisor.getName()}]: Verifying completion...\n`);

    const verification = await supervisor.verifyCompletion(
      userRequirement,
      plan,
      executionResults
    );

    console.log(supervisor.generateFeedbackSummary(verification));

    // Step 4: Handle feedback loop if needed
    if (!verification.isComplete && !supervisor.hasReachedMaxIterations()) {
      console.log('='.repeat(60));
      console.log('STEP 4: ADDRESSING FEEDBACK');
      console.log('='.repeat(60));
      console.log('Supervisor identified missing items. Addressing feedback...\n');

      for (const missingTask of verification.missingTasks.slice(0, 2)) { // Limit to 2 iterations
        console.log(`\nAddressing: ${missingTask}\n`);
        
        // Use writer to address missing items
        const feedbackResult = await writer.generateReply([
          { role: 'user', content: `Please address this feedback: ${missingTask}\n\nOriginal requirement: ${userRequirement}` }
        ]);

        console.log(`[${writer.getName()}]: ${feedbackResult.content}\n`);
        executionResults.push(`Feedback addressed: ${feedbackResult.content}`);
      }

      // Re-verify
      console.log('='.repeat(60));
      console.log('RE-VERIFICATION');
      console.log('='.repeat(60));
      console.log(`[${supervisor.getName()}]: Re-verifying completion...\n`);

      const finalVerification = await supervisor.verifyCompletion(
        userRequirement,
        plan,
        executionResults
      );

      console.log(supervisor.generateFeedbackSummary(finalVerification));
    }

    // Final summary
    console.log('\n');
    console.log('='.repeat(60));
    console.log('WORKFLOW COMPLETED');
    console.log('='.repeat(60));
    console.log(`Total tasks executed: ${plan.tasks.length}`);
    console.log(`Supervisor iterations: ${supervisor.getCurrentIteration()}`);
    console.log(`Final status: ${verification.isComplete ? 'REQUIREMENTS MET ✓' : 'PARTIAL COMPLETION'}`);
    console.log('='.repeat(60));

    console.log('\n');
    console.log('Summary of this example:');
    console.log('1. PlannerAgent analyzed requirements and created a task plan');
    console.log('2. Worker agents (researcher, writer, reviewer) executed tasks');
    console.log('3. SupervisorAgent verified completion and provided feedback');
    console.log('4. System addressed any missing items identified by supervisor');
    console.log('\nThis demonstrates a complete planning-execution-supervision cycle!');

  } catch (error) {
    console.error('\nError:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n⚠️  Could not connect to Ollama server.');
        console.error('Please ensure:');
        console.error('1. Ollama is installed');
        console.error('2. Ollama server is running');
        console.error(`3. The model is downloaded (run: ollama pull ${process.env.OLLAMA_MODEL || 'llama2'})`);
      }
    }
  }
}

// Run the example
main().catch(console.error);
