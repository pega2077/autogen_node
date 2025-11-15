import { AssistantAgent, FileSystemTool, HumanInputMode } from '../index';
import * as path from 'path';
import * as os from 'os';

/**
 * Example: Using FileSystemTool with an agent
 * Demonstrates file read/write and directory operations
 */
async function main() {
  console.log('=== File System Tool Example ===\n');

  // Create a temporary directory for testing
  const testDir = path.join(os.tmpdir(), 'autogen-fs-test');

  // Create File System Tool with restricted base path
  const fsTool = new FileSystemTool({
    basePath: testDir,
    allowedExtensions: ['.txt', '.md', '.json']
  });

  // Create function contracts from the tool
  const functions = FileSystemTool.createFunctionContracts(fsTool);

  // Create assistant agent with file system functions
  const assistant = new AssistantAgent({
    name: 'file_assistant',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY!,
    systemMessage: `You are a helpful file management assistant. You can read, write, and organize files.
Use the provided functions to help users with file operations.
Always confirm operations before executing them.`,
    model: 'gpt-3.5-turbo',
    functions
  });

  console.log('Assistant created with file system tools:');
  console.log('- read_file');
  console.log('- write_file');
  console.log('- list_directory');
  console.log('- create_directory');
  console.log('- delete_file');
  console.log('- file_exists\n');

  // Example 1: Create a directory
  console.log('Example 1: Create directory and write files');
  await fsTool.createDirectory('documents');
  console.log('Created directory: documents/');

  await fsTool.writeFile('documents/hello.txt', 'Hello, World!');
  console.log('Created file: documents/hello.txt');

  await fsTool.writeFile('documents/readme.md', '# Test Project\n\nThis is a test.');
  console.log('Created file: documents/readme.md\n');

  // Example 2: List directory
  console.log('Example 2: List directory contents');
  const contents = await fsTool.listDirectory('documents');
  console.log('Contents of documents/:');
  contents.forEach(item => console.log(`  ${item}`));
  console.log();

  // Example 3: Read file
  console.log('Example 3: Read file');
  const content = await fsTool.readFile('documents/hello.txt');
  console.log('Content of hello.txt:');
  console.log(content);
  console.log();

  // Example 4: Check if file exists
  console.log('Example 4: Check file existence');
  const exists = await fsTool.exists('documents/hello.txt');
  console.log(`documents/hello.txt exists: ${exists}`);
  
  const notExists = await fsTool.exists('documents/nonexistent.txt');
  console.log(`documents/nonexistent.txt exists: ${notExists}`);
  console.log();

  // Example 5: Get file stats
  console.log('Example 5: Get file stats');
  const stats = await fsTool.getStats('documents/hello.txt');
  console.log('File stats:');
  console.log(`  Size: ${stats.size} bytes`);
  console.log(`  Is file: ${stats.isFile}`);
  console.log(`  Modified: ${stats.modified.toLocaleString()}`);
  console.log();

  // Example 6: Use agent to manage files
  if (process.env.OPENAI_API_KEY) {
    console.log('Example 6: Let the agent manage files');
    
    // Simulate a user request
    const testMessages = [
      { 
        role: 'user' as const, 
        content: 'Create a file called notes.txt in the documents folder with the content "Meeting notes: Discuss Q4 goals"' 
      }
    ];

    const response = await assistant.generateReply(testMessages);
    console.log('User: Create a file called notes.txt');
    console.log('Agent:', response.content);
    console.log();

    // Verify the file was created (if the agent executed the function)
    if (await fsTool.exists('documents/notes.txt')) {
      const notesContent = await fsTool.readFile('documents/notes.txt');
      console.log('Verified: notes.txt was created');
      console.log('Content:', notesContent);
    }
  } else {
    console.log('Example 6: Skipped (set OPENAI_API_KEY to run)');
  }

  // Cleanup
  console.log('\nCleaning up test directory...');
  await fsTool.deleteDirectory('.');
  console.log('Done!');
}

// Run the example
main().catch(console.error);
