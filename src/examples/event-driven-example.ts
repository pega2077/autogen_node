/**
 * Example demonstrating AutoGen v0.4 event-driven architecture
 * with asynchronous message passing and distributed agent systems
 */

import {
  AgentId,
  TopicId,
  SingleThreadedAgentRuntime,
  CancellationToken,
  createSubscription
} from '../index';

// Simple event-driven agent
class EventAgent {
  constructor(private name: string) {}

  async handleMessage(message: any, sender: AgentId | null): Promise<any> {
    console.log(`[${this.name}] Received message from ${sender?.toString() || 'external'}:`);
    console.log(`  Content: ${JSON.stringify(message)}`);
    
    return {
      role: 'assistant',
      content: `${this.name} processed: ${message.content}`,
      name: this.name
    };
  }

  getName(): string {
    return this.name;
  }
}

// Topic subscriber agent
class TopicSubscriberAgent {
  constructor(private name: string, private topic: string) {}

  async handleMessage(message: any, sender: AgentId | null): Promise<any> {
    console.log(`\n[${this.name}] Received topic message on '${this.topic}':`);
    console.log(`  From: ${sender?.toString() || 'external'}`);
    console.log(`  Content: ${JSON.stringify(message)}`);
    
    return {
      role: 'assistant',
      content: `${this.name} acknowledged message on topic ${this.topic}`,
      name: this.name
    };
  }

  getName(): string {
    return this.name;
  }
}

async function main() {
  console.log('=== AutoGen v0.4 Event-Driven Architecture Demo ===\n');

  // Create the runtime
  const runtime = new SingleThreadedAgentRuntime();
  console.log('✓ Created SingleThreadedAgentRuntime\n');

  // Register agents
  const agent1 = new EventAgent('Agent1');
  const agent2 = new EventAgent('Agent2');
  const subscriber1 = new TopicSubscriberAgent('Subscriber1', 'notifications');
  const subscriber2 = new TopicSubscriberAgent('Subscriber2', 'notifications');

  const agent1Id = new AgentId('event_agent', 'agent1');
  const agent2Id = new AgentId('event_agent', 'agent2');
  const sub1Id = new AgentId('subscriber_agent', 'sub1');
  const sub2Id = new AgentId('subscriber_agent', 'sub2');

  await runtime.registerAgentInstance(agent1, agent1Id);
  await runtime.registerAgentInstance(agent2, agent2Id);
  await runtime.registerAgentInstance(subscriber1, sub1Id);
  await runtime.registerAgentInstance(subscriber2, sub2Id);
  
  console.log('✓ Registered 4 agents\n');

  // Demo 1: Direct message passing
  console.log('--- Demo 1: Direct Message Passing (send_message) ---\n');
  
  const message1 = { content: 'Hello from external source' };
  const response1 = await runtime.sendMessage(message1, agent1Id);
  console.log(`\nResponse: ${JSON.stringify(response1)}\n`);

  // Demo 2: Agent-to-agent messaging
  console.log('--- Demo 2: Agent-to-Agent Messaging ---\n');
  
  const message2 = { content: 'Message from Agent1 to Agent2' };
  const response2 = await runtime.sendMessage(message2, agent2Id, agent1Id);
  console.log(`\nResponse: ${JSON.stringify(response2)}\n`);

  // Demo 3: Topic-based publish/subscribe
  console.log('--- Demo 3: Topic-Based Publish/Subscribe ---\n');
  
  const notificationTopic = new TopicId('notification', 'system');
  
  // Subscribe both subscriber agents to the topic
  await runtime.addSubscription(
    createSubscription('sub1', notificationTopic, sub1Id)
  );
  await runtime.addSubscription(
    createSubscription('sub2', notificationTopic, sub2Id)
  );
  
  console.log('✓ Subscribed 2 agents to "notification/system" topic\n');
  
  // Publish a message to the topic
  const broadcastMessage = { 
    content: 'Important system notification',
    timestamp: Date.now()
  };
  
  console.log('Publishing message to topic...\n');
  await runtime.publishMessage(broadcastMessage, notificationTopic, agent1Id);
  console.log('\n✓ Message delivered to all subscribers\n');

  // Demo 4: Cancellation token
  console.log('--- Demo 4: Cancellation Token ---\n');
  
  const cancellationToken = new CancellationToken();
  
  // Schedule cancellation after 100ms
  setTimeout(() => {
    console.log('Cancelling operation...');
    cancellationToken.cancel();
  }, 100);

  try {
    // This will be cancelled
    await new Promise(resolve => setTimeout(resolve, 50));
    cancellationToken.throwIfCancelled();
    const message3 = { content: 'This should complete' };
    const response3 = await runtime.sendMessage(message3, agent1Id, null, cancellationToken);
    console.log(`Response (before cancellation): ${JSON.stringify(response3)}\n`);

    // This will be cancelled
    await new Promise(resolve => setTimeout(resolve, 100));
    cancellationToken.throwIfCancelled();
    const message4 = { content: 'This should be cancelled' };
    await runtime.sendMessage(message4, agent2Id, null, cancellationToken);
  } catch (error) {
    if (error instanceof Error) {
      console.log(`✓ Operation cancelled successfully: ${error.message}\n`);
    }
  }

  // Demo 5: State management
  console.log('--- Demo 5: State Management ---\n');
  
  // Save runtime state
  const state = await runtime.saveState();
  console.log(`✓ Saved runtime state (${Object.keys(state).length} keys)`);
  console.log(`  Subscriptions saved: ${state.subscriptions.length}\n`);

  // Agent metadata
  const metadata = await runtime.agentMetadata(agent1Id);
  console.log('Agent metadata:', metadata, '\n');

  console.log('=== Demo Complete ===\n');
  console.log('Key Features Demonstrated:');
  console.log('  ✓ Asynchronous message passing (sendMessage)');
  console.log('  ✓ Topic-based publish/subscribe (publishMessage)');
  console.log('  ✓ Agent registration and discovery');
  console.log('  ✓ Cancellation tokens for async operations');
  console.log('  ✓ State persistence and management');
  console.log('\nThis implements the AutoGen v0.4 event-driven architecture');
  console.log('enabling scalable, distributed multi-agent systems.\n');
}

// Run the demo
main().catch(console.error);
