# Ollama 文件自动组织示例

这个示例展示了如何使用 Ollama（本地 LLM）来智能地组织文件：

## 功能特性

1. **读取文本文件内容** - 自动读取文件内容
2. **AI 分析** - 通过 LLM 分析文件内容，理解文件的主题和用途
3. **自动分类** - 根据内容自动建议合适的文件夹/类别
4. **智能重命名** - 根据文件内容生成描述性的文件名
5. **自动保存** - 将文件移动到合适的文件夹并重命名

## 使用前提

1. 安装 Ollama：https://ollama.ai/
2. 下载模型：`ollama pull llama2`（或 `mistral`、`codellama` 等）
3. 确保 Ollama 服务器正在运行（通常会自动启动）

## 运行示例

```bash
# 使用 npm 脚本
npm run example:ollama-organizer

# 或使用 ts-node 直接运行
npx ts-node src/examples/ollama-file-organizer-example.ts
```

## 配置

可以通过环境变量配置：

```bash
# 设置 Ollama 服务器地址（可选，默认: http://localhost:11434/v1）
export OLLAMA_BASE_URL=http://localhost:11434/v1

# 设置使用的模型（可选，默认: llama2）
export OLLAMA_MODEL=mistral
```

## 工作原理

示例会：

1. 创建一些测试文件（会议记录、食谱、系统日志等）
2. 对每个文件：
   - 让 LLM 读取文件内容
   - 分析内容并确定合适的类别（如 meetings、recipes、logs 等）
   - 生成描述性的文件名（使用小写和连字符）
   - 创建目标文件夹（如果不存在）
   - 移动并重命名文件
3. 显示最终的目录结构

## 示例输出

```
Processing: document1.txt
======================================================================
Analyzing and organizing...

Agent Response:
I've analyzed the file "document1.txt" and determined it's a meeting note.
- Category: meetings (contains meeting notes and action items)
- New filename: q4-planning-meeting-2025-11-16.txt
- New path: meetings/q4-planning-meeting-2025-11-16.txt

The file has been successfully organized!
```

## 扩展此示例

您可以修改此示例以：

- 添加更多文件类型支持（PDF、图片等）
- 自定义分类规则
- 添加标签系统
- 集成到现有的文件管理工作流
- 使用其他 LLM 提供商（OpenAI、Anthropic 等）

## 相关文件

- 示例代码：`src/examples/ollama-file-organizer-example.ts`
- 文件系统工具：`src/tools/FileSystemTool.ts`
- Ollama 提供商：`src/providers/OllamaProvider.ts`

## 注意事项

- 本示例在临时目录中运行，不会影响您的实际文件
- Ollama 在本地运行，无需 API 密钥，保护隐私
- 可以在离线环境下使用
- 首次运行可能需要较长时间下载和加载模型
