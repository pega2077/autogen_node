import { ConversableAgent, ConversableAgentConfig } from './ConversableAgent';
import { IMessage } from '../core/IAgent';

/**
 * Multimodal content types
 */
export type MultimodalContentType = 'text' | 'image_url' | 'image_file' | 'audio' | 'video';

/**
 * Multimodal message content part
 */
export interface MultimodalContentPart {
  type: MultimodalContentType;
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
  image_file?: {
    file_id: string;
  };
  audio_url?: {
    url: string;
  };
  video_url?: {
    url: string;
  };
}

/**
 * Extended message interface for multimodal content
 */
export interface MultimodalMessage extends IMessage {
  content: string | MultimodalContentPart[];
}

/**
 * Configuration for MultimodalConversableAgent
 */
export interface MultimodalConversableAgentConfig extends ConversableAgentConfig {
  supportedModalities?: MultimodalContentType[];
  imageDetailLevel?: 'low' | 'high' | 'auto';
  maxImageSize?: number;
}

/**
 * A conversable agent that supports multimodal inputs (text, images, audio, video)
 * Similar to Microsoft AutoGen's MultimodalConversableAgent
 * 
 * This agent provides:
 * - Support for images, audio, and video inputs
 * - Vision capabilities (image understanding)
 * - Audio processing
 * - Flexible content handling
 * - Compatible with multimodal LLMs (GPT-4 Vision, Gemini Pro Vision, etc.)
 */
export class MultimodalConversableAgent extends ConversableAgent {
  private supportedModalities: MultimodalContentType[];
  private imageDetailLevel: 'low' | 'high' | 'auto';
  private maxImageSize: number;

  constructor(config: MultimodalConversableAgentConfig) {
    super(config);
    
    this.supportedModalities = config.supportedModalities || ['text', 'image_url', 'image_file'];
    this.imageDetailLevel = config.imageDetailLevel || 'auto';
    this.maxImageSize = config.maxImageSize || 20 * 1024 * 1024; // 20MB default
  }

  /**
   * Check if a modality is supported
   */
  isModalitySupported(modality: MultimodalContentType): boolean {
    return this.supportedModalities.includes(modality);
  }

  /**
   * Add support for a new modality
   */
  addModalitySupport(modality: MultimodalContentType): void {
    if (!this.supportedModalities.includes(modality)) {
      this.supportedModalities.push(modality);
    }
  }

  /**
   * Remove support for a modality
   */
  removeModalitySupport(modality: MultimodalContentType): void {
    this.supportedModalities = this.supportedModalities.filter(m => m !== modality);
  }

  /**
   * Create a text content part
   */
  static createTextContent(text: string): MultimodalContentPart {
    return {
      type: 'text',
      text
    };
  }

  /**
   * Create an image URL content part
   */
  static createImageUrlContent(url: string, detail: 'low' | 'high' | 'auto' = 'auto'): MultimodalContentPart {
    return {
      type: 'image_url',
      image_url: {
        url,
        detail
      }
    };
  }

  /**
   * Create an image file content part
   */
  static createImageFileContent(fileId: string): MultimodalContentPart {
    return {
      type: 'image_file',
      image_file: {
        file_id: fileId
      }
    };
  }

  /**
   * Create an audio URL content part
   */
  static createAudioContent(url: string): MultimodalContentPart {
    return {
      type: 'audio',
      audio_url: {
        url
      }
    };
  }

  /**
   * Create a video URL content part
   */
  static createVideoContent(url: string): MultimodalContentPart {
    return {
      type: 'video',
      video_url: {
        url
      }
    };
  }

  /**
   * Create a multimodal message
   */
  createMultimodalMessage(
    content: string | MultimodalContentPart[],
    role: 'user' | 'assistant' | 'system' = 'user'
  ): MultimodalMessage {
    return {
      role,
      content,
      name: this.name
    };
  }

  /**
   * Validate multimodal content
   */
  private validateMultimodalContent(content: MultimodalContentPart[]): void {
    for (const part of content) {
      if (!this.isModalitySupported(part.type)) {
        throw new Error(`Modality ${part.type} is not supported by this agent`);
      }

      // Validate image URLs
      if (part.type === 'image_url' && part.image_url) {
        const url = part.image_url.url;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
          throw new Error('Image URL must be a valid HTTP(S) URL or data URL');
        }
      }
    }
  }

  /**
   * Convert multimodal message to standard format for LLM
   */
  private convertMultimodalMessage(message: MultimodalMessage): IMessage {
    // If content is already a string, return as-is
    if (typeof message.content === 'string') {
      return message as IMessage;
    }

    // Validate multimodal content
    this.validateMultimodalContent(message.content);

    // For most providers, we keep the multimodal format
    // The LLM provider will handle the conversion
    return {
      ...message,
      content: message.content as unknown as string
    };
  }

  /**
   * Generate a reply with multimodal support
   */
  async generateReply(
    messages: IMessage[],
    cancellationToken?: AbortSignal
  ): Promise<IMessage> {
    // Convert multimodal messages if needed
    const convertedMessages = messages.map(msg => {
      if ('content' in msg && Array.isArray((msg as any).content)) {
        return this.convertMultimodalMessage(msg as MultimodalMessage);
      }
      return msg;
    });

    // Call parent's generateReply with converted messages
    return super.generateReply(convertedMessages, cancellationToken);
  }

  /**
   * Process an image and generate a description
   */
  async describeImage(
    imageUrl: string,
    prompt: string = 'What is in this image?',
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const multimodalMessage = this.createMultimodalMessage([
      MultimodalConversableAgent.createTextContent(prompt),
      MultimodalConversableAgent.createImageUrlContent(imageUrl, this.imageDetailLevel)
    ], 'user');

    const reply = await this.generateReply([multimodalMessage], cancellationToken);
    return reply.content;
  }

  /**
   * Encode image file to base64 data URL
   */
  async encodeImageToDataUrl(filePath: string, mimeType: string = 'image/jpeg'): Promise<string> {
    try {
      const fs = require('fs').promises;
      const imageBuffer = await fs.readFile(filePath);
      
      // Check file size
      if (imageBuffer.length > this.maxImageSize) {
        throw new Error(`Image size ${imageBuffer.length} exceeds maximum allowed size ${this.maxImageSize}`);
      }

      const base64Image = imageBuffer.toString('base64');
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      throw new Error(`Failed to encode image: ${error}`);
    }
  }

  /**
   * Process an image file and generate a description
   */
  async describeImageFile(
    filePath: string,
    prompt: string = 'What is in this image?',
    mimeType: string = 'image/jpeg',
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const dataUrl = await this.encodeImageToDataUrl(filePath, mimeType);
    return this.describeImage(dataUrl, prompt, cancellationToken);
  }

  /**
   * Analyze multiple images together
   */
  async analyzeImages(
    imageUrls: string[],
    prompt: string = 'Analyze these images together and describe what you see.',
    cancellationToken?: AbortSignal
  ): Promise<string> {
    const contentParts: MultimodalContentPart[] = [
      MultimodalConversableAgent.createTextContent(prompt),
      ...imageUrls.map(url => 
        MultimodalConversableAgent.createImageUrlContent(url, this.imageDetailLevel)
      )
    ];

    const multimodalMessage = this.createMultimodalMessage(contentParts, 'user');
    const reply = await this.generateReply([multimodalMessage], cancellationToken);
    return reply.content;
  }

  /**
   * Compare two images
   */
  async compareImages(
    imageUrl1: string,
    imageUrl2: string,
    prompt: string = 'Compare these two images and describe the differences.',
    cancellationToken?: AbortSignal
  ): Promise<string> {
    return this.analyzeImages([imageUrl1, imageUrl2], prompt, cancellationToken);
  }

  /**
   * Set the image detail level for vision requests
   */
  setImageDetailLevel(level: 'low' | 'high' | 'auto'): void {
    this.imageDetailLevel = level;
  }

  /**
   * Get the current image detail level
   */
  getImageDetailLevel(): 'low' | 'high' | 'auto' {
    return this.imageDetailLevel;
  }

  /**
   * Get supported modalities
   */
  getSupportedModalities(): MultimodalContentType[] {
    return [...this.supportedModalities];
  }
}
