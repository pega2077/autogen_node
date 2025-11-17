import { AssistantAgent, FileSystemTool } from '../index';
import { IMessage } from '../core/IAgent';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';

interface StepPlan {
  stepId: string;
  description: string;
  stepResult: string;
  requiredTool: string;
  executionStatus: string;
}

interface PlanPayload {
  status: string;
  steps: StepPlan[];
}

function extractJsonPayload<T>(rawContent: string): T | null {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return null;
  }

  const jsonCandidate = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
    : trimmed;

  try {
    return JSON.parse(jsonCandidate) as T;
  } catch (error) {
    // console.warn('Failed to parse JSON payload from LLM response:', error);
    console.warn('Raw content was:', rawContent);
    return null;
  }
}

function extractFinalResult(rawContent: string): {
  category?: string;
  filename?: string;
  fullPath?: string;
  message?: string;
} {
  const result: { category?: string; filename?: string; fullPath?: string; message?: string } = {};
  if (!rawContent) return result;
  const text = rawContent.trim();

  // Try to capture fields like: - **Category/Folder**: `q4-planning`
  const categoryMatch = text.match(/Category(?:\/|\\)?Folder\**:\s*`?"?([^`"\n]+)`?"?/i) || text.match(/Category\/?Folder\**:\s*([^\n]+)/i);
  const filenameMatch = text.match(/Filename\**:\s*`?"?([^`"\n]+)`?"?/i) || text.match(/Filename\**:\s*([^\n]+)/i);
  const pathMatch = text.match(/Full\s*Path\**:\s*`?"?([^`"\n]+)`?"?/i) || text.match(/Full\s*Path\**:\s*([^\n]+)/i);

  if (categoryMatch) result.category = categoryMatch[1].trim();
  if (filenameMatch) result.filename = filenameMatch[1].trim();
  if (pathMatch) result.fullPath = pathMatch[1].trim();

  if (!result.category || !result.filename || !result.fullPath) {
    // Attempt a looser parse for lines starting with '-'
    const lines = text.split(/\r?\n/);
    for (const l of lines) {
      const m = l.match(/^-\s*\*?\*?([^:\*]+)\*?\*?:\s*`?"?([^`"\n]+)`?"?/i);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const value = m[2].trim();
      if (key.includes('category') || key.includes('folder')) result.category = result.category || value;
      if (key.includes('filename') || key.includes('file name')) result.filename = result.filename || value;
      if (key.includes('full path') || key.includes('path')) result.fullPath = result.fullPath || value;
    }
  }

  // Store original reply as message if nothing else
  result.message = text;
  return result;
}

function isValidFinalSchema(obj: any): obj is { status: 'DONE' | 'ERROR'; result: { category: string; filename: string; fullPath: string } } {
  if (!obj || typeof obj !== 'object') return false;
  if (!('status' in obj) || !('result' in obj)) return false;
  const { status, result } = obj as any;
  if (status !== 'DONE' && status !== 'ERROR') return false;
  if (!result || typeof result !== 'object') return false;
  if (typeof result.category !== 'string') return false;
  if (typeof result.filename !== 'string') return false;
  if (typeof result.fullPath !== 'string') return false;
  return true;
}

// Load environment variables
dotenv.config();

/**
 * Example: Automatic File Organization with Ollama
 * 
 * This example demonstrates how to use Ollama (local LLM) to:
 * 1. Read text file content
 * 2. Analyze the content using LLM
 * 3. Automatically suggest and apply:
 *    - New file name based on content
 *    - Tags/categories
 *    - Appropriate folder structure
 * 
 * Prerequisites:
 * 1. Install Ollama from https://ollama.ai/
 * 2. Run: ollama pull llama2 (or another model like mistral, codellama)
 * 3. Ensure Ollama server is running (usually automatic)
 */

async function main() {
  console.log('='.repeat(70));
  console.log('AutoGen Node.js - Ollama File Organizer Example');
  console.log('='.repeat(70));
  console.log('Using Ollama for intelligent file organization...\n');

  // Target directory and input file (overrides default test directory)
  const targetDir = path.resolve('D:/test/New folder');
  const inputFileName = 'test.md';
  const inputFilePath = path.join(targetDir, inputFileName);
  const testDir = targetDir; // maintain variable name used broadly in the example
  console.log(`Test directory: ${testDir}`);
  console.log(`Input file: ${inputFilePath}\n`);

  // Get custom Ollama URL from environment or use default
  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';

  // Create File System Tool
  const fsTool = new FileSystemTool({
    basePath: testDir,
    allowedExtensions: ['.txt', '.md', '.json', '.csv', '.log']
  });

  // Ensure base directory exists
  await fsTool.createDirectory('.');

  // Create sample input file if it does not already exist
  console.log('Ensuring input file exists...');
  
  if (!(await fsTool.exists(inputFileName))) {
    await fsTool.writeFile(inputFileName, 
    `Meeting Notes - Q4 Planning Session
Date: November 16, 2025
Attendees: John, Sarah, Mike

Agenda:
1. Review Q3 results
2. Set Q4 goals
3. Budget allocation
4. Team expansion plans

Action Items:
- John: Prepare Q3 report by Nov 20
- Sarah: Draft Q4 budget proposal
- Mike: Research new tools for team collaboration

Next meeting: November 30, 2025`);

    console.log('Sample input file created.\n');
  } else {
    console.log('Input file already exists; skipping creation.\n');
  }

  // Create function contracts from the tool
  const functions = FileSystemTool.createFunctionContracts(fsTool);

  // Create an agent using Ollama with file system capabilities
  const organizerAgent = new AssistantAgent({
    name: 'file_organizer',
    provider: 'ollama',
    debug: false,
    model: process.env.OLLAMA_MODEL || 'llama2',
    baseURL: ollamaURL,
    systemMessage: `You are a helpful file organization assistant. You can analyze text files and organize them intelligently.

  Before recommending a folder or creating one, inspect the target directory's existing folders (use the provided tools to list them) and determine whether one already suits the content. Prefer reusing an existing folder; only create a new folder when no suitable match exists, and explicitly justify why it was needed.

Before calling any tool, you MUST output a plan in LLM JSON format. Return a JSON object that matches this schema exactly:
{
  "status": "AWAITING_APPROVAL",
  "steps": [
    {
      "stepId": "string",
      "description": "string",
      "stepResult": "string (expected outcome before execution)",
      "requiredTool": "string (function name or \"none\")",
      "executionStatus": "pending"
    }
  ]
}
The JSON must not include any extra text, comments, or markdown fences. Wait for explicit approval before executing the plan. Once approved, carry out each step sequentially, invoking at most one function per step. After each action, report what you did, update the executionStatus conceptually, and wait for the next instruction. When everything is finished, respond with "DONE".

When finished, output a final JSON object only (no other text) that matches the following schema exactly:
{
  "status": "DONE",
  "result": {
    "category": "string",
    "filename": "string",
    "fullPath": "string"
  }
}
No additional explanations or text should be included outside the JSON. The JSON can be wrapped in triple backticks or returned as plain JSON—both are accepted. If you cannot produce the JSON for any reason, return an appropriate error object using the same structure, setting status to "ERROR" and providing details in result.

Your tasks:
1. Read file content
2. Analyze the content to understand what it's about
3. Suggest appropriate folder/category (e.g., "meetings", "recipes", "logs", "documents")
4. Suggest a descriptive file name based on content (keep it concise, use lowercase with hyphens)
5. Create the target folder if needed
6. Move and rename the file

Always use the provided functions to perform file operations.
Be systematic: plan -> read -> analyze -> create folder -> rename/move file.`,
    temperature: 0.3, // Lower temperature for more consistent categorization
    maxTokens: 4096,
    functions
  });

  try {
    // List files to organize
    console.log('Files to organize:');
    const files = await fsTool.listDirectory('.');
    console.log(files.join('\n'));
    console.log();

    // Organize each file
    const filesToOrganize = [inputFileName];
    
    for (const fileName of filesToOrganize) {
      console.log('='.repeat(70));
      console.log(`Processing: ${fileName}`);
      console.log('='.repeat(70));

      const conversation: IMessage[] = [
        {
          role: 'user',
          content: `We need to organize the file "${fileName}". Follow the system instructions: plan first, wait for approval, then execute each step sequentially using the provided tools. Outcomes required: read the file, inspect existing folders in the target directory for a suitable fit before creating new ones, choose the best matching category/folder (reusing an existing folder whenever practical), produce a descriptive lowercase-hyphenated file name, move/rename the file, and report the final category, filename, and full path.`
        }
      ];

      console.log('Requesting plan...\n');
      const planResponse = await organizerAgent.generateReply(conversation);
      console.log('Proposed Plan (raw JSON):');
      console.log(planResponse.content);
      
      const planPayload = extractJsonPayload<PlanPayload>(planResponse.content);
      if (!planPayload || !Array.isArray(planPayload.steps) || planPayload.steps.length === 0) {
        console.log(planPayload);
        //throw new Error('Failed to parse plan JSON from LLM response.');
        return;
      }

      console.log('\nParsed Plan Steps:');
      planPayload.steps.forEach(step => {
        console.log(`- ${step.stepId}: ${step.description} | expected=${step.stepResult} | tool=${step.requiredTool} | status=${step.executionStatus}`);
      });
      console.log();

      conversation.push(planResponse);

      if (planPayload.steps.length === 0) {
        throw new Error('Plan response did not include any steps.');
      }

      const totalSteps = planPayload.steps.length;
      const firstStep = planPayload.steps[0];

      conversation.push({
        role: 'user',
        content: `Plan approved. Execute plan step ${firstStep.stepId} (${firstStep.description}).
Required tool: ${firstStep.requiredTool}.
Plan JSON: ${JSON.stringify(planPayload)}
Perform one action at a time, summarize the outcome, and wait for further instructions. Reply with DONE when all steps are complete.`
      });

      let completed = false;
      let finalAssistantMessage: IMessage | null = null;

      for (let stepIndex = 0; stepIndex < totalSteps; stepIndex++) {
        const currentStep = planPayload.steps[stepIndex];
        console.log(`Executing plan step ${currentStep.stepId} (${currentStep.description})...\n`);
        const stepResponse = await organizerAgent.generateReply(conversation);
        console.log('Agent Response:');
        console.log(stepResponse.content);
        console.log();

        conversation.push(stepResponse);
        finalAssistantMessage = stepResponse;

        if (stepResponse.content.toUpperCase().includes('DONE')) {
          if (stepIndex < totalSteps - 1) {
            console.warn('Agent reported DONE before all planned steps were processed.');
          }
          completed = true;
          break;
        }

        if (stepIndex < totalSteps - 1) {
          const nextStep = planPayload.steps[stepIndex + 1];
          conversation.push({
            role: 'user',
            content: `Proceed to plan step ${nextStep.stepId} (${nextStep.description}). Required tool: ${nextStep.requiredTool}.`
          });
        }
      }

      if (!completed) {
        throw new Error('Agent did not confirm completion after executing all planned steps.');
      }

      // Basic completion verification: ensure original file no longer exists at root
      const originalStillExists = await fsTool.exists('document1.txt');
      if (originalStillExists) {
        console.warn('Warning: Original file still exists at root. Task may be incomplete.');
      } else {
        console.log('Original file no longer present at root directory.');
      }

      if (finalAssistantMessage) {
        console.log('Final agent message:');
        console.log(finalAssistantMessage.content);
        // Try to parse JSON result
        let finalResultJson = extractJsonPayload<any>(finalAssistantMessage.content);
        // If invalid, ask for JSON-only final result up to n attempts
        const maxFinalJsonAttempts = 3;
        let finalJsonAttempt = 0;
        let finalJsonResponse: any = null;
        
        if (!finalResultJson) {
          while (finalJsonAttempt < maxFinalJsonAttempts) {
            finalJsonAttempt++;
            console.log(`Requesting final result as strict JSON (attempt ${finalJsonAttempt}/${maxFinalJsonAttempts})`);
            const jsonOnlyPrompt = {
              role: 'user' as const,
              content: 'Please provide the final result as strict JSON only, matching the schema {"status":"DONE","result":{"category":"string","filename":"string","fullPath":"string"}}. Return only the JSON object with no additional text.'
            };
            conversation.push(jsonOnlyPrompt);
            const jsonOnlyReply = await organizerAgent.generateReply(conversation);
            conversation.push(jsonOnlyReply);
            finalResultJson = extractJsonPayload<any>(jsonOnlyReply.content);
            if (finalResultJson) {
              finalJsonResponse = jsonOnlyReply;
              break;
            }
          }
        }
        if (finalResultJson && isValidFinalSchema(finalResultJson)) {
          console.log('\nFinal Result (parsed JSON):');
          console.log(JSON.stringify(finalResultJson, null, 2));
        } else {
          // If JSON not valid per schema, fallback: extract fields from human-readable text
          const parsed = extractFinalResult(finalAssistantMessage.content);
          if (parsed.category || parsed.filename || parsed.fullPath) {
            console.log('\nFinal Result (extracted):');
            console.log(`Category: ${parsed.category}`);
            console.log(`Filename: ${parsed.filename}`);
            console.log(`Full Path: ${parsed.fullPath}`);
          } else {
            console.log('\nFinal Result: (could not parse structured data from message)');
          }
        }
        console.log();
      }
    }

    // Show final directory structure
    console.log('='.repeat(70));
    console.log('Final Directory Structure:');
    console.log('='.repeat(70));
    
    async function printDirectory(dirPath: string, indent: string = '') {
      const entries = await fsTool.listDirectory(dirPath);
      for (const entry of entries) {
        console.log(indent + entry);
        if (entry.startsWith('[DIR]')) {
          const dirName = entry.replace('[DIR] ', '');
          try {
            await printDirectory(path.join(dirPath, dirName), indent + '  ');
          } catch (e) {
            // Ignore errors for subdirectories
          }
        }
      }
    }
    
    await printDirectory('.');
    console.log();

    console.log('='.repeat(70));
    console.log('File organization completed successfully!');
    console.log('='.repeat(70));
    console.log('\nNote: This example uses Ollama running locally.');
    console.log('The LLM analyzes file content and organizes them intelligently.');
    
    // Cleanup
    console.log('\n\nCleaning up test directory...');
    // await fsTool.deleteDirectory('.');
    // console.log('Done!');

  } catch (error) {
    console.error('\nError:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n⚠️  Could not connect to Ollama server.');
        console.error('Please ensure:');
        console.error('1. Ollama is installed');
        console.error('2. Ollama server is running');
        console.error('3. The model is downloaded (run: ollama pull llama2)');
      }
    }
  }
}

// Run the example
main().catch(console.error);


