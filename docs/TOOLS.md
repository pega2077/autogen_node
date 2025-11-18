# Tools and Extensions

This document provides comprehensive information about the tools and extensions available in autogen_node.

## Table of Contents

- [File System Tools](#file-system-tools)
- [Browser Tools](#browser-tools)
- [Docker Code Executor](#docker-code-executor)
- [API Tools](#api-tools)
- [Database Tools](#database-tools)
- [Image Generation Tools](#image-generation-tools)
- [Tool Caching](#tool-caching)

## File System Tools

The `FileSystemTool` provides safe file and directory operations with built-in security features.

### Features

- Read and write files
- Create and delete directories
- List directory contents
- Check file existence
- Get file statistics
- Path validation and security restrictions

### Usage

```typescript
import { FileSystemTool, AssistantAgent } from 'autogen_node';

// Create tool with security restrictions
const fsTool = new FileSystemTool({
  basePath: '/safe/directory',  // Restrict access to this directory
  allowedExtensions: ['.txt', '.md', '.json']  // Only allow these file types
});

// Use directly
await fsTool.writeFile('hello.txt', 'Hello, World!');
const content = await fsTool.readFile('hello.txt');
const files = await fsTool.listDirectory('.');

// Use with agent
const functions = FileSystemTool.createFunctionContracts(fsTool);
const assistant = new AssistantAgent({
  name: 'file_assistant',
  functions,
  // ... other config
});
```

### Available Functions

- `read_file(file_path)` - Read file contents
- `write_file(file_path, content)` - Write content to file
- `list_directory(dir_path?)` - List directory contents
- `create_directory(dir_path)` - Create a directory
- `delete_file(file_path)` - Delete a file
- `file_exists(file_path)` - Check if file exists

### Example

```bash
npm run example:filesystem
```

## Browser Tools

The `BrowserTool` provides web automation capabilities using Playwright.

### Features

- Navigate to URLs
- Extract text and data from web pages
- Click elements and fill forms
- Take screenshots
- Execute JavaScript in the browser
- Wait for dynamic content

### Usage

```typescript
import { BrowserTool, AssistantAgent } from 'autogen_node';

// Create browser tool
const browser = new BrowserTool({ headless: true });

// Use directly
await browser.navigate('https://example.com');
const text = await browser.getText('h1');
await browser.screenshot({ path: 'screenshot.png' });

// Use with agent
const functions = BrowserTool.createFunctionContracts(browser);
const assistant = new AssistantAgent({
  name: 'browser_assistant',
  functions,
  // ... other config
});

// Clean up
await browser.close();
```

### Available Functions

- `navigate_to_url(url)` - Navigate to a URL
- `get_page_text(selector?)` - Get text from page or element
- `click_element(selector)` - Click an element
- `fill_input(selector, value)` - Fill an input field
- `take_screenshot(path?, full_page?)` - Take a screenshot
- `extract_data(selector, attribute?)` - Extract data from elements

### Example

```bash
npm run example:browser
```

## Docker Code Executor

The `DockerCodeExecutor` executes code safely in isolated Docker containers.

### Features

- Execute JavaScript, Python, and Bash code
- Automatic resource limits (CPU, memory)
- Network isolation for security
- Timeout protection
- Auto-cleanup of containers
- Support for multiple languages

### Usage

```typescript
import { DockerCodeExecutor, AssistantAgent, UserProxyAgent } from 'autogen_node';

// Create Docker executor
const executor = new DockerCodeExecutor({
  timeout: 30000,  // 30 seconds
  defaultImage: 'node:18-alpine'
});

// Check if Docker is available
const isAvailable = await executor.isAvailable();

// Execute code
const result = await executor.executeCode(
  'console.log("Hello from Docker!");',
  'javascript'
);

console.log('Output:', result.output);
console.log('Success:', result.success);

// Use with UserProxyAgent
const userProxy = new UserProxyAgent({
  name: 'user_proxy',
  codeExecutor: executor,
  autoExecuteCode: true
});
```

### Supported Languages

- JavaScript/TypeScript
- Python
- Bash/Shell

### Example

```bash
npm run example:docker
```

**Note:** Requires Docker to be installed and running.

## API Tools

The `APITool` provides a wrapper for making REST and GraphQL API calls.

### Features

- REST API calls (GET, POST, PUT, PATCH, DELETE)
- GraphQL query support
- Authentication headers
- Custom headers
- Configurable timeout
- Base URL support

### Usage

```typescript
import { APITool, AssistantAgent } from 'autogen_node';

// Create API tool
const apiTool = new APITool({
  baseURL: 'https://api.example.com',
  timeout: 10000
});

// Set authentication
apiTool.setAuthToken('your-token', 'Bearer');

// Make requests
const data = await apiTool.get('/users');
const newUser = await apiTool.post('/users', { name: 'John' });

// GraphQL
const result = await apiTool.graphql(`
  query {
    user(id: 1) {
      name
      email
    }
  }
`);

// Use with agent
const functions = APITool.createFunctionContracts(apiTool);
const assistant = new AssistantAgent({
  name: 'api_assistant',
  functions,
  // ... other config
});
```

### Available Functions

- `api_get(url, headers?)` - Make GET request
- `api_post(url, data, headers?)` - Make POST request
- `api_graphql(query, variables?)` - Execute GraphQL query

### Example

```bash
npm run example:api
```

## Database Tools

The `DatabaseTool` provides a base class for database operations (SQL and NoSQL).

### Features

- SQL query execution
- NoSQL document operations
- Connection management
- Extensible for different database types

### Usage

```typescript
import { DatabaseTool } from 'autogen_node';

// Note: This is a base implementation
// For production, install specific database drivers:
// - PostgreSQL: npm install pg
// - MySQL: npm install mysql2  
// - MongoDB: npm install mongodb
// - SQLite: npm install better-sqlite3

// Create database tool
const dbTool = new DatabaseTool({
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'user',
  password: 'pass'
});

// SQL databases
const results = await dbTool.query('SELECT * FROM users WHERE id = $1', [1]);

// NoSQL databases  
const docs = await dbTool.findDocuments('users', { age: { $gt: 18 } });
await dbTool.insertDocument('users', { name: 'John', age: 25 });
```

### Extending for Specific Databases

The base `DatabaseTool` is a placeholder. Extend it for your specific database:

```typescript
import { Pool } from 'pg';

export class PostgreSQLTool extends DatabaseTool {
  private pool?: Pool;

  async connect(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password
    });
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const result = await this.pool!.query(sql, params);
    return result.rows;
  }
}
```

## Image Generation Tools

The `ImageGenerationTool` provides AI image generation using DALL-E.

### Features

- Generate images with DALL-E 3
- Multiple sizes and quality options
- Different styles (vivid, natural)
- Image download
- Create variations (DALL-E 2)
- Edit images with masks

### Usage

```typescript
import { ImageGenerationTool, AssistantAgent } from 'autogen_node';

// Create image generation tool
const imageTool = new ImageGenerationTool({
  openaiApiKey: process.env.OPENAI_API_KEY,
  defaultModel: 'dall-e-3',
  defaultSize: '1024x1024',
  defaultQuality: 'standard'
});

// Generate image
const imageUrls = await imageTool.generateImage(
  'A serene landscape with mountains and a lake',
  {
    size: '1024x1024',
    quality: 'hd',
    style: 'vivid'
  }
);

// Download image
await imageTool.downloadImage(imageUrls[0], 'output.png');

// Use with agent
const functions = ImageGenerationTool.createFunctionContracts(imageTool);
const assistant = new AssistantAgent({
  name: 'image_assistant',
  functions,
  // ... other config
});
```

### Available Options

- **Sizes**: `256x256`, `512x512`, `1024x1024`, `1792x1024`, `1024x1792`
- **Quality**: `standard`, `hd` (DALL-E 3 only)
- **Style**: `vivid`, `natural` (DALL-E 3 only)

### Example

```bash
npm run example:image
```

**Note:** Requires `OPENAI_API_KEY` environment variable.

## Tool Caching

The `ToolCache` provides caching for tool function results to improve performance.

### Features

- Multiple eviction strategies (LRU, LFU, FIFO, TTL)
- Configurable cache size
- TTL (Time To Live) support
- Cache statistics
- Function wrapping
- Decorator support

### Usage

```typescript
import { ToolCache, CacheStrategy } from 'autogen_node';

// Create cache
const cache = new ToolCache({
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000,  // 5 minutes
  strategy: CacheStrategy.LRU
});

// Manual caching
cache.set('function_name', [arg1, arg2], result);
const cached = cache.get('function_name', [arg1, arg2]);

// Wrap a function with caching
const cachedFn = cache.wrap(
  'expensiveOperation',
  async (arg1, arg2) => {
    // Expensive operation
    return result;
  },
  60000  // 1 minute TTL
);

// Use decorator
class MyTool {
  @Cached(60000)  // Cache for 1 minute
  async expensiveMethod(arg: string) {
    // ... expensive operation
  }
}

// Get cache stats
const stats = cache.getStats();
console.log('Cache size:', stats.size);
console.log('Hit rate:', stats.hitRate);

// Invalidate cache
cache.invalidate('function_name', [arg1, arg2]);
cache.invalidateFunction('function_name');
cache.clear();  // Clear all
```

### Cache Strategies

- **LRU** (Least Recently Used) - Evicts least recently accessed items
- **LFU** (Least Frequently Used) - Evicts least frequently accessed items
- **FIFO** (First In First Out) - Evicts oldest items
- **TTL** (Time To Live) - Evicts expired items first

### Global Cache

A global cache instance is available for convenience:

```typescript
import { globalToolCache } from 'autogen_node';

globalToolCache.set('key', [args], value);
const result = globalToolCache.get('key', [args]);
```

## Best Practices

### Security

1. **File System**: Always set `basePath` and `allowedExtensions` to restrict access
2. **Docker**: Containers automatically have network disabled and resource limits
3. **API**: Validate input and use authentication headers for sensitive APIs
4. **Browser**: Run in headless mode for production, be careful with untrusted URLs

### Performance

1. **Caching**: Use `ToolCache` for expensive operations
2. **Docker**: Reuse containers when possible, set appropriate timeouts
3. **Browser**: Close browser when done to free resources
4. **API**: Set reasonable timeouts and handle errors

### Error Handling

Always wrap tool operations in try-catch blocks:

```typescript
try {
  const result = await tool.operation();
  // Handle success
} catch (error) {
  console.error('Tool operation failed:', error.message);
  // Handle error
}
```

## Examples

All tools come with complete examples in the `src/examples/` directory:

- `filesystem-tool-example.ts` - File system operations
- `browser-tool-example.ts` - Web automation
- `docker-executor-example.ts` - Safe code execution
- `api-tool-example.ts` - REST and GraphQL APIs
- `image-generation-example.ts` - AI image generation

Run any example with:

```bash
npm run example:<name>
```

For example:
```bash
npm run example:filesystem
npm run example:browser
npm run example:docker
npm run example:api
npm run example:image
```
