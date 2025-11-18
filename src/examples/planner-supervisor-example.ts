import { PlannerAgent } from '../agents/PlannerAgent';
import { SupervisorAgent } from '../agents/SupervisorAgent';
import { AssistantAgent } from '../agents/AssistantAgent';
import { FileSystemTool } from '../tools/FileSystemTool';
import * as path from 'path';
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
 * 5. If incomplete, the system RE-PLANS with feedback (up to 3 iterations by default)
 * 6. Loop continues until all requirements are met or max iterations reached
 * 7. Worker agents autonomously decide when to save their work using file writing tools
 * 
 * Configuration:
 * - MAX_FEEDBACK_LOOPS: Set via MAX_FEEDBACK_LOOPS env var (default: 3)
 * - When supervisor identifies incomplete work, a new plan is created incorporating the feedback
 * - Worker agents have access to file writing tools and autonomously choose when to save results
 * - Files are saved to src/examples/temp directory when agents decide it's appropriate
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
  const maxFeedbackLoops = parseInt(process.env.MAX_FEEDBACK_LOOPS || '3', 10);

  // Set up file system tool for saving results
  const tempDir = path.join(__dirname, 'temp');
  const fileSystemTool = new FileSystemTool({
    basePath: tempDir,
    allowedExtensions: ['.txt', '.md', '.json']
  });

  console.log(`Configuration:`);
  console.log(`  Ollama URL: ${ollamaURL}`);
  console.log(`  Model: ${model}`);
  console.log(`  Max Feedback Loops: ${maxFeedbackLoops}`);
  console.log(`  Output Directory: ${tempDir}\n`);

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

    // Create function contracts for file operations
    const fileSystemFunctions = FileSystemTool.createFunctionContracts(fileSystemTool);

    // Create worker agents with different specializations
    const researcher = new AssistantAgent({
      name: 'researcher',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: `You are a research agent. Your role is to gather information, analyze topics, and provide well-researched answers. Be thorough and factual.

You have access to file operations and can save your research findings to files when appropriate. Consider saving important research results to preserve them.`,
      temperature: 0.5,
      maxTokens: 800,
      functions: fileSystemFunctions
    });

    const writer = new AssistantAgent({
      name: 'writer',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: `You are a writer agent. Your role is to create clear, well-structured content. Focus on clarity, coherence, and good writing style.

You have access to file writing tools. When you create content (guides, documentation, articles, etc.), you should SAVE your work to appropriate files using the write_file function. Use descriptive filenames like 'guide.md', 'tutorial.txt', or 'summary.md'. This ensures your work is preserved and can be reviewed later.`,
      temperature: 0.8,
      maxTokens: 800,
      functions: fileSystemFunctions
    });

    const reviewer = new AssistantAgent({
      name: 'reviewer',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: `You are a reviewer agent. Your role is to review content for accuracy, completeness, and quality. Provide constructive feedback.

You have access to file operations. Consider saving your review reports or feedback summaries to files when it would be helpful for documentation purposes.`,
      temperature: 0.4,
      maxTokens: 800,
      functions: fileSystemFunctions
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

    // Use configurable maximum feedback loop iterations (default 3)
    let feedbackLoopCount = 0;
    let isComplete = false;
    let currentRequirement = userRequirement;
    let allExecutionResults: string[] = [];

    // Main feedback loop: plan → execute → verify → re-plan if needed
    while (!isComplete && feedbackLoopCount < maxFeedbackLoops) {
      feedbackLoopCount++;
      
      console.log('='.repeat(60));
      console.log(`FEEDBACK LOOP ITERATION ${feedbackLoopCount}/${maxFeedbackLoops}`);
      console.log('='.repeat(60));
      console.log('\n');

      // Step 1: Planner creates a plan
      console.log('='.repeat(60));
      console.log('STEP 1: PLANNING PHASE');
      console.log('='.repeat(60));
      console.log(`[${planner.getName()}]: Creating plan...\n`);

      const plan = await planner.createPlan(currentRequirement);
      
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

      // Add current execution results to all results
      allExecutionResults = allExecutionResults.concat(executionResults);

      // Step 3: Supervisor verifies completion
      console.log('='.repeat(60));
      console.log('STEP 3: SUPERVISION & VERIFICATION');
      console.log('='.repeat(60));
      console.log(`[${supervisor.getName()}]: Verifying completion...\n`);

      const verification = await supervisor.verifyCompletion(
        userRequirement,
        plan,
        allExecutionResults
      );

      console.log(supervisor.generateFeedbackSummary(verification));

      // Check if requirements are met
      if (verification.isComplete) {
        isComplete = true;
        console.log('\n✅ All requirements met! Workflow complete.\n');
      } else if (feedbackLoopCount < maxFeedbackLoops) {
        // Step 4: Prepare for re-planning based on feedback
        console.log('='.repeat(60));
        console.log('STEP 4: PREPARING FOR RE-PLANNING');
        console.log('='.repeat(60));
        console.log('Supervisor identified incomplete work. Will re-plan with feedback...\n');

        // Update requirement to include feedback for next iteration
        const feedbackSummary = verification.missingTasks.length > 0 
          ? `Missing items:\n${verification.missingTasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
          : verification.feedback;

        currentRequirement = `${userRequirement}\n\nPrevious attempt feedback:\n${feedbackSummary}\n\nPlease create a new plan addressing the missing items.`;
        
        console.log('Feedback for next iteration:');
        console.log(feedbackSummary);
        console.log('\n');
      } else {
        console.log('\n⚠️  Maximum feedback loops reached. Stopping.\n');
      }
    }

    // Final summary
    console.log('\n');
    console.log('='.repeat(60));
    console.log('WORKFLOW COMPLETED');
    console.log('='.repeat(60));
    console.log(`Feedback loop iterations: ${feedbackLoopCount}/${maxFeedbackLoops}`);
    console.log(`Final status: ${isComplete ? 'REQUIREMENTS MET ✓' : 'PARTIAL COMPLETION'}`);
    console.log('='.repeat(60));

    console.log('\n');
    console.log('📁 Note: Agents with file writing capabilities may have saved their work to:', tempDir);
    console.log('   Check the temp directory for any files created by the agents during execution.');
    console.log('='.repeat(60));

    console.log('\n');
    console.log('Summary of this example:');
    console.log('1. PlannerAgent analyzes requirements and creates a task plan');
    console.log('2. Worker agents (researcher, writer, reviewer) execute tasks');
    console.log('3. Worker agents autonomously decide when to save their work to files');
    console.log('4. SupervisorAgent verifies completion and provides feedback');
    console.log(`5. If incomplete, system RE-PLANS and re-executes (up to ${maxFeedbackLoops} loops)`);
    console.log(`6. Completed in ${feedbackLoopCount} iteration(s)`);
    console.log('\nThis demonstrates a complete planning-execution-supervision cycle with autonomous agent behavior!');

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
