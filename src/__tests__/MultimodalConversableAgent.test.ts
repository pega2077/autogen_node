import { MultimodalConversableAgent, MultimodalContentPart } from '../agents/MultimodalConversableAgent';
import { IMessage } from '../core/IAgent';

describe('MultimodalConversableAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default modality support', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        systemMessage: 'You are a multimodal assistant'
      });

      expect(agent.getName()).toBe('multimodal');
      expect(agent.isModalitySupported('text')).toBe(true);
      expect(agent.isModalitySupported('image_url')).toBe(true);
    });

    it('should create an agent with custom modality support', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        supportedModalities: ['text', 'image_url', 'audio']
      });

      expect(agent.isModalitySupported('text')).toBe(true);
      expect(agent.isModalitySupported('image_url')).toBe(true);
      expect(agent.isModalitySupported('audio')).toBe(true);
      expect(agent.isModalitySupported('video')).toBe(false);
    });
  });

  describe('modality management', () => {
    it('should add modality support', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        supportedModalities: ['text']
      });

      expect(agent.isModalitySupported('video')).toBe(false);
      
      agent.addModalitySupport('video');
      expect(agent.isModalitySupported('video')).toBe(true);
    });

    it('should remove modality support', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        supportedModalities: ['text', 'image_url', 'audio']
      });

      expect(agent.isModalitySupported('audio')).toBe(true);
      
      agent.removeModalitySupport('audio');
      expect(agent.isModalitySupported('audio')).toBe(false);
    });

    it('should get all supported modalities', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        supportedModalities: ['text', 'image_url']
      });

      const modalities = agent.getSupportedModalities();
      expect(modalities).toContain('text');
      expect(modalities).toContain('image_url');
      expect(modalities).toHaveLength(2);
    });
  });

  describe('content creation helpers', () => {
    it('should create text content part', () => {
      const content = MultimodalConversableAgent.createTextContent('Hello world');
      
      expect(content.type).toBe('text');
      expect(content.text).toBe('Hello world');
    });

    it('should create image URL content part', () => {
      const content = MultimodalConversableAgent.createImageUrlContent(
        'https://example.com/image.jpg',
        'high'
      );
      
      expect(content.type).toBe('image_url');
      expect(content.image_url?.url).toBe('https://example.com/image.jpg');
      expect(content.image_url?.detail).toBe('high');
    });

    it('should create image file content part', () => {
      const content = MultimodalConversableAgent.createImageFileContent('file-123');
      
      expect(content.type).toBe('image_file');
      expect(content.image_file?.file_id).toBe('file-123');
    });

    it('should create audio content part', () => {
      const content = MultimodalConversableAgent.createAudioContent('https://example.com/audio.mp3');
      
      expect(content.type).toBe('audio');
      expect(content.audio_url?.url).toBe('https://example.com/audio.mp3');
    });

    it('should create video content part', () => {
      const content = MultimodalConversableAgent.createVideoContent('https://example.com/video.mp4');
      
      expect(content.type).toBe('video');
      expect(content.video_url?.url).toBe('https://example.com/video.mp4');
    });
  });

  describe('createMultimodalMessage', () => {
    it('should create multimodal message with string content', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal'
      });

      const message = agent.createMultimodalMessage('Hello', 'user');
      
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(message.name).toBe('multimodal');
    });

    it('should create multimodal message with content parts', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal'
      });

      const contentParts: MultimodalContentPart[] = [
        MultimodalConversableAgent.createTextContent('Describe this image'),
        MultimodalConversableAgent.createImageUrlContent('https://example.com/image.jpg')
      ];

      const message = agent.createMultimodalMessage(contentParts, 'user');
      
      expect(message.role).toBe('user');
      expect(Array.isArray(message.content)).toBe(true);
      expect((message.content as MultimodalContentPart[]).length).toBe(2);
    });
  });

  describe('image detail level', () => {
    it('should set and get image detail level', () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        imageDetailLevel: 'low'
      });

      expect(agent.getImageDetailLevel()).toBe('low');
      
      agent.setImageDetailLevel('high');
      expect(agent.getImageDetailLevel()).toBe('high');
      
      agent.setImageDetailLevel('auto');
      expect(agent.getImageDetailLevel()).toBe('auto');
    });
  });

  describe('validation', () => {
    it('should validate supported modalities in content', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        supportedModalities: ['text', 'image_url'],
        defaultAutoReply: 'OK'
      });

      const unsupportedContent: MultimodalContentPart[] = [
        MultimodalConversableAgent.createTextContent('Hello'),
        MultimodalConversableAgent.createVideoContent('https://example.com/video.mp4')
      ];

      const message = agent.createMultimodalMessage(unsupportedContent, 'user');

      // generateReply should throw an error for unsupported modality
      await expect(agent.generateReply([message])).rejects.toThrow('video');
    });

    it('should validate image URL format', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        defaultAutoReply: 'OK'
      });

      const invalidContent: MultimodalContentPart[] = [
        {
          type: 'image_url',
          image_url: {
            url: 'invalid-url'
          }
        }
      ];

      const message = agent.createMultimodalMessage(invalidContent, 'user');

      await expect(agent.generateReply([message])).rejects.toThrow();
    });

    it('should accept valid HTTP/HTTPS URLs', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        defaultAutoReply: 'OK'
      });

      const validContent: MultimodalContentPart[] = [
        MultimodalConversableAgent.createImageUrlContent('https://example.com/image.jpg')
      ];

      const message = agent.createMultimodalMessage(validContent, 'user');

      // Should not throw
      const reply = await agent.generateReply([message]);
      expect(reply).toBeDefined();
    });

    it('should accept data URLs', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        defaultAutoReply: 'OK'
      });

      const validContent: MultimodalContentPart[] = [
        MultimodalConversableAgent.createImageUrlContent('data:image/png;base64,iVBORw0KG...')
      ];

      const message = agent.createMultimodalMessage(validContent, 'user');

      // Should not throw
      const reply = await agent.generateReply([message]);
      expect(reply).toBeDefined();
    });
  });

  describe('generateReply with multimodal content', () => {
    it('should handle text-only messages', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        defaultAutoReply: 'Text reply'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'Hello' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Text reply');
    });

    it('should handle multimodal messages', async () => {
      const agent = new MultimodalConversableAgent({
        name: 'multimodal',
        defaultAutoReply: 'Multimodal reply'
      });

      const contentParts: MultimodalContentPart[] = [
        MultimodalConversableAgent.createTextContent('What is this?'),
        MultimodalConversableAgent.createImageUrlContent('https://example.com/image.jpg')
      ];

      const multimodalMessage = agent.createMultimodalMessage(contentParts, 'user');

      const reply = await agent.generateReply([multimodalMessage]);
      expect(reply.content).toBe('Multimodal reply');
    });
  });
});
