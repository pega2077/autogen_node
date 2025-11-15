import { AssistantAgent, BrowserTool } from '../index';

/**
 * Example: Using BrowserTool for web automation
 * Demonstrates web scraping, navigation, and interaction
 */
async function main() {
  console.log('=== Browser Tool Example ===\n');

  // Create Browser Tool
  const browser = new BrowserTool({ headless: true });

  console.log('Example 1: Navigate and scrape a webpage');
  
  // Navigate to a website
  const navResult = await browser.navigate('https://example.com');
  console.log(navResult);

  // Get page text
  const pageText = await browser.getText();
  console.log('\nPage text preview:');
  console.log(pageText.substring(0, 200) + '...\n');

  // Extract specific elements
  console.log('Example 2: Extract specific elements');
  const headings = await browser.extract('h1');
  console.log('H1 headings:');
  headings.forEach(h => console.log(`  - ${h}`));
  console.log();

  // Example 3: Use with agent for intelligent browsing
  if (process.env.OPENAI_API_KEY) {
    console.log('Example 3: Intelligent web browsing with agent');

    // Create function contracts
    const functions = BrowserTool.createFunctionContracts(browser);

    // Create assistant with browser capabilities
    const assistant = new AssistantAgent({
      name: 'browser_assistant',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      systemMessage: `You are a helpful web browsing assistant. You can navigate websites, extract information, and interact with web pages.
Use the provided browser functions to help users with web tasks.`,
      model: 'gpt-3.5-turbo',
      functions
    });

    console.log('Assistant created with browser tools:');
    console.log('- navigate_to_url');
    console.log('- get_page_text');
    console.log('- click_element');
    console.log('- fill_input');
    console.log('- take_screenshot');
    console.log('- extract_data\n');

    const testMessages = [
      {
        role: 'user' as const,
        content: 'What is the main heading on example.com?'
      }
    ];

    const response = await assistant.generateReply(testMessages);
    console.log('User: What is the main heading on example.com?');
    console.log('Agent:', response.content);
  } else {
    console.log('Example 3: Skipped (set OPENAI_API_KEY to run)');
  }

  // Example 4: Take screenshot
  console.log('\nExample 4: Take screenshot');
  const screenshotPath = '/tmp/example-screenshot.png';
  await browser.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  // Close browser
  await browser.close();
  console.log('\nBrowser closed. Done!');
}

// Run the example
main().catch(console.error);
