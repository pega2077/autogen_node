/**
 * Example demonstrating the RetrieveUserProxyAgent
 * An agent with RAG (Retrieval-Augmented Generation) capabilities
 */

import { RetrieveUserProxyAgent, DocumentChunk } from '../index';
import * as dotenv from 'dotenv';

dotenv.config();

// Mock knowledge base
const knowledgeBase = [
  {
    content: 'AutoGen is a framework for building multi-agent AI systems. It allows agents to communicate and collaborate on complex tasks.',
    metadata: { source: 'overview.md', topic: 'introduction' }
  },
  {
    content: 'The AssistantAgent uses LLM providers like OpenAI to generate intelligent responses. It supports function calling and streaming.',
    metadata: { source: 'agents.md', topic: 'assistant' }
  },
  {
    content: 'UserProxyAgent facilitates human interaction. It can execute code automatically or request human input based on configuration.',
    metadata: { source: 'agents.md', topic: 'user-proxy' }
  },
  {
    content: 'Group chats enable multiple agents to collaborate. The GroupChatManager coordinates the conversation between agents.',
    metadata: { source: 'group-chat.md', topic: 'collaboration' }
  },
  {
    content: 'Memory systems allow agents to maintain context across conversations. ListMemory stores information in a simple list format.',
    metadata: { source: 'memory.md', topic: 'memory' }
  }
];

// Simple retrieval function (in production, use a vector database)
async function simpleRetrieve(query: string, nResults: number = 3): Promise<DocumentChunk[]> {
  const queryLower = query.toLowerCase();
  
  // Simple keyword matching (replace with vector similarity in production)
  const results = knowledgeBase
    .map(doc => {
      const contentLower = doc.content.toLowerCase();
      let score = 0;
      
      // Count keyword matches
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 3);
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          score += 1;
        }
      }
      
      return {
        content: doc.content,
        metadata: doc.metadata,
        score: score / keywords.length // Normalize
      };
    })
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, nResults);
  
  return results;
}

async function main() {
  console.log('=== RetrieveUserProxyAgent Example ===\n');

  // Create RAG agent for Q&A
  const ragAgent = new RetrieveUserProxyAgent({
    name: 'rag_agent',
    retrieveConfig: {
      task: 'qa',
      retrievalFunction: simpleRetrieve,
      nResults: 3,
      distanceThreshold: 0.3,
      updateContext: true
    }
  });

  console.log('1. Retrieving documents:');
  
  const query = 'What is AssistantAgent and how does it work?';
  console.log(`Query: "${query}"\n`);
  
  const docs = await ragAgent.retrieveDocuments(query);
  console.log(`Retrieved ${docs.length} documents:\n`);
  
  docs.forEach((doc, idx) => {
    console.log(`Document ${idx + 1} (score: ${doc.score?.toFixed(2)}):`);
    console.log(`  ${doc.content}`);
    console.log(`  Source: ${doc.metadata?.source}\n`);
  });

  console.log('2. Generating reply with retrieved context:');
  
  const messages = [
    { role: 'assistant', content: query }
  ];
  
  const reply = await ragAgent.generateReply(messages);
  console.log('Agent reply with context:');
  console.log(reply.content);
  console.log();

  console.log('3. Another query about memory:');
  
  const memoryQuery = 'Tell me about memory systems';
  console.log(`Query: "${memoryQuery}"\n`);
  
  const memoryDocs = await ragAgent.retrieveDocuments(memoryQuery);
  console.log(`Retrieved ${memoryDocs.length} documents:\n`);
  
  memoryDocs.forEach((doc, idx) => {
    console.log(`Document ${idx + 1}:`);
    console.log(`  ${doc.content.substring(0, 100)}...`);
    console.log(`  Topic: ${doc.metadata?.topic}\n`);
  });

  console.log('4. Get cached documents:');
  
  const cached = ragAgent.getRetrievedDocuments();
  console.log(`Cached documents from last retrieval: ${cached.length}`);
  
  console.log('\n5. Clear cache:');
  ragAgent.clearRetrievedDocuments();
  console.log(`Cached documents after clear: ${ragAgent.getRetrievedDocuments().length}`);

  console.log('\n=== Example Complete ===');
}

main().catch(console.error);
