import { ICodeExecutor, ICodeExecutionResult, ICodeBlock } from '../core/ICodeExecutor';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

/**
 * Local code executor for running code in a sandboxed environment
 * Similar to .NET AutoGen's LocalCodeExecutor
 */
export class LocalCodeExecutor implements ICodeExecutor {
  private workDir: string;
  private timeout: number;

  constructor(workDir?: string, timeout: number = 60000) {
    this.workDir = workDir || path.join(os.tmpdir(), 'autogen_code_exec');
    this.timeout = timeout;
  }

  /**
   * Initialize the work directory
   */
  private async ensureWorkDir(): Promise<void> {
    try {
      await fs.access(this.workDir);
    } catch {
      await fs.mkdir(this.workDir, { recursive: true });
    }
  }

  /**
   * Execute code in the specified language
   */
  async executeCode(code: string, language: string = 'javascript'): Promise<ICodeExecutionResult> {
    await this.ensureWorkDir();

    const normalizedLang = language.toLowerCase();

    switch (normalizedLang) {
      case 'javascript':
      case 'js':
      case 'node':
        return this.executeJavaScript(code);
      
      case 'python':
      case 'py':
        return this.executePython(code);
      
      case 'bash':
      case 'sh':
      case 'shell':
        return this.executeBash(code);
      
      default:
        return {
          success: false,
          output: '',
          error: `Unsupported language: ${language}`
        };
    }
  }

  /**
   * Execute multiple code blocks
   */
  async executeCodeBlocks(codeBlocks: ICodeBlock[]): Promise<ICodeExecutionResult[]> {
    const results: ICodeExecutionResult[] = [];
    
    for (const block of codeBlocks) {
      const result = await this.executeCode(block.code, block.language);
      results.push(result);
      
      // Stop if execution failed
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ['javascript', 'js', 'node', 'python', 'py', 'bash', 'sh', 'shell'];
  }

  /**
   * Execute JavaScript code using Node.js
   */
  private async executeJavaScript(code: string): Promise<ICodeExecutionResult> {
    const fileName = `script_${Date.now()}.js`;
    const filePath = path.join(this.workDir, fileName);

    try {
      await fs.writeFile(filePath, code);
      
      const { stdout, stderr } = await execAsync(
        `node ${filePath}`,
        { timeout: this.timeout, cwd: this.workDir }
      );

      return {
        success: true,
        output: stdout + (stderr || ''),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code
      };
    } finally {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute Python code
   */
  private async executePython(code: string): Promise<ICodeExecutionResult> {
    const fileName = `script_${Date.now()}.py`;
    const filePath = path.join(this.workDir, fileName);

    try {
      await fs.writeFile(filePath, code);
      
      const { stdout, stderr } = await execAsync(
        `python3 ${fileName}`,
        { timeout: this.timeout, cwd: this.workDir }
      );

      return {
        success: true,
        output: stdout + (stderr || ''),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code
      };
    } finally {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Execute Bash script
   */
  private async executeBash(code: string): Promise<ICodeExecutionResult> {
    const fileName = `script_${Date.now()}.sh`;
    const filePath = path.join(this.workDir, fileName);

    try {
      await fs.writeFile(filePath, code);
      await fs.chmod(filePath, '755');
      
      const { stdout, stderr } = await execAsync(
        `bash ${fileName}`,
        { timeout: this.timeout, cwd: this.workDir }
      );

      return {
        success: true,
        output: stdout + (stderr || ''),
        exitCode: 0
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || '',
        error: error.stderr || error.message,
        exitCode: error.code
      };
    } finally {
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Clean up the work directory
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }
}
