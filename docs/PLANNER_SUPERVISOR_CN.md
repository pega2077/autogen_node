# 规划型和监督型 Agent

本文档介绍 autogen_node 中用于编排多智能体工作流的规划型和监督型 agent。

## 目录

- [概述](#概述)
- [PlannerAgent（规划型Agent）](#planneragent规划型agent)
- [SupervisorAgent（监督型Agent）](#supervisoragent监督型agent)
- [完整工作流示例](#完整工作流示例)
- [最佳实践](#最佳实践)

## 概述

规划型和监督型 agent 实现了复杂的多智能体工作流：

1. **PlannerAgent（规划型Agent）** - 分析需求并创建结构化的任务计划
2. **SupervisorAgent（监督型Agent）** - 验证任务完成情况并确保满足需求
3. **Worker Agents（工作型Agent）** - 执行计划中的各个任务
4. **反馈循环** - 迭代改进直到满足所有需求

此模式适用于以下复杂任务：
- 将需求分解为可管理的子任务
- 协调多个专业化的 agent
- 质量保证和验证
- 基于反馈的迭代改进

## PlannerAgent（规划型Agent）

规划型 agent 可以分析用户需求，并将其分解为结构化的、可执行的任务计划。

### 功能特性

- 智能任务分解
- 生成带编号的结构化计划
- 任务状态跟踪（待处理、进行中、已完成）
- 将任务分配给工作 agent
- 进度监控
- 可视化计划摘要

### 配置选项

```typescript
interface PlannerAgentConfig extends AssistantAgentConfig {
  planningPrompt?: string;  // 自定义规划指令
  // ... 标准的 AssistantAgent 配置（provider、model 等）
}
```

### 任务结构

```typescript
interface Task {
  id: number;                                           // 唯一任务ID
  description: string;                                  // 需要完成的工作
  assignedTo?: string;                                  // 分配给哪个 agent
  status: 'pending' | 'in_progress' | 'completed';     // 当前状态
  result?: string;                                      // 完成时的任务输出
}

interface TaskPlan {
  tasks: Task[];          // 所有任务列表
  description: string;    // 总体目标/需求
}
```

### 基本用法

```typescript
import { PlannerAgent } from 'autogen_node';

// 创建规划型 agent
const planner = new PlannerAgent({
  name: 'planner',
  provider: 'ollama',
  model: 'llama2',
  baseURL: 'http://localhost:11434/v1',
  temperature: 0.7
});

// 根据用户需求创建计划
const requirement = '创建一个带有登录和注册功能的用户认证系统';
const plan = await planner.createPlan(requirement);

// 显示计划
console.log(planner.getPlanSummary());
// 输出：
// Plan: 创建一个带有登录和注册功能的用户认证系统...
// Tasks:
// ○ 1. 设计用户数据库架构
// ○ 2. 实现用户注册端点
// ○ 3. 实现登录端点
// ○ 4. 添加密码哈希和验证
// ○ 5. 创建认证中间件
```

### 任务管理

```typescript
// 将任务分配给 agent
planner.assignTask(1, 'database_agent');

// 更新任务状态
planner.updateTaskStatus(1, 'in_progress');

// 标记任务为已完成并添加结果
planner.updateTaskStatus(1, 'completed', '数据库架构创建成功');

// 检查所有任务是否完成
if (planner.isAllTasksCompleted()) {
  console.log('所有任务已完成！');
}

// 获取当前计划
const currentPlan = planner.getCurrentPlan();
if (currentPlan) {
  console.log(`总任务数: ${currentPlan.tasks.length}`);
}
```

### 自定义规划提示

```typescript
const planner = new PlannerAgent({
  name: 'planner',
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  planningPrompt: `分析需求并创建详细的技术计划。
    每个任务应该具体且可测试。
    考虑依赖关系并按逻辑顺序排列任务。`
});
```

## SupervisorAgent（监督型Agent）

监督型 agent 验证任务完成情况，根据需求验证结果，并提供结构化的反馈。

### 功能特性

- 需求验证
- 生成结构化反馈
- 识别缺失任务
- 改进建议
- 迭代跟踪以防止无限循环
- 详细的验证报告

### 配置选项

```typescript
interface SupervisorAgentConfig extends AssistantAgentConfig {
  verificationPrompt?: string;  // 自定义验证指令
  maxIterations?: number;       // 最大验证周期（默认：5）
  // ... 标准的 AssistantAgent 配置
}
```

### 验证结果结构

```typescript
interface VerificationResult {
  isComplete: boolean;      // 是否满足所有需求？
  feedback: string;         // 详细反馈
  missingTasks: string[];   // 缺失或未完成的项目列表
  suggestions: string[];    // 改进建议
}
```

### 基本用法

```typescript
import { SupervisorAgent } from 'autogen_node';

// 创建监督型 agent
const supervisor = new SupervisorAgent({
  name: 'supervisor',
  provider: 'ollama',
  model: 'llama2',
  baseURL: 'http://localhost:11434/v1',
  temperature: 0.3,        // 较低的温度以获得更一致的验证
  maxIterations: 3
});

// 验证完成情况
const verification = await supervisor.verifyCompletion(
  requirement,              // 原始用户需求
  plan,                    // 来自 PlannerAgent 的任务计划
  executionResults         // 任务执行结果数组
);

// 显示验证报告
console.log(supervisor.generateFeedbackSummary(verification));

// 检查结果
if (verification.isComplete) {
  console.log('✓ 满足所有需求！');
} else {
  console.log('✗ 工作未完成。正在处理反馈...');
  verification.missingTasks.forEach(task => {
    console.log(`- ${task}`);
  });
}
```

### 迭代管理

```typescript
// 检查当前迭代次数
console.log(`迭代次数: ${supervisor.getCurrentIteration()}`);

// 检查是否达到最大迭代次数
if (supervisor.hasReachedMaxIterations()) {
  console.log('已达到最大迭代次数。停止。');
}

// 为新的验证会话重置计数器
supervisor.resetIterations();
```

### 快速任务验证

```typescript
// 验证单个任务的完成情况
const isTaskComplete = await supervisor.checkTaskCompletion(
  '实现用户注册端点',
  '创建了带验证的 POST /api/register 端点'
);

if (!isTaskComplete) {
  console.log('任务需要更多工作');
}
```

## 完整工作流示例

以下是演示规划-执行-监督循环的完整示例：

```typescript
import { 
  PlannerAgent, 
  SupervisorAgent, 
  AssistantAgent 
} from 'autogen_node';

async function plannerSupervisorWorkflow() {
  // 1. 创建规划器
  const planner = new PlannerAgent({
    name: 'planner',
    provider: 'ollama',
    model: 'llama2',
    baseURL: 'http://localhost:11434/v1'
  });

  // 2. 创建监督器
  const supervisor = new SupervisorAgent({
    name: 'supervisor',
    provider: 'ollama',
    model: 'llama2',
    baseURL: 'http://localhost:11434/v1',
    maxIterations: 3
  });

  // 3. 创建工作 agent
  const researcher = new AssistantAgent({
    name: 'researcher',
    provider: 'ollama',
    model: 'llama2',
    systemMessage: '你是一个研究 agent。收集和分析信息。',
    baseURL: 'http://localhost:11434/v1'
  });

  const developer = new AssistantAgent({
    name: 'developer',
    provider: 'ollama',
    model: 'llama2',
    systemMessage: '你是一个开发 agent。编写代码并实现解决方案。',
    baseURL: 'http://localhost:11434/v1'
  });

  // 4. 定义需求
  const requirement = '创建一个待办事项应用的 REST API';

  // 5. 最大反馈循环次数（默认：3）
  const maxFeedbackLoops = 3;
  let feedbackLoopCount = 0;
  let isComplete = false;
  let currentRequirement = requirement;

  // 6. 主反馈循环：计划 → 执行 → 验证 → 重新规划（如需要）
  while (!isComplete && feedbackLoopCount < maxFeedbackLoops) {
    feedbackLoopCount++;

    // 创建计划（或根据反馈重新规划）
    console.log(`\n=== 迭代 ${feedbackLoopCount}/${maxFeedbackLoops} ===`);
    const plan = await planner.createPlan(currentRequirement);
    console.log(planner.getPlanSummary());

    // 执行任务
    const executionResults: string[] = [];
    
    for (const task of plan.tasks) {
      // 选择合适的 agent
      const agent = task.description.toLowerCase().includes('研究') 
        ? researcher 
        : developer;
      
      planner.assignTask(task.id, agent.getName());
      planner.updateTaskStatus(task.id, 'in_progress');

      // 执行任务
      const result = await agent.generateReply([
        { 
          role: 'user', 
          content: `完成这个任务: ${task.description}` 
        }
      ]);

      planner.updateTaskStatus(task.id, 'completed', result.content);
      executionResults.push(result.content);
    }

    // 验证完成情况
    const verification = await supervisor.verifyCompletion(
      requirement,
      plan,
      executionResults
    );

    console.log(supervisor.generateFeedbackSummary(verification));

    // 检查是否完成或准备重新规划
    if (verification.isComplete) {
      isComplete = true;
      console.log('✅ 满足所有需求！');
    } else if (feedbackLoopCount < maxFeedbackLoops) {
      // 准备根据反馈重新规划
      console.log('⚠️ 未完成。根据反馈重新规划...');
      const feedbackSummary = verification.missingTasks.length > 0 
        ? `缺失:\n${verification.missingTasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : verification.feedback;
      
      currentRequirement = `${requirement}\n\n上次尝试的反馈:\n${feedbackSummary}\n\n创建新计划以解决这些问题。`;
    } else {
      console.log('⚠️ 达到最大迭代次数。');
    }
  }

  // 7. 最终总结
  console.log('\n=== 工作流完成 ===');
  console.log(`状态: ${isComplete ? '成功' : '部分完成'}`);
  console.log(`迭代次数: ${feedbackLoopCount}`);
}

// 运行工作流
plannerSupervisorWorkflow().catch(console.error);
```

## 最佳实践

### 1. 选择合适的模型

```typescript
// 使用较高的温度进行创造性规划
const planner = new PlannerAgent({
  temperature: 0.7  // 更具创造性的任务分解
});

// 使用较低的温度进行一致的验证
const supervisor = new SupervisorAgent({
  temperature: 0.3  // 更一致和严格的验证
});
```

### 2. 设置合理的迭代限制

```typescript
const supervisor = new SupervisorAgent({
  maxIterations: 3  // 在允许改进的同时防止无限循环
});
```

### 3. 提供清晰的需求

```typescript
// 好的示例：具体且可衡量
const requirement = `创建一个包含以下端点的 REST API：
- POST /api/users（创建用户）
- GET /api/users/:id（获取用户）
- 包含输入验证和错误处理`;

// 不好的示例：模糊且无法衡量
const requirement = '做一个好的 API';
```

### 4. 使用专业化的工作 Agent

```typescript
// 创建具有特定专长的 agent
const researcher = new AssistantAgent({
  systemMessage: '你是一个研究专家...'
});

const coder = new AssistantAgent({
  systemMessage: '你是一个编码专家...'
});

const reviewer = new AssistantAgent({
  systemMessage: '你是一个代码审查员...'
});
```

### 5. 监控进度

```typescript
// 在执行过程中跟踪进度
console.log(`任务: ${plan.tasks.filter(t => t.status === 'completed').length}/${plan.tasks.length}`);
console.log(`迭代: ${supervisor.getCurrentIteration()}`);
console.log(planner.getPlanSummary());
```

### 6. 处理验证结果

```typescript
const verification = await supervisor.verifyCompletion(/* ... */);

if (verification.isComplete) {
  // 成功路径
  console.log('✓ 满足需求');
  await finalizeWork();
} else if (supervisor.hasReachedMaxIterations()) {
  // 达到最大迭代次数
  console.warn('⚠ 已达到最大迭代次数');
  await handlePartialCompletion(verification);
} else {
  // 继续处理反馈
  await addressFeedback(verification.missingTasks);
}
```

## 运行示例

`src/examples/planner-supervisor-example.ts` 中提供了完整示例：

```bash
# 确保 Ollama 正在运行并且模型已下载
ollama pull llama2

# 运行示例
npm run example:planner-supervisor
```

示例演示了：
- 用户需求输入
- 自动规划
- 使用专业化 agent 执行任务
- 验证和反馈
- 迭代改进直到完成

## 使用场景

此模式适用于：

1. **复杂项目规划**：将大型项目分解为可管理的任务
2. **质量保证**：确保交付物满足需求
3. **多 Agent 协调**：编排多个专业化 agent
4. **迭代开发**：基于反馈改进工作
5. **自动化工作流**：创建自我管理的任务执行管道

## 与其他模式集成

规划-监督模式可以与以下模式很好地配合使用：

- **GroupChat**：用于更动态的 agent 交互
- **SequentialChat**：用于带规划的预定义工作流
- **SwarmMode**：用于分布式任务执行
- **NestedChat**：用于分层任务委派

与 GroupChat 结合的示例：

```typescript
import { GroupChat, GroupChatManager } from 'autogen_node';

// 使用规划器创建任务，然后使用 GroupChat 执行
const plan = await planner.createPlan(requirement);

const groupChat = new GroupChat({
  agents: [researcher, developer, reviewer],
  maxRound: 10
});

const manager = new GroupChatManager({
  groupChat: groupChat
});

// 通过群组聊天执行任务
for (const task of plan.tasks) {
  await manager.runChat(task.description);
}

// 使用监督器验证
const verification = await supervisor.verifyCompletion(/* ... */);
```

## 注意事项

1. **模型选择**：使用 Ollama 时，建议使用 `llama2`、`mistral` 或 `codellama` 等较大的模型以获得更好的规划和验证能力。

2. **提示工程**：根据你的具体需求调整系统消息和提示，以获得最佳结果。

3. **错误处理**：在生产环境中，添加适当的错误处理和重试逻辑。

4. **性能优化**：对于大型任务，考虑并行执行独立的任务以提高效率。

5. **成本控制**：监控 API 调用次数，特别是在使用付费 LLM 服务时。
