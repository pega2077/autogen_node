# GitHub Codespace Setup and Running Guide

This guide explains how to create a GitHub Codespace and run the autogen_node project.

## Method 1: Create a Codespace via GitHub Web Interface

### Step 1: Create Codespace

1. Go to the repository: https://github.com/ojama/autogen_node
2. Click the green **"Code"** button
3. Click the **"Codespaces"** tab
4. Click **"Create codespace on copilot/develop-nodejs-version-autogen"**

GitHub will automatically:
- Create a cloud development environment
- Install VS Code in the browser
- Clone the repository
- Set up the development container

### Step 2: Setup the Project

Once the Codespace is ready, open the integrated terminal and run:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests to verify everything works
npm test
```

### Step 3: Run Examples

You can run any of the three examples:

```bash
# Interactive chat example (requires user input)
npm run example:basic

# Automated conversation example (no user input needed)
npm run example:auto

# Group chat example (3 AI agents collaborating)
npm run example:group
```

**Note**: To run examples, you need to set up your OpenAI API key:

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

## Method 2: Create Codespace via GitHub CLI

If you have GitHub CLI installed locally:

```bash
# Create a new codespace
gh codespace create --repo ojama/autogen_node --branch copilot/develop-nodejs-version-autogen

# Connect to the codespace
gh codespace code

# Or use SSH
gh codespace ssh
```

## Method 3: Create Codespace via VS Code

1. Install the **GitHub Codespaces** extension in VS Code
2. Press `Cmd/Ctrl + Shift + P`
3. Type "Codespaces: Create New Codespace"
4. Select the `ojama/autogen_node` repository
5. Select the `copilot/develop-nodejs-version-autogen` branch

## Quick Start (After Codespace is Created)

```bash
# 1. Install dependencies
npm install

# 2. Build the TypeScript code
npm run build

# 3. Run tests (34 tests should pass)
npm test

# 4. Try the automated example (no API key needed for testing)
# This will show an error but demonstrates the code structure
npm run example:auto

# 5. To run with real OpenAI API:
# - Create .env file: cp .env.example .env
# - Add your API key to .env
# - Run: npm run example:auto
```

## Available NPM Scripts

```bash
npm run build          # Compile TypeScript to JavaScript
npm run test           # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
npm run clean          # Remove build artifacts

npm run example:basic  # Interactive chat (requires user input)
npm run example:auto   # Automated AI conversation
npm run example:group  # Multi-agent group chat

npm run dev           # Development mode with auto-reload
```

## Project Structure

```
autogen_node/
├── src/
│   ├── core/              # Core framework
│   │   ├── IAgent.ts      # Agent interfaces
│   │   ├── BaseAgent.ts   # Base agent class
│   │   └── GroupChat.ts   # Group chat system
│   ├── agents/            # Agent implementations
│   │   ├── AssistantAgent.ts   # OpenAI-powered agent
│   │   └── UserProxyAgent.ts   # Human proxy agent
│   ├── examples/          # Example applications
│   └── __tests__/         # Unit tests
├── dist/                  # Compiled JavaScript (after build)
└── node_modules/          # Dependencies (after npm install)
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (reruns on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

Expected output:
```
Test Suites: 2 passed, 2 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        ~3s
```

## Example Usage

### Automated Conversation (No API Key Required for Demo)

```typescript
import { AssistantAgent } from './src/index';

const assistant = new AssistantAgent({
  name: 'assistant',
  apiKey: 'your-api-key',
  systemMessage: 'You are a helpful assistant.',
  model: 'gpt-3.5-turbo'
});

// The code structure is ready, just needs valid API key
```

## Troubleshooting

### Issue: "Cannot find module"
```bash
# Solution: Install dependencies
npm install
```

### Issue: "jest: not found"
```bash
# Solution: Make sure dependencies are installed
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Please set OPENAI_API_KEY environment variable"
```bash
# Solution: Create .env file with your API key
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-your-key-here
```

### Issue: TypeScript compilation errors
```bash
# Solution: Clean and rebuild
npm run clean
npm run build
```

## Codespace Configuration

The project includes standard Node.js/TypeScript setup. No special devcontainer configuration is required, but you can create one for automatic setup:

### Optional: Create `.devcontainer/devcontainer.json`

```json
{
  "name": "AutoGen Node.js",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:18",
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode"
      ]
    }
  }
}
```

This will automatically run `npm install` when the Codespace is created.

## Next Steps

After setting up your Codespace:

1. **Read the documentation**:
   - `README.md` - Project overview
   - `GETTING_STARTED.md` - Detailed tutorial
   - `API.md` - API reference
   - `IMPLEMENTATION_SUMMARY.md` - Technical details

2. **Try the examples**:
   - Start with `example:auto` (automated, no input needed)
   - Then try `example:group` (multi-agent collaboration)
   - Finally `example:basic` (interactive)

3. **Build your own agent**:
   - See examples for patterns
   - Check API documentation for available methods
   - Start with a simple two-agent conversation

## Support

For issues or questions:
- Check the documentation files
- Review the example code
- Run the tests to ensure everything is working
- Refer to the API documentation for detailed method descriptions

---

**Ready to Code!** 🚀

Your Codespace is now set up and ready for developing multi-agent AI systems with AutoGen Node.js!
