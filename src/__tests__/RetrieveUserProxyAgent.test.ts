import { RetrieveUserProxyAgent, DocumentChunk } from '../agents/RetrieveUserProxyAgent';
import { IMessage } from '../core/IAgent';

describe('RetrieveUserProxyAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default configuration', () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever',
        systemMessage: 'You are a retrieval agent'
      });

      expect(agent.getName()).toBe('retriever');
    });

    it('should create an agent with retrieval configuration', () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever',
        retrieveConfig: {
          task: 'qa',
          nResults: 3,
          distanceThreshold: 0.9
        }
      });

      expect(agent.getName()).toBe('retriever');
    });
  });

  describe('setRetrievalFunction', () => {
    it('should set custom retrieval function', () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const mockRetrievalFn = async (query: string, nResults?: number) => {
        return [
          {
            content: 'Document 1 content',
            score: 0.95
          },
          {
            content: 'Document 2 content',
            score: 0.85
          }
        ];
      };

      agent.setRetrievalFunction(mockRetrievalFn);
      // Function should be set (tested via retrieveDocuments)
    });
  });

  describe('retrieveDocuments', () => {
    it('should retrieve documents using the retrieval function', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Doc 1', score: 0.95 },
        { content: 'Doc 2', score: 0.85 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);

      const docs = await agent.retrieveDocuments('test query');
      expect(docs).toHaveLength(2);
      expect(docs[0].content).toBe('Doc 1');
    });

    it('should filter documents by distance threshold', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever',
        retrieveConfig: {
          distanceThreshold: 0.9
        }
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Doc 1', score: 0.95 },
        { content: 'Doc 2', score: 0.85 },
        { content: 'Doc 3', score: 0.88 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);

      const docs = await agent.retrieveDocuments('test query');
      expect(docs).toHaveLength(1); // Only Doc 1 meets threshold
      expect(docs[0].content).toBe('Doc 1');
    });

    it('should return empty array when no retrieval function set', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const docs = await agent.retrieveDocuments('test query');
      expect(docs).toHaveLength(0);
    });
  });

  describe('getRetrievedDocuments', () => {
    it('should return cached retrieved documents', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Doc 1', score: 0.95 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);
      await agent.retrieveDocuments('test query');

      const cached = agent.getRetrievedDocuments();
      expect(cached).toHaveLength(1);
      expect(cached[0].content).toBe('Doc 1');
    });
  });

  describe('clearRetrievedDocuments', () => {
    it('should clear cached documents', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Doc 1', score: 0.95 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);
      await agent.retrieveDocuments('test query');
      
      expect(agent.getRetrievedDocuments()).toHaveLength(1);
      
      agent.clearRetrievedDocuments();
      
      expect(agent.getRetrievedDocuments()).toHaveLength(0);
    });
  });

  describe('generateReply', () => {
    it('should generate reply with retrieved context for QA task', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever',
        retrieveConfig: {
          task: 'qa'
        }
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Relevant information about the query', score: 0.95 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);

      const messages: IMessage[] = [
        { role: 'assistant', content: 'What is the answer?' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply.content).toContain('Retrieved Context');
      expect(reply.content).toContain('Relevant information');
    });

    it('should generate reply without retrieval when no function set', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever'
      });

      const messages: IMessage[] = [
        { role: 'assistant', content: 'Hello' }
      ];

      const reply = await agent.generateReply(messages);
      expect(reply.content).toBe('Continuing...');
    });
  });

  describe('initiateChat', () => {
    it('should augment initial message with retrieved context', async () => {
      const agent = new RetrieveUserProxyAgent({
        name: 'retriever',
        retrieveConfig: {
          updateContext: true
        }
      });

      const mockDocs: DocumentChunk[] = [
        { content: 'Context document', score: 0.95 }
      ];

      agent.setRetrievalFunction(async () => mockDocs);

      // Create a simple mock recipient
      const mockRecipient = {
        getName: () => 'assistant',
        generateReply: async (messages: IMessage[]) => {
          // Check that the message includes retrieved context
          const lastMsg = messages[messages.length - 1];
          expect(lastMsg.content).toContain('Retrieved Context');
          return {
            role: 'assistant' as const,
            content: 'TERMINATE',
            name: 'assistant'
          };
        }
      };

      await agent.initiateChat(mockRecipient as any, 'Test query', 1);
    });
  });
});
