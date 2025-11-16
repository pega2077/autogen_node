import { IFunction } from "../core/IFunctionCall";
import OpenAI from 'openai';
import { FunctionContract } from '../core/FunctionContract';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Image size options for DALL-E
 */
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';

/**
 * Image quality options
 */
export type ImageQuality = 'standard' | 'hd';

/**
 * Image style options
 */
export type ImageStyle = 'vivid' | 'natural';

/**
 * Image Generation Tool using DALL-E and potentially other services
 */
export class ImageGenerationTool {
  private openai?: OpenAI;
  private defaultModel: string;
  private defaultSize: ImageSize;
  private defaultQuality: ImageQuality;

  constructor(options?: {
    openaiApiKey?: string;
    defaultModel?: string;
    defaultSize?: ImageSize;
    defaultQuality?: ImageQuality;
  }) {
    if (options?.openaiApiKey) {
      this.openai = new OpenAI({ apiKey: options.openaiApiKey });
    }
    this.defaultModel = options?.defaultModel || 'dall-e-3';
    this.defaultSize = options?.defaultSize || '1024x1024';
    this.defaultQuality = options?.defaultQuality || 'standard';
  }

  /**
   * Generate image using DALL-E
   */
  async generateImage(
    prompt: string,
    options?: {
      model?: string;
      size?: ImageSize;
      quality?: ImageQuality;
      style?: ImageStyle;
      n?: number;
    }
  ): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not provided. Initialize with openaiApiKey option.');
    }

    try {
      const model = options?.model || this.defaultModel;
      const size = options?.size || this.defaultSize;
      const quality = options?.quality || this.defaultQuality;
      const style = options?.style || 'vivid';
      const n = options?.n || 1;

      // DALL-E 3 only supports n=1
      if (model === 'dall-e-3' && n > 1) {
        throw new Error('DALL-E 3 only supports generating 1 image at a time');
      }

      const response = await this.openai.images.generate({
        model,
        prompt,
        n,
        size,
        quality: model === 'dall-e-3' ? quality : undefined,
        style: model === 'dall-e-3' ? style : undefined
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No images generated');
      }

      return response.data.map(img => img.url!);
    } catch (error: any) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  /**
   * Generate image variations (DALL-E 2 only)
   */
  async createVariation(
    imageFilePath: string,
    options?: {
      n?: number;
      size?: '256x256' | '512x512' | '1024x1024'; // DALL-E 2 only supports these sizes
    }
  ): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not provided. Initialize with openaiApiKey option.');
    }

    try {
      const fs = await import('fs');
      const imageFile = fs.createReadStream(imageFilePath);
      
      const response = await this.openai.images.createVariation({
        image: imageFile as any,
        n: options?.n || 1,
        size: options?.size || '1024x1024'
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No images generated');
      }

      return response.data.map(img => img.url!);
    } catch (error: any) {
      throw new Error(`Image variation failed: ${error.message}`);
    }
  }

  /**
   * Edit image with DALL-E
   */
  async editImage(
    imageFilePath: string,
    prompt: string,
    maskFilePath?: string,
    options?: {
      n?: number;
      size?: '256x256' | '512x512' | '1024x1024'; // DALL-E 2 only supports these sizes
    }
  ): Promise<string[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not provided. Initialize with openaiApiKey option.');
    }

    try {
      const fs = await import('fs');
      const imageFile = fs.createReadStream(imageFilePath);
      const maskFile = maskFilePath ? fs.createReadStream(maskFilePath) : undefined;
      
      const response = await this.openai.images.edit({
        image: imageFile as any,
        mask: maskFile as any,
        prompt,
        n: options?.n || 1,
        size: options?.size || '1024x1024'
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('No images generated');
      }

      return response.data.map(img => img.url!);
    } catch (error: any) {
      throw new Error(`Image edit failed: ${error.message}`);
    }
  }

  /**
   * Download image from URL to file
   */
  async downloadImage(url: string, outputPath: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, buffer);

      return outputPath;
    } catch (error: any) {
      throw new Error(`Image download failed: ${error.message}`);
    }
  }

  /**
   * Create function contracts for use with agents
   */
  static createFunctionContracts(tool: ImageGenerationTool): IFunction[] {
    return [
      FunctionContract.fromFunction(
        'generate_image',
        'Generate an image using DALL-E based on a text prompt',
        [
          {
            name: 'prompt',
            type: 'string',
            description: 'Description of the image to generate',
            required: true
          },
          {
            name: 'size',
            type: 'string',
            description: 'Image size: 256x256, 512x512, 1024x1024, 1792x1024, or 1024x1792 (default: 1024x1024)',
            required: false
          },
          {
            name: 'quality',
            type: 'string',
            description: 'Image quality: standard or hd (default: standard, DALL-E 3 only)',
            required: false
          },
          {
            name: 'style',
            type: 'string',
            description: 'Image style: vivid or natural (default: vivid, DALL-E 3 only)',
            required: false
          }
        ],
        async (prompt: string, size?: string, quality?: string, style?: string) => {
          const urls = await tool.generateImage(prompt, {
            size: size as ImageSize,
            quality: quality as ImageQuality,
            style: style as ImageStyle
          });
          return `Generated image URL: ${urls[0]}`;
        }
      ),
      FunctionContract.fromFunction(
        'download_image',
        'Download an image from a URL to a file',
        [
          {
            name: 'url',
            type: 'string',
            description: 'URL of the image to download',
            required: true
          },
          {
            name: 'output_path',
            type: 'string',
            description: 'Path where the image should be saved',
            required: true
          }
        ],
        async (url: string, output_path: string) => {
          const path = await tool.downloadImage(url, output_path);
          return `Image downloaded to: ${path}`;
        }
      )
    ];
  }
}

/**
 * Stable Diffusion Tool (placeholder for future implementation)
 * This would require integration with Stable Diffusion API or local installation
 */
export class StableDiffusionTool {
  private apiUrl?: string;
  private apiKey?: string;

  constructor(options?: {
    apiUrl?: string;
    apiKey?: string;
  }) {
    this.apiUrl = options?.apiUrl;
    this.apiKey = options?.apiKey;
  }

  /**
   * Generate image using Stable Diffusion
   */
  async generateImage(
    prompt: string,
    options?: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      steps?: number;
      seed?: number;
    }
  ): Promise<string> {
    throw new Error(
      'Stable Diffusion integration not yet implemented. ' +
      'Consider using DALL-E via ImageGenerationTool or integrate with ' +
      'Stable Diffusion API (e.g., Stability AI, Replicate, or local installation).'
    );
  }
}
