import { IFunction } from "../core/IFunctionCall";
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { FunctionContract } from '../core/FunctionContract';

/**
 * Browser Tool for web automation using Playwright
 * Provides web scraping, screenshot, and interaction capabilities
 */
export class BrowserTool {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private headless: boolean;

  constructor(options?: {
    headless?: boolean;
  }) {
    this.headless = options?.headless !== false; // Default to headless
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.headless });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<string> {
    await this.initialize();
    try {
      await this.page!.goto(url, { waitUntil: 'networkidle' });
      const title = await this.page!.title();
      return `Navigated to ${url}, page title: ${title}`;
    } catch (error: any) {
      throw new Error(`Failed to navigate to ${url}: ${error.message}`);
    }
  }

  /**
   * Get page content (HTML)
   */
  async getContent(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      return await this.page.content();
    } catch (error: any) {
      throw new Error(`Failed to get page content: ${error.message}`);
    }
  }

  /**
   * Get page text content
   */
  async getText(selector?: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      if (selector) {
        const element = await this.page.$(selector);
        if (!element) {
          throw new Error(`Element with selector ${selector} not found`);
        }
        return await element.innerText();
      } else {
        return await this.page.innerText('body');
      }
    } catch (error: any) {
      throw new Error(`Failed to get text: ${error.message}`);
    }
  }

  /**
   * Click element
   */
  async click(selector: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      await this.page.click(selector);
      return `Clicked element: ${selector}`;
    } catch (error: any) {
      throw new Error(`Failed to click ${selector}: ${error.message}`);
    }
  }

  /**
   * Fill input field
   */
  async fill(selector: string, value: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      await this.page.fill(selector, value);
      return `Filled ${selector} with: ${value}`;
    } catch (error: any) {
      throw new Error(`Failed to fill ${selector}: ${error.message}`);
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(options?: {
    path?: string;
    fullPage?: boolean;
  }): Promise<Buffer> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      const screenshot = await this.page.screenshot({
        path: options?.path,
        fullPage: options?.fullPage || false
      });
      return screenshot;
    } catch (error: any) {
      throw new Error(`Failed to take screenshot: ${error.message}`);
    }
  }

  /**
   * Execute JavaScript on the page
   */
  async evaluate(script: string): Promise<any> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      return await this.page.evaluate(script);
    } catch (error: any) {
      throw new Error(`Failed to execute script: ${error.message}`);
    }
  }

  /**
   * Wait for selector
   */
  async waitForSelector(selector: string, timeout: number = 30000): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      await this.page.waitForSelector(selector, { timeout });
      return `Element ${selector} found`;
    } catch (error: any) {
      throw new Error(`Failed to wait for ${selector}: ${error.message}`);
    }
  }

  /**
   * Extract data using CSS selector
   */
  async extract(selector: string, attribute?: string): Promise<string[]> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call navigate() first.');
    }
    try {
      const elements = await this.page.$$(selector);
      const results: string[] = [];
      
      for (const element of elements) {
        if (attribute) {
          const value = await element.getAttribute(attribute);
          if (value) results.push(value);
        } else {
          const text = await element.innerText();
          if (text) results.push(text);
        }
      }
      
      return results;
    } catch (error: any) {
      throw new Error(`Failed to extract data: ${error.message}`);
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = undefined;
    }
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  /**
   * Create function contracts for use with agents
   */
  static createFunctionContracts(tool: BrowserTool): IFunction[] {
    return [
      FunctionContract.fromFunction(
        'navigate_to_url',
        'Navigate to a URL in the browser',
        [
          {
            name: 'url',
            type: 'string',
            description: 'URL to navigate to',
            required: true
          }
        ],
        async (url: string) => {
          return await tool.navigate(url);
        }
      ),
      FunctionContract.fromFunction(
        'get_page_text',
        'Get text content from the current page or a specific element',
        [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for element (optional, defaults to entire page)',
            required: false
          }
        ],
        async (selector?: string) => {
          const text = await tool.getText(selector);
          return text.substring(0, 2000); // Limit response size
        }
      ),
      FunctionContract.fromFunction(
        'click_element',
        'Click an element on the page',
        [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for element to click',
            required: true
          }
        ],
        async (selector: string) => {
          return await tool.click(selector);
        }
      ),
      FunctionContract.fromFunction(
        'fill_input',
        'Fill an input field with text',
        [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for input element',
            required: true
          },
          {
            name: 'value',
            type: 'string',
            description: 'Text to fill in the input',
            required: true
          }
        ],
        async (selector: string, value: string) => {
          return await tool.fill(selector, value);
        }
      ),
      FunctionContract.fromFunction(
        'take_screenshot',
        'Take a screenshot of the current page',
        [
          {
            name: 'path',
            type: 'string',
            description: 'Path to save screenshot (optional)',
            required: false
          },
          {
            name: 'full_page',
            type: 'boolean',
            description: 'Whether to capture full page (optional, default: false)',
            required: false
          }
        ],
        async (path?: string, full_page?: boolean) => {
          await tool.screenshot({ path, fullPage: full_page });
          return path ? `Screenshot saved to ${path}` : 'Screenshot taken';
        }
      ),
      FunctionContract.fromFunction(
        'extract_data',
        'Extract data from elements using CSS selector',
        [
          {
            name: 'selector',
            type: 'string',
            description: 'CSS selector for elements to extract',
            required: true
          },
          {
            name: 'attribute',
            type: 'string',
            description: 'Attribute to extract (optional, defaults to text content)',
            required: false
          }
        ],
        async (selector: string, attribute?: string) => {
          const results = await tool.extract(selector, attribute);
          return `Extracted ${results.length} items:\n${results.join('\n')}`;
        }
      )
    ];
  }
}
