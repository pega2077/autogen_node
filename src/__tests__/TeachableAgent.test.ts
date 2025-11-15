import { TeachableAgent } from '../agents/TeachableAgent';
import { IMessage } from '../core/IAgent';

describe('TeachableAgent', () => {
  describe('constructor', () => {
    it('should create an agent with default configuration', () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        systemMessage: 'You are a teachable assistant'
      });

      expect(agent.getName()).toBe('teacher');
      expect(agent.isTeachModeEnabled()).toBe(true);
    });

    it('should create an agent with teach mode disabled', () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        teachMode: false
      });

      expect(agent.isTeachModeEnabled()).toBe(false);
    });
  });

  describe('teach and recall', () => {
    it('should teach and recall facts', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('user_name', 'John Doe', 'user_fact');
      
      const memory = agent.recall('user_name');
      expect(memory).toBeDefined();
      expect(memory?.value).toBe('John Doe');
      expect(memory?.category).toBe('user_fact');
    });

    it('should return undefined for non-existent memories', () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      const memory = agent.recall('nonexistent');
      expect(memory).toBeUndefined();
    });
  });

  describe('recallByCategory', () => {
    it('should recall memories by category', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('pref1', 'likes Python', 'user_preference');
      await agent.teach('pref2', 'prefers dark mode', 'user_preference');
      await agent.teach('fact1', 'works at Google', 'user_fact');

      const preferences = agent.recallByCategory('user_preference');
      expect(preferences).toHaveLength(2);
      expect(preferences.every(m => m.category === 'user_preference')).toBe(true);
    });
  });

  describe('searchMemories', () => {
    it('should search memories by keyword', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('lang_pref', 'likes Python and JavaScript', 'user_preference');
      await agent.teach('work', 'works as a developer', 'user_fact');

      const results = agent.searchMemories('Python');
      expect(results).toHaveLength(1);
      expect(results[0].value).toContain('Python');
    });

    it('should perform case-insensitive search', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('pref', 'Likes PYTHON', 'user_preference');

      const results = agent.searchMemories('python');
      expect(results).toHaveLength(1);
    });
  });

  describe('getAllMemories', () => {
    it('should return all memories', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('mem1', 'Memory 1');
      await agent.teach('mem2', 'Memory 2');
      await agent.teach('mem3', 'Memory 3');

      const allMemories = agent.getAllMemories();
      expect(allMemories).toHaveLength(3);
    });
  });

  describe('clearMemories', () => {
    it('should clear all memories', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('mem1', 'Memory 1');
      await agent.teach('mem2', 'Memory 2');
      expect(agent.getAllMemories()).toHaveLength(2);

      await agent.clearMemories();
      expect(agent.getAllMemories()).toHaveLength(0);
    });
  });

  describe('forgetMemory', () => {
    it('should delete a specific memory', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('mem1', 'Memory 1');
      await agent.teach('mem2', 'Memory 2');
      expect(agent.getAllMemories()).toHaveLength(2);

      await agent.forgetMemory('mem1');
      expect(agent.getAllMemories()).toHaveLength(1);
      expect(agent.recall('mem1')).toBeUndefined();
      expect(agent.recall('mem2')).toBeDefined();
    });
  });

  describe('maxMemoryItems', () => {
    it('should enforce max memory items limit', async () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        maxMemoryItems: 3
      });

      await agent.teach('mem1', 'Memory 1');
      await agent.teach('mem2', 'Memory 2');
      await agent.teach('mem3', 'Memory 3');
      await agent.teach('mem4', 'Memory 4'); // Should remove oldest

      const memories = agent.getAllMemories();
      expect(memories).toHaveLength(3);
      expect(agent.recall('mem1')).toBeUndefined(); // Oldest removed
      expect(agent.recall('mem4')).toBeDefined();
    });
  });

  describe('exportMemories and importMemories', () => {
    it('should export memories as JSON', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('mem1', 'Memory 1', 'test');
      
      const exported = agent.exportMemories();
      expect(typeof exported).toBe('string');
      
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should import memories from JSON', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      const memoriesJson = JSON.stringify([
        {
          key: 'imported',
          value: 'Imported memory',
          timestamp: Date.now(),
          category: 'imported_cat'
        }
      ]);

      await agent.importMemories(memoriesJson);
      
      const memory = agent.recall('imported');
      expect(memory).toBeDefined();
      expect(memory?.value).toBe('Imported memory');
    });
  });

  describe('getMemoryStats', () => {
    it('should return memory statistics', async () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      await agent.teach('pref1', 'Preference 1', 'user_preference');
      await agent.teach('fact1', 'Fact 1', 'user_fact');
      await agent.teach('pref2', 'Preference 2', 'user_preference');

      const stats = agent.getMemoryStats();
      expect(stats.totalMemories).toBe(3);
      expect(stats.categoryCounts['user_preference']).toBe(2);
      expect(stats.categoryCounts['user_fact']).toBe(1);
      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
    });

    it('should handle empty memory statistics', () => {
      const agent = new TeachableAgent({
        name: 'teacher'
      });

      const stats = agent.getMemoryStats();
      expect(stats.totalMemories).toBe(0);
      expect(Object.keys(stats.categoryCounts)).toHaveLength(0);
    });
  });

  describe('setTeachMode', () => {
    it('should enable and disable teach mode', () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        teachMode: true
      });

      expect(agent.isTeachModeEnabled()).toBe(true);
      
      agent.setTeachMode(false);
      expect(agent.isTeachModeEnabled()).toBe(false);
      
      agent.setTeachMode(true);
      expect(agent.isTeachModeEnabled()).toBe(true);
    });
  });

  describe('learning from user messages', () => {
    it('should extract and learn from user preferences', async () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        teachMode: true,
        defaultAutoReply: 'I understand.'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'I prefer TypeScript over JavaScript.' }
      ];

      await agent.generateReply(messages);
      
      // Check if something was learned (the exact key depends on implementation)
      const allMemories = agent.getAllMemories();
      expect(allMemories.length).toBeGreaterThan(0);
    });

    it('should not learn when teach mode is disabled', async () => {
      const agent = new TeachableAgent({
        name: 'teacher',
        teachMode: false,
        defaultAutoReply: 'I understand.'
      });

      const messages: IMessage[] = [
        { role: 'user', content: 'I prefer TypeScript over JavaScript.' }
      ];

      await agent.generateReply(messages);
      
      const allMemories = agent.getAllMemories();
      expect(allMemories.length).toBe(0);
    });
  });
});
