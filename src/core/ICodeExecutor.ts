/**
 * Represents the result of code execution
 */
export interface ICodeExecutionResult {
  success: boolean;
  output: string;
  exitCode?: number;
  error?: string;
}

/**
 * Represents a code block to be executed
 */
export interface ICodeBlock {
  language: string;
  code: string;
}

/**
 * Interface for code executors
 * Similar to .NET AutoGen's ICodeExecutor
 */
export interface ICodeExecutor {
  /**
   * Execute code and return the result
   */
  executeCode(code: string, language?: string): Promise<ICodeExecutionResult>;

  /**
   * Execute code blocks
   */
  executeCodeBlocks(codeBlocks: ICodeBlock[]): Promise<ICodeExecutionResult[]>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[];
}
