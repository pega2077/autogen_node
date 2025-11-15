import { AssistantAgent, APITool } from '../index';

/**
 * Example: Using APITool for REST and GraphQL API calls
 * Demonstrates making HTTP requests with agents
 */
async function main() {
  console.log('=== API Tool Example ===\n');

  // Example 1: Create API tool for a public API
  console.log('Example 1: Fetch data from JSONPlaceholder API');
  
  const apiTool = new APITool({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 10000
  });

  // Get a list of posts
  const posts = await apiTool.get('/posts?_limit=3');
  console.log('Fetched posts:');
  console.log(JSON.stringify(posts, null, 2));
  console.log();

  // Example 2: Create a new post
  console.log('Example 2: Create a new post');
  const newPost = await apiTool.post('/posts', {
    title: 'Test Post',
    body: 'This is a test post created by APITool',
    userId: 1
  });
  console.log('Created post:');
  console.log(JSON.stringify(newPost, null, 2));
  console.log();

  // Example 3: Update a post
  console.log('Example 3: Update a post');
  const updatedPost = await apiTool.put('/posts/1', {
    id: 1,
    title: 'Updated Title',
    body: 'Updated content',
    userId: 1
  });
  console.log('Updated post:');
  console.log(JSON.stringify(updatedPost, null, 2));
  console.log();

  // Example 4: Use with agent for intelligent API interaction
  if (process.env.OPENAI_API_KEY) {
    console.log('Example 4: Intelligent API interaction with agent');

    // Create function contracts
    const functions = APITool.createFunctionContracts(apiTool);

    // Create assistant with API capabilities
    const assistant = new AssistantAgent({
      name: 'api_assistant',
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      systemMessage: `You are a helpful API assistant. You can make HTTP requests to fetch and manipulate data.
The base URL is set to JSONPlaceholder API (https://jsonplaceholder.typicode.com).
Use the provided API functions to help users interact with the API.`,
      model: 'gpt-3.5-turbo',
      functions
    });

    console.log('Assistant created with API tools:');
    console.log('- api_get');
    console.log('- api_post');
    console.log('- api_graphql\n');

    const testMessages = [
      {
        role: 'user' as const,
        content: 'Fetch the first 2 todos from the /todos endpoint'
      }
    ];

    const response = await assistant.generateReply(testMessages);
    console.log('User: Fetch the first 2 todos from the /todos endpoint');
    console.log('Agent:', response.content);
    console.log();
  } else {
    console.log('Example 4: Skipped (set OPENAI_API_KEY to run)');
  }

  // Example 5: GraphQL API (hypothetical)
  console.log('Example 5: GraphQL query example (requires GraphQL endpoint)');
  
  // For demonstration - this would work with a real GraphQL endpoint
  const graphqlTool = new APITool({
    baseURL: 'https://api.example.com/graphql'
  });

  console.log('GraphQL tool created (would require a real endpoint to test)');
  console.log('Example query:');
  console.log(`
  query {
    user(id: 1) {
      name
      email
      posts {
        title
      }
    }
  }
  `);
  console.log();

  // Example 6: API with authentication
  console.log('Example 6: API with authentication');
  
  const authApiTool = new APITool({
    baseURL: 'https://api.example.com'
  });

  // Set auth token
  authApiTool.setAuthToken('your-api-token-here', 'Bearer');
  console.log('Auth token set for API requests');
  
  // Set custom header
  authApiTool.setHeader('X-Custom-Header', 'custom-value');
  console.log('Custom header set');
  console.log();

  console.log('Done!');
}

// Run the example
main().catch(console.error);
