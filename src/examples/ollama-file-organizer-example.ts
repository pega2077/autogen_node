import { AssistantAgent, FileSystemTool } from '../index';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';

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

  // Create a test directory
  const testDir = path.join(os.tmpdir(), 'autogen-file-organizer-test');
  console.log(`Test directory: ${testDir}\n`);

  // Get custom Ollama URL from environment or use default
  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';

  // Create File System Tool
  const fsTool = new FileSystemTool({
    basePath: testDir,
    allowedExtensions: ['.txt', '.md', '.json', '.csv', '.log']
  });

  // Ensure base directory exists
  await fsTool.createDirectory('.');

  // Create sample files to organize
  console.log('Creating sample files...');
  
  await fsTool.writeFile('document1.txt', 
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

  await fsTool.writeFile('file2.txt',
    `Recipe: Chocolate Chip Cookies

Ingredients:
- 2 cups all-purpose flour
- 1 tsp baking soda
- 1/2 tsp salt
- 1 cup butter, softened
- 3/4 cup granulated sugar
- 3/4 cup packed brown sugar
- 2 large eggs
- 2 tsp vanilla extract
- 2 cups chocolate chips

Instructions:
1. Preheat oven to 375°F
2. Mix dry ingredients in a bowl
3. Cream butter and sugars
4. Add eggs and vanilla
5. Gradually blend in dry ingredients
6. Stir in chocolate chips
7. Bake for 9-11 minutes

Yield: 48 cookies`);

  await fsTool.writeFile('temp_data.txt',
    `System Performance Log
Date: 2025-11-16
Time: 10:30:00

CPU Usage: 45%
Memory Usage: 62%
Disk I/O: 120 MB/s
Network Traffic: 25 Mbps

Warnings:
- High memory usage detected
- Disk space below 20%

Recommendation: Clear cache and temporary files`);

  console.log('Sample files created.\n');

  // Create function contracts from the tool
  const functions = FileSystemTool.createFunctionContracts(fsTool);

  // Create an agent using Ollama with file system capabilities
  const organizerAgent = new AssistantAgent({
    name: 'file_organizer',
    provider: 'ollama',
    model: process.env.OLLAMA_MODEL || 'llama2',
    baseURL: ollamaURL,
    systemMessage: `You are a helpful file organization assistant. You can analyze text files and organize them intelligently.

Your tasks:
1. Read file content
2. Analyze the content to understand what it's about
3. Suggest appropriate folder/category (e.g., "meetings", "recipes", "logs", "documents")
4. Suggest a descriptive file name based on content (keep it concise, use lowercase with hyphens)
5. Create the target folder if needed
6. Move and rename the file

Always use the provided functions to perform file operations.
Be systematic: read -> analyze -> create folder -> rename/move file.`,
    temperature: 0.3, // Lower temperature for more consistent categorization
    maxTokens: 1000,
    functions
  });

  try {
    // List files to organize
    console.log('Files to organize:');
    const files = await fsTool.listDirectory('.');
    console.log(files.join('\n'));
    console.log();

    // Organize each file
    const filesToOrganize = ['document1.txt', 'file2.txt', 'temp_data.txt'];
    
    for (const fileName of filesToOrganize) {
      console.log('='.repeat(70));
      console.log(`Processing: ${fileName}`);
      console.log('='.repeat(70));

      const messages = [
        {
          role: 'user' as const,
          content: `Please organize the file "${fileName}":
1. Read its content
2. Determine what category/folder it should be in (e.g., meetings, recipes, logs, documents, etc.)
3. Create an appropriate folder if it doesn't exist
4. Suggest a descriptive file name based on the content (use lowercase with hyphens, keep original extension)
5. Move and rename the file to the new location

After organizing, tell me:
- What category you chose and why
- What the new file name is
- The new full path`
        }
      ];

      console.log('Analyzing and organizing...\n');
      const response = await organizerAgent.generateReply(messages);
      console.log('Agent Response:');
      console.log(response.content);
      console.log('\n');
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
    await fsTool.deleteDirectory('.');
    console.log('Done!');

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
