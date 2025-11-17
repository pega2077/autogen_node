import { IFunction } from "../core/IFunctionCall";
import * as fs from 'fs/promises';
import * as path from 'path';
import { FunctionContract } from '../core/FunctionContract';

/**
 * File System Tool provides file read/write and directory operations
 * Can be used with agents for file manipulation tasks
 */
export class FileSystemTool {
  private basePath: string;
  private allowedExtensions?: string[];

  constructor(options?: {
    basePath?: string;
    allowedExtensions?: string[];
  }) {
    this.basePath = options?.basePath || process.cwd();
    this.allowedExtensions = options?.allowedExtensions;
  }

  /**
   * Validate file path is within base path and has allowed extension
   */
  private validatePath(
    filePath: string,
    options: { allowDirectory?: boolean } = {}
  ): string {
    const normalizedBase = path.resolve(this.basePath);

    // Treat absolute paths outside the base as relative hints from the model
    let candidatePath = filePath;
    if (path.isAbsolute(candidatePath)) {
      const resolvedCandidate = path.resolve(candidatePath);
      if (
        resolvedCandidate !== normalizedBase &&
        !resolvedCandidate.startsWith(`${normalizedBase}${path.sep}`)
      ) {
        // Strip leading separators so "/folder" becomes "folder"
        const relativeHint = candidatePath.replace(/^[/\\]+/, '');
        candidatePath = path.join(this.basePath, relativeHint);
      }
    }

    const absolutePath = path.isAbsolute(candidatePath)
      ? candidatePath
      : path.join(this.basePath, candidatePath);

    const normalizedPath = path.resolve(absolutePath);

    // Check if path is within base path
    if (
      normalizedPath !== normalizedBase &&
      !normalizedPath.startsWith(`${normalizedBase}${path.sep}`)
    ) {
      throw new Error(`Access denied: Path ${filePath} is outside base path`);
    }

    // Check extension if restrictions exist
    const isDirectoryOperation = options.allowDirectory === true;
    if (this.allowedExtensions && !isDirectoryOperation) {
      const ext = path.extname(normalizedPath).toLowerCase();
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`Access denied: File extension ${ext} is not allowed`);
      }
    }

    return normalizedPath;
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.validatePath(filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write content to file
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.validatePath(filePath);
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Append content to file
   */
  async appendFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.validatePath(filePath);
    try {
      await fs.appendFile(fullPath, content, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.validatePath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string = '.'): Promise<string[]> {
    const fullPath = this.validatePath(dirPath, { allowDirectory: true });
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map(entry => {
        const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
        return `${type} ${entry.name}`;
      });
    } catch (error: any) {
      throw new Error(`Failed to list directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string): Promise<void> {
    const fullPath = this.validatePath(dirPath, { allowDirectory: true });
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Delete directory
   */
  async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = this.validatePath(dirPath, { allowDirectory: true });
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (error: any) {
      throw new Error(`Failed to delete directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Check if file/directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.validatePath(filePath, { allowDirectory: true });
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<{
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    created: Date;
    modified: Date;
  }> {
    const fullPath = this.validatePath(filePath, { allowDirectory: true });
    try {
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error: any) {
      throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Rename or move a file
   */
  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = this.validatePath(oldPath);
    const fullNewPath = this.validatePath(newPath);
    try {
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(fullNewPath), { recursive: true });
      await fs.rename(fullOldPath, fullNewPath);
    } catch (error: any) {
      throw new Error(`Failed to rename file from ${oldPath} to ${newPath}: ${error.message}`);
    }
  }

  /**
   * Create function contracts for use with agents
   */
  static createFunctionContracts(tool: FileSystemTool): IFunction[] {
    return [
      FunctionContract.fromFunction(
        'read_file',
        'Read contents of a file',
        [
          {
            name: 'file_path',
            type: 'string',
            description: 'Path to the file to read',
            required: true
          }
        ],
        async (file_path: string) => {
          const content = await tool.readFile(file_path);
          return `File contents:\n${content}`;
        }
      ),
      FunctionContract.fromFunction(
        'write_file',
        'Write content to a file',
        [
          {
            name: 'file_path',
            type: 'string',
            description: 'Path to the file to write',
            required: true
          },
          {
            name: 'content',
            type: 'string',
            description: 'Content to write to the file',
            required: true
          }
        ],
        async (file_path: string, content: string) => {
          await tool.writeFile(file_path, content);
          return `Successfully wrote to ${file_path}`;
        }
      ),
      FunctionContract.fromFunction(
        'list_directory',
        'List contents of a directory',
        [
          {
            name: 'dir_path',
            type: 'string',
            description: 'Path to the directory to list (default: current directory)',
            required: false
          }
        ],
        async (dir_path: string = '.') => {
          const entries = await tool.listDirectory(dir_path);
          return `Directory contents:\n${entries.join('\n')}`;
        }
      ),
      FunctionContract.fromFunction(
        'create_directory',
        'Create a new directory',
        [
          {
            name: 'dir_path',
            type: 'string',
            description: 'Path to the directory to create',
            required: true
          }
        ],
        async (dir_path: string) => {
          await tool.createDirectory(dir_path);
          return `Successfully created directory ${dir_path}`;
        }
      ),
      FunctionContract.fromFunction(
        'delete_file',
        'Delete a file',
        [
          {
            name: 'file_path',
            type: 'string',
            description: 'Path to the file to delete',
            required: true
          }
        ],
        async (file_path: string) => {
          await tool.deleteFile(file_path);
          return `Successfully deleted ${file_path}`;
        }
      ),
      FunctionContract.fromFunction(
        'file_exists',
        'Check if a file or directory exists',
        [
          {
            name: 'file_path',
            type: 'string',
            description: 'Path to check',
            required: true
          }
        ],
        async (file_path: string) => {
          const exists = await tool.exists(file_path);
          return exists ? `${file_path} exists` : `${file_path} does not exist`;
        }
      ),
      FunctionContract.fromFunction(
        'rename_file',
        'Rename or move a file to a new location',
        [
          {
            name: 'old_path',
            type: 'string',
            description: 'Current path of the file',
            required: true
          },
          {
            name: 'new_path',
            type: 'string',
            description: 'New path for the file (can include new directory)',
            required: true
          }
        ],
        async (old_path: string, new_path: string) => {
          await tool.renameFile(old_path, new_path);
          return `Successfully renamed ${old_path} to ${new_path}`;
        }
      )
    ];
  }
}
