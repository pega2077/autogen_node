import { AssistantAgent } from '../agents/AssistantAgent';
import { BrowserTool } from '../tools/BrowserTool';
import { APITool } from '../tools/APITool';
import { FileSystemTool } from '../tools/FileSystemTool';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Example: Search for popular AI projects on GitHub
 * 
 * This example demonstrates:
 * 1. Using AssistantAgent with web browsing and API capabilities
 * 2. Searching GitHub for trending AI projects
 * 3. Extracting project information from web pages
 * 4. Autonomously saving results to files
 * 
 * The agent has access to:
 * - BrowserTool: Navigate websites, extract content, take screenshots
 * - APITool: Make HTTP requests to GitHub API
 * - FileSystemTool: Save research findings to files
 */
async function main() {
  console.log('='.repeat(60));
  console.log('GitHub AI Projects Search - AssistantAgent Example');
  console.log('='.repeat(60));
  console.log('This example demonstrates an agent searching for popular');
  console.log('AI projects on GitHub using web browsing and API tools.\n');

  console.log('Prerequisites:');
  console.log('1. Install Ollama from https://ollama.ai/');
  console.log('2. Run: ollama pull llama2 (or your preferred model)');
  console.log('3. Ensure Ollama server is running');
  console.log('4. Run this example\n');

  const ollamaURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const model = process.env.OLLAMA_MODEL || 'llama2';

  // Set up temp directory for results
  const tempDir = path.join(__dirname, 'temp');

  console.log(`Configuration:`);
  console.log(`  Ollama URL: ${ollamaURL}`);
  console.log(`  Model: ${model}`);
  console.log(`  Output Directory: ${tempDir}\n`);

  try {
    // Create tools
    console.log('Setting up tools...');
    
    // Browser tool for web scraping
    const browserTool = new BrowserTool({ headless: true });
    const browserFunctions = BrowserTool.createFunctionContracts(browserTool);
    
    // API tool for GitHub API requests
    const apiTool = new APITool({
      baseURL: 'https://api.github.com',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AutoGen-NodeJS-Example'
      }
    });
    const apiFunctions = APITool.createFunctionContracts(apiTool);
    
    // File system tool for saving results
    const fileSystemTool = new FileSystemTool({
      basePath: tempDir,
      allowedExtensions: ['.txt', '.md', '.json']
    });
    const fileFunctions = FileSystemTool.createFunctionContracts(fileSystemTool);
    
    // Combine all functions
    const allFunctions = [...browserFunctions, ...apiFunctions, ...fileFunctions];
    
    console.log('✓ Tools configured:');
    console.log('  - BrowserTool: navigate, get_page_text, extract_data, take_screenshot');
    console.log('  - APITool: get, post requests to GitHub API');
    console.log('  - FileSystemTool: write_file, read_file, list_directory\n');

    // Create an assistant agent with all tools
    const researchAgent = new AssistantAgent({
      name: 'github_researcher',
      provider: 'ollama',
      model: model,
      baseURL: ollamaURL,
      systemMessage: `You are a GitHub research assistant specialized in finding and analyzing popular AI projects.

Your capabilities:
1. Web Browsing: Use navigate_to_url and get_page_text to browse GitHub trending pages and project pages
2. API Access: Use get_request to query GitHub API for repository information
3. File Operations: Save your findings to markdown or JSON files for later reference

Your task approach:
- Search for trending AI repositories on GitHub
- Extract key information: project name, description, stars, language, recent activity
- Look for projects related to machine learning, deep learning, LLMs, and AI tools
- Focus on projects with high star counts and recent updates
- Save comprehensive findings to a file with descriptive filename like 'github-ai-projects.md'

When you find interesting projects, include:
- Repository name and URL
- Description
- Star count and programming language
- What makes it notable (recent growth, innovative approach, etc.)

Be thorough and save your complete research to a file.`,
      temperature: 0.7,
      maxTokens: 2000,
      functions: allFunctions
    });

    console.log('='.repeat(60));
    console.log('RESEARCH TASK');
    console.log('='.repeat(60));
    console.log('Task: Find new popular AI projects on GitHub\n');

    // Define the research task
    const taskMessage = `Please search for and identify new popular AI projects on GitHub. 

Focus on:
- Trending AI repositories
- Projects related to machine learning, LLMs, deep learning
- Recently popular projects (high stars, recent activity)
- Include at least 5-10 notable projects

For each project provide:
- Name and GitHub URL
- Brief description
- Star count and primary language
- Why it's interesting/notable

Save your complete findings to a markdown file with an appropriate name.`;

    console.log('Starting research...\n');
    console.log('Agent is browsing GitHub and collecting information...\n');

    // Execute the research task
    const messages = [
      { role: 'user' as const, content: taskMessage }
    ];

    const response = await researchAgent.generateReply(messages);

    console.log('='.repeat(60));
    console.log('RESEARCH RESULTS');
    console.log('='.repeat(60));
    console.log(response.content);
    console.log('\n');

    // If the agent needs more iterations to complete the task
    // (e.g., if it made function calls but hasn't finished)
    let conversationHistory = [...messages, response];
    let iterationCount = 1;
    const maxIterations = 5;

    while (iterationCount < maxIterations) {
      // Check if there are function calls that need to be executed
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(`Iteration ${iterationCount + 1}: Agent is using tools to gather more information...\n`);
        
        const continueResponse = await researchAgent.generateReply(conversationHistory);
        conversationHistory.push(continueResponse);
        
        console.log(continueResponse.content);
        console.log('\n');
        
        // If no more tool calls, break
        if (!continueResponse.toolCalls || continueResponse.toolCalls.length === 0) {
          break;
        }
        
        iterationCount++;
      } else {
        break;
      }
    }

    console.log('='.repeat(60));
    console.log('RESEARCH COMPLETED');
    console.log('='.repeat(60));
    console.log('📁 Check the temp directory for saved research files');
    console.log(`   Location: ${tempDir}\n`);

    // Clean up browser
    await browserTool.close();
    console.log('✓ Browser closed');

    console.log('\n');
    console.log('Summary:');
    console.log('- Agent autonomously searched GitHub for AI projects');
    console.log('- Used web browsing and API tools to gather information');
    console.log('- Saved findings to file(s) based on its own decision');
    console.log('\nThis demonstrates autonomous agent behavior with multiple tools!');

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
