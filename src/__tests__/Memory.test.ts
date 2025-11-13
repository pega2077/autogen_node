import { ListMemory, MemoryContent, MemoryMimeType, IMemory } from '../core/memory';
import { IMessage } from '../core/IAgent';

describe('Memory', () => {
  describe('ListMemory', () => {
    describe('constructor', () => {
      it('should create a memory instance with default name', () => {
        const memory = new ListMemory();
        expect(memory.name).toBe('default_list_memory');
        expect(memory.content).toEqual([]);
      });

      it('should create a memory instance with custom name', () => {
        const memory = new ListMemory({ name: 'custom_memory' });
        expect(memory.name).toBe('custom_memory');
      });

      it('should create a memory instance with initial contents', () => {
        const initialContents: MemoryContent[] = [
          { content: 'test content', mimeType: MemoryMimeType.TEXT }
        ];
        const memory = new ListMemory({ memoryContents: initialContents });
        expect(memory.content).toEqual(initialContents);
      });
    });

    describe('add', () => {
      it('should add memory content', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'User prefers formal language',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content);
        expect(memory.content).toHaveLength(1);
        expect(memory.content[0]).toEqual(content);
      });

      it('should add multiple memory contents', async () => {
        const memory = new ListMemory();
        const content1: MemoryContent = {
          content: 'User prefers formal language',
          mimeType: MemoryMimeType.TEXT
        };
        const content2: MemoryContent = {
          content: 'User likes technical details',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content1);
        await memory.add(content2);
        expect(memory.content).toHaveLength(2);
        expect(memory.content[0]).toEqual(content1);
        expect(memory.content[1]).toEqual(content2);
      });

      it('should support different content types', async () => {
        const memory = new ListMemory();
        
        const textContent: MemoryContent = {
          content: 'text content',
          mimeType: MemoryMimeType.TEXT
        };
        const jsonContent: MemoryContent = {
          content: { key: 'value' },
          mimeType: MemoryMimeType.JSON
        };

        await memory.add(textContent);
        await memory.add(jsonContent);
        
        expect(memory.content).toHaveLength(2);
        expect(memory.content[0].content).toBe('text content');
        expect(memory.content[1].content).toEqual({ key: 'value' });
      });

      it('should support metadata', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'test content',
          mimeType: MemoryMimeType.TEXT,
          metadata: { timestamp: Date.now(), source: 'test' }
        };

        await memory.add(content);
        expect(memory.content[0].metadata).toBeDefined();
        expect(memory.content[0].metadata?.source).toBe('test');
      });
    });

    describe('query', () => {
      it('should return all memory contents', async () => {
        const memory = new ListMemory();
        const content1: MemoryContent = {
          content: 'content 1',
          mimeType: MemoryMimeType.TEXT
        };
        const content2: MemoryContent = {
          content: 'content 2',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content1);
        await memory.add(content2);

        const result = await memory.query();
        expect(result.results).toHaveLength(2);
        expect(result.results[0]).toEqual(content1);
        expect(result.results[1]).toEqual(content2);
      });

      it('should return empty array when no memories exist', async () => {
        const memory = new ListMemory();
        const result = await memory.query();
        expect(result.results).toEqual([]);
      });

      it('should ignore query parameter in ListMemory', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'test content',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content);
        const result = await memory.query('any query string');
        expect(result.results).toHaveLength(1);
      });
    });

    describe('updateContext', () => {
      it('should add memory to messages as system message', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'User prefers formal language',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content);

        const messages: IMessage[] = [
          { role: 'user', content: 'Hello' }
        ];

        const result = await memory.updateContext(messages);

        expect(result.memories.results).toHaveLength(1);
        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('User prefers formal language');
        expect(messages[0].content).toContain('Relevant memory content');
      });

      it('should append to existing system message', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'Memory item',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content);

        const messages: IMessage[] = [
          { role: 'system', content: 'Original system message' },
          { role: 'user', content: 'Hello' }
        ];

        await memory.updateContext(messages);

        expect(messages).toHaveLength(2);
        expect(messages[0].role).toBe('system');
        expect(messages[0].content).toContain('Original system message');
        expect(messages[0].content).toContain('Memory item');
      });

      it('should handle multiple memories in chronological order', async () => {
        const memory = new ListMemory();
        const content1: MemoryContent = {
          content: 'First memory',
          mimeType: MemoryMimeType.TEXT
        };
        const content2: MemoryContent = {
          content: 'Second memory',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content1);
        await memory.add(content2);

        const messages: IMessage[] = [
          { role: 'user', content: 'Hello' }
        ];

        await memory.updateContext(messages);

        expect(messages[0].content).toContain('1. First memory');
        expect(messages[0].content).toContain('2. Second memory');
      });

      it('should return empty result when no memories exist', async () => {
        const memory = new ListMemory();
        const messages: IMessage[] = [
          { role: 'user', content: 'Hello' }
        ];

        const result = await memory.updateContext(messages);

        expect(result.memories.results).toEqual([]);
        expect(messages).toHaveLength(1);
      });
    });

    describe('clear', () => {
      it('should clear all memory contents', async () => {
        const memory = new ListMemory();
        const content: MemoryContent = {
          content: 'test content',
          mimeType: MemoryMimeType.TEXT
        };

        await memory.add(content);
        expect(memory.content).toHaveLength(1);

        await memory.clear();
        expect(memory.content).toHaveLength(0);
      });
    });

    describe('close', () => {
      it('should cleanup resources', async () => {
        const memory = new ListMemory();
        await expect(memory.close()).resolves.not.toThrow();
      });
    });

    describe('content property', () => {
      it('should allow direct modification of contents', () => {
        const memory = new ListMemory();
        const newContents: MemoryContent[] = [
          { content: 'new content 1', mimeType: MemoryMimeType.TEXT },
          { content: 'new content 2', mimeType: MemoryMimeType.TEXT }
        ];

        memory.content = newContents;
        expect(memory.content).toEqual(newContents);
      });
    });
  });

  describe('MemoryMimeType', () => {
    it('should have correct MIME types', () => {
      expect(MemoryMimeType.TEXT).toBe('text/plain');
      expect(MemoryMimeType.JSON).toBe('application/json');
      expect(MemoryMimeType.MARKDOWN).toBe('text/markdown');
      expect(MemoryMimeType.IMAGE).toBe('image/*');
      expect(MemoryMimeType.BINARY).toBe('application/octet-stream');
    });
  });
});
