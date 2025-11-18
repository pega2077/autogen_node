# GitHub AI 项目搜索示例

这个示例演示了如何使用 AssistantAgent 配合网络浏览和 API 工具来搜索 GitHub 上的热门 AI 项目。

## 功能特性

该示例展示了：

1. **多工具集成**：将 BrowserTool、APITool 和 FileSystemTool 组合使用
2. **网络搜索能力**：Agent 可以浏览 GitHub 网页，提取项目信息
3. **API 调用**：使用 GitHub API 获取仓库详细信息
4. **自主文件保存**：Agent 自主决定将研究成果保存到文件

## 工具说明

### BrowserTool（浏览器工具）
- `navigate_to_url`: 导航到指定 URL
- `get_page_text`: 获取页面文本内容
- `extract_data`: 从页面提取特定数据
- `take_screenshot`: 截取页面截图

### APITool（API 工具）
- `get_request`: 发送 GET 请求到 GitHub API
- `post_request`: 发送 POST 请求（如需要）

### FileSystemTool（文件系统工具）
- `write_file`: 将内容写入文件
- `read_file`: 读取文件内容
- `list_directory`: 列出目录内容

## 使用方法

### 前提条件

1. 安装 Ollama
   ```bash
   # 访问 https://ollama.ai/ 下载安装
   ```

2. 下载 AI 模型
   ```bash
   ollama pull llama2
   # 或使用其他模型如 mistral, codellama 等
   ```

3. 确保 Ollama 服务运行中
   ```bash
   # Ollama 通常在安装后会自动运行
   # 默认地址: http://localhost:11434
   ```

### 运行示例

```bash
# 使用 npm 脚本运行
npm run example:github-ai-search

# 或直接使用 ts-node
npx ts-node src/examples/github-ai-search-example.ts
```

### 环境变量配置（可选）

```bash
# .env 文件
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama2
```

## 示例输出

Agent 将执行以下操作：

1. **浏览 GitHub**：访问 GitHub trending 页面或搜索页面
2. **提取项目信息**：
   - 项目名称和 URL
   - 项目描述
   - Star 数量
   - 编程语言
   - 最近活跃度
3. **API 查询**：通过 GitHub API 获取详细的仓库信息
4. **保存结果**：将研究发现保存到 markdown 或 JSON 文件

典型输出文件示例 (`github-ai-projects.md`):

```markdown
# GitHub 热门 AI 项目研究报告

生成时间: 2024-11-18

## 1. [项目名称](https://github.com/user/repo)
- **描述**: 项目的简短描述
- **Stars**: ⭐ 10,000+
- **语言**: Python
- **亮点**: 最近一个月增长 2000+ stars，在 LLM 领域很受欢迎

## 2. [另一个项目](https://github.com/user/repo2)
...
```

## Agent 系统提示

该示例中的 Agent 配置了专门的系统提示：

```
你是一个专门寻找和分析热门 AI 项目的 GitHub 研究助手。

你的能力：
1. 网络浏览：使用 navigate_to_url 和 get_page_text 浏览 GitHub 趋势页面和项目页面
2. API 访问：使用 get_request 查询 GitHub API 获取仓库信息
3. 文件操作：将研究发现保存到 markdown 或 JSON 文件供以后参考

任务方法：
- 搜索 GitHub 上的热门 AI 仓库
- 提取关键信息：项目名称、描述、stars、语言、最近活跃度
- 寻找与机器学习、深度学习、LLM 和 AI 工具相关的项目
- 关注 star 数高且最近更新的项目
- 将完整的研究发现保存到描述性文件名的文件中

当找到有趣的项目时，包括：
- 仓库名称和 URL
- 描述
- Star 数量和编程语言
- 为什么它值得关注
```

## 自主行为

这个示例的关键特性是 **Agent 的自主性**：

- Agent 自己决定如何搜索（浏览网页 vs API 调用）
- Agent 自己决定提取哪些信息
- Agent 自己决定何时保存文件以及保存什么内容
- Agent 自己选择文件名和格式

没有硬编码的工作流程，一切由 Agent 基于任务理解自主决定。

## 扩展用途

这个示例可以轻松修改用于：

- 搜索其他主题的 GitHub 项目（如 Web3、游戏开发等）
- 分析特定技术栈的流行趋势
- 监控竞品或感兴趣的项目
- 生成技术调研报告
- 自动化市场研究

只需修改任务描述和 Agent 的系统提示即可。

## 注意事项

1. **API 限制**：GitHub API 对未认证请求有速率限制（每小时 60 次）
   - 如需更高限制，可在 APITool 配置中添加 GitHub token

2. **Ollama 模型选择**：
   - `llama2`: 通用能力强，适合大多数任务
   - `mistral`: 速度快，适合快速迭代
   - `codellama`: 适合需要理解代码的场景

3. **浏览器资源**：BrowserTool 使用 Playwright，首次运行会下载浏览器

4. **网络连接**：需要稳定的互联网连接访问 GitHub

## 技术细节

### 工具组合

```typescript
// 浏览器工具
const browserTool = new BrowserTool({ headless: true });
const browserFunctions = BrowserTool.createFunctionContracts(browserTool);

// API 工具
const apiTool = new APITool({
  baseURL: 'https://api.github.com',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AutoGen-NodeJS-Example'
  }
});
const apiFunctions = APITool.createFunctionContracts(apiTool);

// 文件系统工具
const fileSystemTool = new FileSystemTool({
  basePath: tempDir,
  allowedExtensions: ['.txt', '.md', '.json']
});
const fileFunctions = FileSystemTool.createFunctionContracts(fileSystemTool);

// 组合所有工具
const allFunctions = [...browserFunctions, ...apiFunctions, ...fileFunctions];
```

### Agent 配置

```typescript
const researchAgent = new AssistantAgent({
  name: 'github_researcher',
  provider: 'ollama',
  model: 'llama2',
  baseURL: ollamaURL,
  systemMessage: '...',  // 专门的系统提示
  temperature: 0.7,      // 适中的创造性
  maxTokens: 2000,       // 足够的输出长度
  functions: allFunctions // 所有工具函数
});
```

## 相关示例

- `planner-supervisor-example.ts`: 规划和监督型 Agent 工作流
- `browser-tool-example.ts`: 浏览器工具基础用法
- `api-tool-example.ts`: API 工具基础用法
- `filesystem-tool-example.ts`: 文件系统工具基础用法

## 许可证

与主项目相同的许可证。
