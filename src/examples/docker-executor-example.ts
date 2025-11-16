import { AssistantAgent, DockerCodeExecutor, HumanInputMode } from '../index';

/**
 * Example: Using DockerCodeExecutor for safe code execution
 * Demonstrates executing code in isolated Docker containers
 */
async function main() {
  console.log('=== Docker Code Executor Example ===\n');

  // Check if Docker is available
  const executor = new DockerCodeExecutor({
    timeout: 30000 // 30 seconds
  });

  console.log('Checking Docker availability...');
  const isAvailable = await executor.isAvailable();
  
  if (!isAvailable) {
    console.log('Docker is not available. Please ensure Docker is installed and running.');
    console.log('Install Docker: https://docs.docker.com/get-docker/');
    return;
  }

  console.log('Docker is available!\n');

  // Example 1: Execute JavaScript code
  console.log('Example 1: Execute JavaScript code');
  const jsResult = await executor.executeCode(
    'console.log("Hello from Docker!"); console.log("2 + 2 =", 2 + 2);',
    'javascript'
  );
  console.log('Exit code:', jsResult.exitCode);
  console.log('Output:', jsResult.output);
  console.log('Success:', jsResult.success);
  console.log();

  // Example 2: Execute Python code
  console.log('Example 2: Execute Python code');
  const pyResult = await executor.executeCode(
    'print("Hello from Python in Docker!")\nfor i in range(5):\n    print(f"Count: {i}")',
    'python'
  );
  console.log('Exit code:', pyResult.exitCode);
  console.log('Output:', pyResult.output);
  console.log('Success:', pyResult.success);
  console.log();

  // Example 3: Execute Bash script
  console.log('Example 3: Execute Bash script');
  const bashResult = await executor.executeCode(
    'echo "System info:" && uname -a && echo "Date:" && date',
    'bash'
  );
  console.log('Exit code:', bashResult.exitCode);
  console.log('Output:', bashResult.output);
  console.log('Success:', bashResult.success);
  console.log();

  // Example 4: Execute multiple code blocks
  console.log('Example 4: Execute multiple code blocks');
  const results = await executor.executeCodeBlocks([
    { language: 'javascript', code: 'console.log("JS:", Math.PI);' },
    { language: 'python', code: 'import math; print("Python:", math.pi)' },
    { language: 'bash', code: 'echo "Bash: Hello"' }
  ]);

  results.forEach((result, i) => {
    console.log(`Block ${i + 1}:`, result.success ? 'Success' : 'Failed');
    console.log('Output:', result.output.trim());
  });
  console.log();

  // Example 5: Handle errors
  console.log('Example 5: Handle code errors');
  const errorResult = await executor.executeCode(
    'console.log(undefinedVariable);', // This will cause an error
    'javascript'
  );
  console.log('Success:', errorResult.success);
  console.log('Error:', errorResult.error?.substring(0, 100));
  console.log();

  // Example 6: Use with agent for code generation and execution
  if (process.env.OPENAI_API_KEY) {
    console.log('Example 6: Agent generates and executes code in Docker');

    const assistant = new AssistantAgent({
      name: 'code_assistant',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      systemMessage: 'You are a coding assistant. Write code in markdown code blocks.',
      model: 'gpt-3.5-turbo'
    });

    const testMessages = [
      {
        role: 'user' as const,
        content: 'Write a Python script that calculates the factorial of 5'
      }
    ];

    const response = await assistant.generateReply(testMessages);
    console.log('User: Write a Python script that calculates the factorial of 5');
    console.log('Agent response:', response.content.substring(0, 200) + '...');
    console.log();

    // Extract code from response (simple extraction)
    const codeMatch = response.content.match(/```python\n([\s\S]*?)```/);
    if (codeMatch) {
      const code = codeMatch[1];
      console.log('Extracted code:');
      console.log(code);
      console.log('\nExecuting in Docker...');
      
      const execResult = await executor.executeCode(code, 'python');
      console.log('Output:', execResult.output);
      console.log('Success:', execResult.success);
    }
  } else {
    console.log('Example 6: Skipped (set OPENAI_API_KEY to run)');
  }

  // Example 7: List available Docker images
  console.log('\nExample 7: List available Docker images');
  const images = await executor.listImages();
  console.log('Available images:');
  images.slice(0, 5).forEach(img => console.log(`  - ${img}`));
  if (images.length > 5) {
    console.log(`  ... and ${images.length - 5} more`);
  }

  console.log('\nDone! Containers are automatically cleaned up.');
}

// Run the example
main().catch(console.error);
