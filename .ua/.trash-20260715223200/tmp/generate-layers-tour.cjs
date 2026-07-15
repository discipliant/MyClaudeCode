const fs = require('fs');
const path = require('path');

const uaDir = 'D:/program/AiLearning/MyClaudeCode/.ua';
const graph = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'assembled-graph.json'), 'utf8'));

const fileLevelTypes = new Set(['file', 'config', 'document', 'service', 'pipeline', 'schema', 'resource', 'table', 'endpoint']);
const fileNodes = graph.nodes.filter(n => fileLevelTypes.has(n.type));
const nodeIdSet = new Set(graph.nodes.map(n => n.id));

// Helper: get all node IDs matching a directory prefix
function getIdsByDirPrefix(prefix) {
  return fileNodes
    .filter(n => n.filePath && (n.filePath.startsWith(prefix + '/') || n.filePath === prefix))
    .map(n => n.id);
}

// Helper: get specific file node ID
function getIdByPath(filePath) {
  const node = fileNodes.find(n => n.filePath === filePath);
  return node ? node.id : null;
}

// === LAYERS ===
const layers = [
  {
    id: 'layer:core-runtime',
    name: '核心运行时层',
    description: 'QueryEngine 统一入口、query_loop 状态机、事件流定义。Agent Loop 的核心驱动力。',
    nodeIds: [...getIdsByDirPrefix('cc/core'), getIdByPath('cc/main.py'), getIdByPath('cc/__main__.py'), getIdByPath('cc/__init__.py')].filter(Boolean)
  },
  {
    id: 'layer:api-client',
    name: 'API 客户端层',
    description: 'Anthropic API 流式调用、客户端管理、token 统计。负责与 Claude 模型的底层通信。',
    nodeIds: getIdsByDirPrefix('cc/api').filter(Boolean)
  },
  {
    id: 'layer:data-models',
    name: '数据模型层',
    description: '消息类型、content blocks、API 规范化数据结构。定义 agent 交互的核心数据契约。',
    nodeIds: getIdsByDirPrefix('cc/models').filter(Boolean)
  },
  {
    id: 'layer:prompts',
    name: '系统提示词层',
    description: 'System Prompt 多段动态拼装，含 Memory 行为指导 + Coordinator/Teammate 提示词。CLAUDE.md 加载与递归展开。',
    nodeIds: getIdsByDirPrefix('cc/prompts').filter(Boolean)
  },
  {
    id: 'layer:tools',
    name: '工具层',
    description: '22 个内置工具实现 + StreamingToolExecutor + 权限门控。涵盖 Bash、Read、Edit、Write、Glob、Grep、Agent、WebFetch 等全部工具。',
    nodeIds: getIdsByDirPrefix('cc/tools').filter(Boolean)
  },
  {
    id: 'layer:permissions',
    name: '权限系统层',
    description: 'PermissionMode（bypass/acceptEdits/default）+ 规则引擎 + 非交互 fail-fast 语义。控制工具执行的安全边界。',
    nodeIds: getIdsByDirPrefix('cc/permissions').filter(Boolean)
  },
  {
    id: 'layer:agent-teams',
    name: 'Agent Teams 层',
    description: '多 Agent 协调：Teammate 执行引擎、Mailbox 通信、Coordinator 编排、Team 生命周期管理。',
    nodeIds: getIdsByDirPrefix('cc/swarm').filter(Boolean)
  },
  {
    id: 'layer:context-compression',
    name: '上下文压缩层',
    description: 'Token 预算监控、超限自动 compact、摘要生成。确保长对话不超出上下文窗口。',
    nodeIds: getIdsByDirPrefix('cc/compact').filter(Boolean)
  },
  {
    id: 'layer:memory',
    name: '记忆系统层',
    description: '四类记忆分类、MEMORY.md 索引自动更新、后台 coalescing 提取。让 agent 跨会话保持上下文。',
    nodeIds: getIdsByDirPrefix('cc/memory').filter(Boolean)
  },
  {
    id: 'layer:mcp-protocol',
    name: 'MCP 协议层',
    description: 'stdio 传输、动态工具注册、多 server 并行。支持通过 MCP 协议接入外部工具服务。',
    nodeIds: getIdsByDirPrefix('cc/mcp').filter(Boolean)
  },
  {
    id: 'layer:hooks',
    name: 'Hooks 层',
    description: 'PreToolUse/PostToolUse 拦截器，shell 命令执行。允许在工具执行前后注入自定义逻辑。',
    nodeIds: getIdsByDirPrefix('cc/hooks').filter(Boolean)
  },
  {
    id: 'layer:skills',
    name: 'Skills 层',
    description: 'frontmatter 定义、slash 命令触发、prompt 注入。支持通过 skill 文件扩展 agent 能力。',
    nodeIds: getIdsByDirPrefix('cc/skills').filter(Boolean)
  },
  {
    id: 'layer:session',
    name: '会话持久化层',
    description: '会话保存/恢复、Task 状态快照、transcript 校验修复。确保 agent 状态可持久化和恢复。',
    nodeIds: getIdsByDirPrefix('cc/session').filter(Boolean)
  },
  {
    id: 'layer:commands',
    name: '命令层',
    description: 'Slash 命令注册和处理：/clear /compact /model /help /cost。用户交互的快捷入口。',
    nodeIds: getIdsByDirPrefix('cc/commands').filter(Boolean)
  },
  {
    id: 'layer:ui',
    name: 'UI 渲染层',
    description: 'Rich 流式终端输出。负责将 agent 响应实时渲染到终端。',
    nodeIds: getIdsByDirPrefix('cc/ui').filter(Boolean)
  },
  {
    id: 'layer:utils',
    name: '工具函数层',
    description: '通用工具函数和错误处理。为其他模块提供基础支撑。',
    nodeIds: getIdsByDirPrefix('cc/utils').filter(Boolean)
  },
  {
    id: 'layer:tests',
    name: '测试层',
    description: '498 个单元测试 + 集成测试 + E2E 测试。覆盖所有核心模块的功能验证。',
    nodeIds: getIdsByDirPrefix('tests').filter(Boolean)
  },
  {
    id: 'layer:config-docs',
    name: '配置与文档层',
    description: '项目配置文件（pyproject.toml、Makefile）和文档（README.md）。定义项目元数据和构建流程。',
    nodeIds: [getIdByPath('pyproject.toml'), getIdByPath('Makefile'), getIdByPath('README.md')].filter(Boolean)
  },
];

// Filter out layers with no nodes and ensure all nodeIds exist
const finalLayers = layers
  .filter(l => l.nodeIds.length > 0)
  .map(l => ({
    ...l,
    nodeIds: l.nodeIds.filter(id => nodeIdSet.has(id))
  }))
  .filter(l => l.nodeIds.length > 0);

// Check for file nodes not in any layer
const assignedIds = new Set();
for (const layer of finalLayers) {
  for (const id of layer.nodeIds) {
    assignedIds.add(id);
  }
}
const unassigned = fileNodes.filter(n => !assignedIds.has(n.id));
if (unassigned.length > 0) {
  console.log(`Warning: ${unassigned.length} file nodes not in any layer:`, unassigned.map(n => n.id).slice(0, 10));
  // Add them to a misc layer
  finalLayers.push({
    id: 'layer:misc',
    name: '其他文件',
    description: '未归入特定架构层的文件。',
    nodeIds: unassigned.map(n => n.id)
  });
}

// Write layers.json
fs.writeFileSync(path.join(uaDir, 'intermediate', 'layers.json'), JSON.stringify(finalLayers, null, 2));
console.log(`layers.json: ${finalLayers.length} layers, ${finalLayers.reduce((s, l) => s + l.nodeIds.length, 0)} nodes assigned`);

// === TOUR ===
const tour = [
  {
    order: 1,
    title: '项目概览',
    description: '从 README 开始，了解 Zero 项目的目标：用纯 Python 还原 Claude Code CLI 的核心 Agent Runtime。包含完整架构图和核心数据流说明。',
    nodeIds: [getIdByPath('README.md')].filter(Boolean)
  },
  {
    order: 2,
    title: '程序入口',
    description: 'main.py 是整个 CLI 的入口点，负责 REPL 循环、模块组装、inbox polling。从这里开始追踪 agent 的启动流程。',
    nodeIds: [getIdByPath('cc/main.py'), getIdByPath('cc/__main__.py')].filter(Boolean)
  },
  {
    order: 3,
    title: 'QueryEngine — 统一运行时入口',
    description: 'QueryEngine 是整个 agent 运行时的统一入口，封装了 client/model/registry/prompt/permissions 的交互。理解它是理解整个系统的关键。',
    nodeIds: [getIdByPath('cc/core/query_engine.py'), getIdByPath('cc/core/events.py')].filter(Boolean)
  },
  {
    order: 4,
    title: 'Query Loop — Agent 状态机',
    description: 'query_loop 是 agent 的核心循环：发送消息 → 流式接收 → 工具执行 → 再发送。这是一个多轮 tool-use 循环，直到 end_turn。',
    nodeIds: [getIdByPath('cc/core/query_loop.py')].filter(Boolean)
  },
  {
    order: 5,
    title: 'API 客户端 — 与 Claude 通信',
    description: '流式调用 Anthropic API，处理流式响应中的 TextDelta/ToolUseBlock 事件。token_estimation 负责上下文窗口预算计算。',
    nodeIds: [getIdByPath('cc/api/claude.py'), getIdByPath('cc/api/client.py'), getIdByPath('cc/api/token_estimation.py')].filter(Boolean)
  },
  {
    order: 6,
    title: '数据模型 — 消息与内容块',
    description: '定义了 agent 交互的核心数据结构：消息类型、content blocks（text/tool_use/tool_result）、API 规范化逻辑。',
    nodeIds: [getIdByPath('cc/models/messages.py'), getIdByPath('cc/models/content_blocks.py')].filter(Boolean)
  },
  {
    order: 7,
    title: '工具系统 — 22 个内置工具',
    description: 'Tool 基类和 ToolRegistry 定义了工具的统一接口。每个工具实现独立的 execute 方法，通过 StreamingToolExecutor 在流式过程中并发执行。',
    nodeIds: [getIdByPath('cc/tools/base.py'), getIdByPath('cc/tools/bash/bash_tool.py'), getIdByPath('cc/tools/read/read_tool.py'), getIdByPath('cc/tools/edit/edit_tool.py')].filter(Boolean)
  },
  {
    order: 8,
    title: '权限系统 — 安全边界',
    description: 'PermissionMode 控制工具执行的安全级别（bypass/acceptEdits/default），规则引擎匹配工具调用与权限规则，非交互模式下 fail-fast。',
    nodeIds: [getIdByPath('cc/permissions/gate.py'), getIdByPath('cc/permissions/rules.py')].filter(Boolean)
  },
  {
    order: 9,
    title: 'System Prompt — 动态拼装',
    description: 'System Prompt 由多段文本动态拼装而成，包含工具描述、权限规则、Memory 行为指导。builder.py 负责组装，sections.py 定义各段内容。',
    nodeIds: [getIdByPath('cc/prompts/builder.py'), getIdByPath('cc/prompts/sections.py'), getIdByPath('cc/prompts/claudemd.py')].filter(Boolean)
  },
  {
    order: 10,
    title: '上下文压缩 — 长对话不崩',
    description: '当 token 数超限时，compact_messages 自动压缩对话历史，保留关键信息丢弃冗余内容。should_auto_compact 监控 token 预算。',
    nodeIds: [getIdByPath('cc/compact/compact.py')].filter(Boolean)
  },
  {
    order: 11,
    title: '记忆系统 — 跨会话上下文',
    description: '四类记忆分类（preference/project/feedback/temporary），MEMORY.md 索引自动更新，后台 ExtractionCoordinator 提取记忆。',
    nodeIds: [getIdByPath('cc/memory/session_memory.py'), getIdByPath('cc/memory/extractor.py')].filter(Boolean)
  },
  {
    order: 12,
    title: 'Agent Teams — 多 Agent 协调',
    description: 'Swarm 系统支持多 Agent 协作：identity 定义身份，mailbox 实现通信，in_process_runner 运行 Teammate，coordinator 编排任务。',
    nodeIds: [getIdByPath('cc/swarm/identity.py'), getIdByPath('cc/swarm/mailbox.py'), getIdByPath('cc/swarm/in_process_runner.py'), getIdByPath('cc/swarm/spawn.py')].filter(Boolean)
  },
  {
    order: 13,
    title: '会话持久化 — 状态保存与恢复',
    description: '会话保存/恢复机制，Task 状态快照，transcript 校验修复。确保 agent 可以在中断后从上次状态继续。',
    nodeIds: [getIdByPath('cc/session/storage.py'), getIdByPath('cc/session/history.py'), getIdByPath('cc/session/recovery.py')].filter(Boolean)
  },
  {
    order: 14,
    title: 'MCP 协议 — 外部工具接入',
    description: '通过 MCP stdio 协议接入外部工具服务，动态注册工具到 ToolRegistry，支持多 server 并行连接。',
    nodeIds: [getIdByPath('cc/mcp/client.py')].filter(Boolean)
  },
  {
    order: 15,
    title: '测试体系 — 498 个测试用例',
    description: '单元测试覆盖所有核心模块，集成测试验证端到端流程，E2E 测试需要真实 API key。',
    nodeIds: getIdsByDirPrefix('tests/unit').slice(0, 5).filter(Boolean)
  }
];

// Filter tour steps with no valid nodeIds
const finalTour = tour
  .map(t => ({
    ...t,
    nodeIds: t.nodeIds.filter(id => nodeIdSet.has(id))
  }))
  .filter(t => t.nodeIds.length > 0)
  .map((t, i) => ({ ...t, order: i + 1 }));

// Write tour.json
fs.writeFileSync(path.join(uaDir, 'intermediate', 'tour.json'), JSON.stringify(finalTour, null, 2));
console.log(`tour.json: ${finalTour.length} steps`);

// Print summary
console.log('\n=== Layers ===');
for (const l of finalLayers) {
  console.log(`  ${l.name}: ${l.nodeIds.length} nodes`);
}
console.log('\n=== Tour ===');
for (const t of finalTour) {
  console.log(`  ${t.order}. ${t.title} (${t.nodeIds.length} nodes)`);
}
