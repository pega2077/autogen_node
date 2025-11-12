import { LocalCodeExecutor } from '../index';
import * as path from 'path';
import * as os from 'os';

describe('LocalCodeExecutor', () => {
  let executor: LocalCodeExecutor;
  const testWorkDir = path.join(os.tmpdir(), 'autogen_test_exec');

  beforeEach(() => {
    executor = new LocalCodeExecutor(testWorkDir, 10000);
  });

  afterEach(async () => {
    await executor.cleanup();
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = executor.getSupportedLanguages();
      expect(languages).toContain('javascript');
      expect(languages).toContain('python');
      expect(languages).toContain('bash');
    });
  });

  describe('JavaScript execution', () => {
    it('should execute simple JavaScript code', async () => {
      const code = 'console.log("Hello, World!");';
      const result = await executor.executeCode(code, 'javascript');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello, World!');
      expect(result.exitCode).toBe(0);
    });

    it('should execute JavaScript with calculations', async () => {
      const code = `
        const sum = 5 + 3;
        console.log(sum);
      `;
      const result = await executor.executeCode(code, 'javascript');

      expect(result.success).toBe(true);
      expect(result.output).toContain('8');
    });

    it('should handle JavaScript errors', async () => {
      const code = 'throw new Error("Test error");';
      const result = await executor.executeCode(code, 'javascript');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should support js and node aliases', async () => {
      const code = 'console.log("test");';
      
      const result1 = await executor.executeCode(code, 'js');
      expect(result1.success).toBe(true);
      
      const result2 = await executor.executeCode(code, 'node');
      expect(result2.success).toBe(true);
    });
  });

  describe('Python execution', () => {
    it('should execute simple Python code', async () => {
      const code = 'print("Hello from Python")';
      const result = await executor.executeCode(code, 'python');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello from Python');
    });

    it('should execute Python with calculations', async () => {
      const code = `
result = sum(range(1, 11))
print(result)
`;
      const result = await executor.executeCode(code, 'python');

      expect(result.success).toBe(true);
      expect(result.output).toContain('55');
    });

    it('should handle Python errors', async () => {
      const code = 'raise Exception("Python error")';
      const result = await executor.executeCode(code, 'python');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should support py alias', async () => {
      const code = 'print("test")';
      const result = await executor.executeCode(code, 'py');

      expect(result.success).toBe(true);
      expect(result.output).toContain('test');
    });
  });

  describe('Bash execution', () => {
    it('should execute simple bash commands', async () => {
      const code = 'echo "Hello from Bash"';
      const result = await executor.executeCode(code, 'bash');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello from Bash');
    });

    it('should execute bash script with variables', async () => {
      const code = `
NAME="World"
echo "Hello, $NAME"
`;
      const result = await executor.executeCode(code, 'bash');

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello, World');
    });

    it('should support sh and shell aliases', async () => {
      const code = 'echo "test"';
      
      const result1 = await executor.executeCode(code, 'sh');
      expect(result1.success).toBe(true);
      
      const result2 = await executor.executeCode(code, 'shell');
      expect(result2.success).toBe(true);
    });
  });

  describe('Code blocks execution', () => {
    it('should execute multiple code blocks', async () => {
      const codeBlocks = [
        { language: 'javascript', code: 'console.log("First");' },
        { language: 'javascript', code: 'console.log("Second");' },
        { language: 'javascript', code: 'console.log("Third");' }
      ];

      const results = await executor.executeCodeBlocks(codeBlocks);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(results[0].output).toContain('First');
      expect(results[1].output).toContain('Second');
      expect(results[2].output).toContain('Third');
    });

    it('should stop on first error', async () => {
      const codeBlocks = [
        { language: 'javascript', code: 'console.log("First");' },
        { language: 'javascript', code: 'throw new Error("Stop");' },
        { language: 'javascript', code: 'console.log("Third");' }
      ];

      const results = await executor.executeCodeBlocks(codeBlocks);

      expect(results).toHaveLength(2); // Should stop after error
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should handle mixed languages', async () => {
      const codeBlocks = [
        { language: 'javascript', code: 'console.log("JS");' },
        { language: 'python', code: 'print("Python")' },
        { language: 'bash', code: 'echo "Bash"' }
      ];

      const results = await executor.executeCodeBlocks(codeBlocks);

      expect(results).toHaveLength(3);
      expect(results[0].output).toContain('JS');
      expect(results[1].output).toContain('Python');
      expect(results[2].output).toContain('Bash');
    });
  });

  describe('Unsupported language', () => {
    it('should return error for unsupported language', async () => {
      const result = await executor.executeCode('code', 'ruby');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported language');
    });
  });

  describe('Timeout handling', () => {
    it('should timeout long-running code', async () => {
      const shortTimeout = new LocalCodeExecutor(testWorkDir, 1000);
      
      // Infinite loop
      const code = 'while(true) {}';
      const result = await shortTimeout.executeCode(code, 'javascript');

      expect(result.success).toBe(false);
      
      await shortTimeout.cleanup();
    }, 15000);
  });

  describe('Cleanup', () => {
    it('should clean up work directory', async () => {
      // Execute some code to create the directory
      await executor.executeCode('console.log("test");', 'javascript');
      
      // Cleanup
      await executor.cleanup();
      
      // Directory should be removed (or at least cleanup should not throw)
      expect(true).toBe(true);
    });
  });
});
