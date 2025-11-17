import Docker from 'dockerode';
import { ICodeExecutor, ICodeExecutionResult, ICodeBlock } from '../core/ICodeExecutor';

/**
 * Docker Code Executor - Execute code safely in Docker containers
 * Provides isolation and security for code execution
 */
type DockerClient = InstanceType<typeof Docker>;

interface BasicImageInfo {
  RepoTags?: (string | null | undefined)[];
}

export class DockerCodeExecutor implements ICodeExecutor {
  private docker: DockerClient;
  private defaultImage: string;
  private timeout: number;
  private containerOptions: any;

  constructor(options?: {
    dockerHost?: string;
    defaultImage?: string;
    timeout?: number;
    containerOptions?: any;
  }) {
    this.docker = new Docker(options?.dockerHost ? { host: options.dockerHost } : {});
    this.defaultImage = options?.defaultImage || 'node:18-alpine';
    this.timeout = options?.timeout || 30000; // 30 seconds default
    this.containerOptions = options?.containerOptions || {};
  }

  /**
   * Get Docker image for language
   */
  private getImageForLanguage(language: string): string {
    const imageMap: { [key: string]: string } = {
      'javascript': 'node:18-alpine',
      'typescript': 'node:18-alpine',
      'python': 'python:3.11-alpine',
      'bash': 'alpine:latest',
      'shell': 'alpine:latest'
    };
    return imageMap[language.toLowerCase()] || this.defaultImage;
  }

  /**
   * Get command for language
   */
  private getCommandForLanguage(language: string, code: string): string[] {
    const lang = language.toLowerCase();
    
    switch (lang) {
      case 'javascript':
      case 'typescript':
        return ['node', '-e', code];
      case 'python':
        return ['python', '-c', code];
      case 'bash':
      case 'shell':
        return ['/bin/sh', '-c', code];
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Pull Docker image if not present
   */
  private async ensureImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
    } catch (error) {
      // Image not found, pull it
      console.log(`Pulling Docker image: ${image}`);
      await new Promise((resolve, reject) => {
        this.docker.pull(image, (err: any, stream: any) => {
          if (err) {
            reject(err);
            return;
          }
          this.docker.modem.followProgress(stream, (err: any) => {
            if (err) reject(err);
            else resolve(undefined);
          });
        });
      });
    }
  }

  /**
   * Execute code in Docker container
   */
  async executeCode(code: string, language: string = 'javascript'): Promise<ICodeExecutionResult> {
    const codeBlock: ICodeBlock = { code, language };
    return this.executeCodeBlock(codeBlock);
  }

  /**
   * Execute code block in Docker container
   */
  private async executeCodeBlock(codeBlock: ICodeBlock): Promise<ICodeExecutionResult> {
    const image = this.getImageForLanguage(codeBlock.language);
    const cmd = this.getCommandForLanguage(codeBlock.language, codeBlock.code);

    try {
      // Ensure image is available
      await this.ensureImage(image);

      // Create container
      const container = await this.docker.createContainer({
        Image: image,
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false,
        NetworkDisabled: true, // Security: disable network access
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB memory limit
          CpuQuota: 50000, // 50% CPU limit
          AutoRemove: true, // Auto-remove container after execution
          ...this.containerOptions.HostConfig
        },
        ...this.containerOptions
      });

      // Start container
      await container.start();

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          container.stop().catch(() => {});
          reject(new Error(`Execution timeout after ${this.timeout}ms`));
        }, this.timeout);
      });

      // Wait for container to finish
      const resultPromise = container.wait();

      // Race between timeout and completion
      const result = await Promise.race([resultPromise, timeoutPromise]) as any;

      // Get logs
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        follow: false
      });

      const output = logs.toString('utf-8');
      const exitCode = result.StatusCode;

      return {
        success: exitCode === 0,
        exitCode,
        output,
        error: exitCode !== 0 ? output : undefined
      };
    } catch (error: any) {
      return {
        success: false,
        exitCode: 1,
        output: '',
        error: `Docker execution failed: ${error.message}`
      };
    }
  }

  /**
   * Execute multiple code blocks
   */
  async executeCodeBlocks(codeBlocks: ICodeBlock[]): Promise<ICodeExecutionResult[]> {
    const results: ICodeExecutionResult[] = [];
    for (const block of codeBlocks) {
      results.push(await this.executeCodeBlock(block));
    }
    return results;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ['javascript', 'typescript', 'python', 'bash', 'shell'];
  }

  /**
   * Cleanup - Docker containers are auto-removed
   */
  async cleanup(): Promise<void> {
    // Docker containers are set to auto-remove, so nothing to do here
  }

  /**
   * Check if Docker is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List available images
   */
  async listImages(): Promise<string[]> {
    try {
      const images = await this.docker.listImages() as BasicImageInfo[];
      const tags = images.flatMap((img) => img.RepoTags || []);
      return tags.filter((tag): tag is string => typeof tag === 'string' && tag !== '<none>:<none>');
    } catch (error: any) {
      throw new Error(`Failed to list images: ${error.message}`);
    }
  }

  /**
   * Remove image
   */
  async removeImage(imageName: string): Promise<void> {
    try {
      const image = this.docker.getImage(imageName);
      await image.remove();
    } catch (error: any) {
      throw new Error(`Failed to remove image ${imageName}: ${error.message}`);
    }
  }
}
