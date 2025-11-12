/**
 * Example demonstrating function calling with AssistantAgent
 * This shows how to register and use custom functions with the agent
 */
import { AssistantAgent, FunctionContract, HumanInputMode, UserProxyAgent } from '../index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  // Define weather function
  const getWeather = FunctionContract.fromFunction(
    'get_weather',
    'Get the current weather for a location',
    [
      {
        name: 'location',
        type: 'string',
        description: 'The city and state, e.g. San Francisco, CA',
        required: true
      },
      {
        name: 'unit',
        type: 'string',
        description: 'The temperature unit (celsius or fahrenheit)',
        required: false
      }
    ],
    async (location: string, unit: string = 'fahrenheit') => {
      // Simulated weather data
      const weather = {
        location,
        temperature: unit === 'celsius' ? 22 : 72,
        unit,
        condition: 'sunny',
        humidity: 65
      };
      return JSON.stringify(weather);
    }
  );

  // Define calculator function
  const calculator = FunctionContract.fromFunction(
    'calculator',
    'Perform basic arithmetic operations',
    [
      {
        name: 'operation',
        type: 'string',
        description: 'The operation to perform (add, subtract, multiply, divide)',
        required: true
      },
      {
        name: 'a',
        type: 'number',
        description: 'First number',
        required: true
      },
      {
        name: 'b',
        type: 'number',
        description: 'Second number',
        required: true
      }
    ],
    async (operation: string, a: number, b: number) => {
      let result: number;
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          result = a / b;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      return `The result of ${operation}(${a}, ${b}) is ${result}`;
    }
  );

  // Create assistant with functions
  const assistant = new AssistantAgent({
    name: 'assistant',
    apiKey: process.env.OPENAI_API_KEY!,
    systemMessage: 'You are a helpful assistant with access to weather and calculator functions. Use them when needed.',
    model: 'gpt-3.5-turbo',
    temperature: 0,
    functions: [getWeather, calculator]
  });

  // Create user proxy
  const user = new UserProxyAgent({
    name: 'user',
    humanInputMode: HumanInputMode.NEVER
  });

  console.log('===== Function Calling Example =====\n');
  console.log('Demonstrating weather function call...\n');

  // Test weather function
  await user.initiateChat(
    assistant,
    "What's the weather like in San Francisco?",
    3
  );

  console.log('\n---\n');
  console.log('Demonstrating calculator function call...\n');

  // Clear history
  assistant.clearHistory();
  user.clearHistory();

  // Test calculator function
  await user.initiateChat(
    assistant,
    'Calculate 123 multiplied by 456',
    3
  );

  console.log('\n---\n');
  console.log('Demonstrating multiple function calls...\n');

  // Clear history
  assistant.clearHistory();
  user.clearHistory();

  // Test multiple functions in one conversation
  await user.initiateChat(
    assistant,
    'First, tell me the weather in New York. Then, calculate the sum of 50 and 75.',
    5
  );

  user.close();
}

main().catch(console.error);
