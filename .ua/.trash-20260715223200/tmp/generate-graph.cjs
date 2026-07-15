const fs = require('fs');
const path = require('path');

const projectRoot = 'D:/program/AiLearning/MyClaudeCode';
const uaDir = path.join(projectRoot, '.ua');
const extraction = JSON.parse(fs.readFileSync(path.join(uaDir, 'tmp', 'ua-file-extract-results-all.json'), 'utf8'));
const batches = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'batches.json'), 'utf8'));

// Build file-to-batch mapping and combined import data
const fileToBatch = {};
const allImportData = {};
for (const batch of batches.batches) {
  for (const f of batch.files) {
    fileToBatch[f.path] = batch.batchIndex;
  }
  if (batch.batchImportData) {
    Object.assign(allImportData, batch.batchImportData);
  }
}

// Module descriptions based on README architecture
const moduleDesc = {
  'cc/core': '核心运行时：QueryEngine 统一入口、query_loop 状态机、事件流',
  'cc/api': 'Anthropic API 客户端：流式调用、客户端管理、token 统计',
  'cc/models': '数据模型：消息类型、content blocks、API 规范化',
  'cc/prompts': 'System Prompt：多段动态拼装 + Coordinator/Teammate 提示词',
  'cc/tools': '22 个内置工具实现 + StreamingToolExecutor + 权限门控',
  'cc/permissions': '权限系统：PermissionMode + 规则引擎 + 非交互语义',
  'cc/swarm': 'Agent Teams：身份、Mailbox、TeamFile、InProcessTeammate、Coordinator',
  'cc/compact': '上下文压缩：token 预算监控、摘要生成',
  'cc/memory': '记忆系统：加载/保存/提取/索引/ExtractionCoordinator',
  'cc/mcp': 'MCP 协议：stdio 客户端、工具桥接',
  'cc/hooks': 'Hooks 系统：配置加载、PreToolUse/PostToolUse 拦截',
  'cc/skills': 'Skills 系统：定义加载、slash 命令触发、prompt 注入',
  'cc/session': '会话管理：持久化、TaskRegistry、transcript recovery',
  'cc/commands': 'Slash 命令：/clear /compact /model /help /cost',
  'cc/ui': '终端渲染：Rich 流式输出',
  'cc/utils': '通用工具函数：错误处理等',
};

// Tag heuristics by path pattern
function getTagsForFile(filePath, language, fileCategory, extractionResult) {
  const tags = [];
  const baseName = path.basename(filePath);
  const dirName = path.dirname(filePath);

  // Category-based tags
  if (fileCategory === 'docs') tags.push('documentation');
  if (fileCategory === 'config') tags.push('configuration');
  if (fileCategory === 'infra') tags.push('infrastructure');

  // Test files
  if (filePath.includes('test_') || filePath.includes('/tests/')) tags.push('test');

  // Entry points and barrels
  if (baseName === '__init__.py') tags.push('barrel');
  if (baseName === '__main__.py') tags.push('entry-point');
  if (baseName === 'main.py') tags.push('entry-point');
  if (baseName === 'README.md') { tags.push('documentation', 'entry-point'); }

  // Module-specific tags
  if (dirName.includes('cc/api')) tags.push('api-handler');
  if (dirName.includes('cc/core')) tags.push('service', 'event-handler');
  if (dirName.includes('cc/tools')) tags.push('utility', 'tool');
  if (dirName.includes('cc/models')) tags.push('data-model', 'type-definition');
  if (dirName.includes('cc/prompts')) tags.push('factory');
  if (dirName.includes('cc/permissions')) tags.push('validation', 'security');
  if (dirName.includes('cc/swarm')) tags.push('service', 'event-handler');
  if (dirName.includes('cc/memory')) tags.push('serialization');
  if (dirName.includes('cc/compact')) tags.push('utility');
  if (dirName.includes('cc/mcp')) tags.push('middleware', 'api-handler');
  if (dirName.includes('cc/hooks')) tags.push('hook', 'middleware');
  if (dirName.includes('cc/skills')) tags.push('hook');
  if (dirName.includes('cc/session')) tags.push('serialization');
  if (dirName.includes('cc/commands')) tags.push('event-handler');
  if (dirName.includes('cc/ui')) tags.push('component');
  if (dirName.includes('cc/utils')) tags.push('utility');

  // Export-based tags
  if (extractionResult) {
    if (extractionResult.exports?.length > 0 && extractionResult.functions?.length === 0 && extractionResult.classes?.length === 0) {
      if (!tags.includes('barrel')) tags.push('barrel');
    }
  }

  // Ensure 3-5 tags
  if (tags.length < 3) {
    tags.push('code');
  }
  if (tags.length > 5) {
    return tags.slice(0, 5);
  }
  // Deduplicate
  return [...new Set(tags)].slice(0, 5);
}

// Generate summary based on file path and structural data
function getSummaryForFile(filePath, language, fileCategory, extractionResult) {
  const baseName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  const relDir = dirName.replace(/\\/g, '/');

  // Non-code files
  if (fileCategory === 'docs') {
    if (baseName === 'README.md') return '项目说明文档，介绍 Zero — 用纯 Python 还原 Claude Code CLI 的核心 Agent Runtime，包含架构说明、快速开始指南和能力清单。';
    return '项目文档文件。';
  }
  if (fileCategory === 'config') {
    if (baseName === 'pyproject.toml') return 'Python 项目配置，定义依赖（anthropic、pydantic、click、rich）、构建系统（hatchling）和工具链（ruff、mypy、pytest）。';
    if (baseName.endsWith('.json')) return 'JSON 配置文件。';
    if (baseName === '.env') return '环境变量配置，包含 API 密钥等敏感信息。';
    return '项目配置文件。';
  }
  if (fileCategory === 'infra') {
    if (baseName === 'Makefile') return 'Make 构建脚本，定义项目的常用命令（测试、检查等）。';
    return '基础设施配置文件。';
  }

  // __init__.py files
  if (baseName === '__init__.py') {
    // Check if it has exports
    const exports = extractionResult?.exports?.length || 0;
    if (exports > 0) {
      return `Python 包文件，导出 ${exports} 个模块符号，作为 ${relDir} 包的入口点。`;
    }
    return `Python 包文件，标记 ${relDir} 为 Python 包。`;
  }

  // __main__.py
  if (baseName === '__main__.py') {
    return 'Python 模块入口，支持 `python -m cc` 方式启动 CLI。';
  }

  // main.py
  if (baseName === 'main.py' && relDir === 'cc') {
    return '程序主入口：REPL 循环、模块组装、inbox polling，负责初始化 QueryEngine 并运行交互式 agent loop。';
  }

  // Test files
  if (filePath.includes('test_')) {
    const testSubject = baseName.replace(/^test_/, '').replace(/\.py$/, '');
    return `单元测试文件，测试 ${testSubject} 相关功能。`;
  }
  if (filePath.includes('/tests/')) {
    return '测试文件。';
  }

  // Code files - use module description + specific file info
  const moduleKey = Object.keys(moduleDesc).find(k => relDir.startsWith(k));
  const moduleSummary = moduleKey ? moduleDesc[moduleKey] : '';

  // Use function/class names to make summary more specific
  const fns = extractionResult?.functions?.map(f => f.name) || [];
  const cls = extractionResult?.classes?.map(c => c.name) || [];
  const exports = extractionResult?.exports?.map(e => e.name) || [];

  if (cls.length > 0 && fns.length > 0) {
    return `${moduleSummary}。定义了 ${cls.join('、')} 等类和 ${fns.slice(0, 3).join('、')} 等函数。`;
  }
  if (cls.length > 0) {
    return `${moduleSummary}。核心类：${cls.join('、')}。`;
  }
  if (fns.length > 0) {
    return `${moduleSummary}。核心函数：${fns.slice(0, 5).join('、')}。`;
  }
  if (exports.length > 0) {
    return `${moduleSummary}。导出：${exports.slice(0, 5).join('、')}。`;
  }

  return `${moduleSummary || '项目源文件'}。`;
}

// Generate summary for functions
function getSummaryForFunction(fn, filePath) {
  const dirName = path.dirname(filePath);
  const relDir = dirName.replace(/\\/g, '/');
  const moduleKey = Object.keys(moduleDesc).find(k => relDir.startsWith(k));
  const moduleSummary = moduleKey ? moduleDesc[moduleKey].split('：')[0] : '';

  const lineCount = fn.endLine - fn.startLine;
  if (lineCount > 100) {
    return `${moduleSummary} 中的核心函数 ${fn.name}，实现关键业务逻辑（${lineCount} 行）。`;
  }
  return `${moduleSummary} 中的 ${fn.name} 函数，处理 ${fn.params?.join('、') || '相关参数'}。`;
}

// Generate summary for classes
function getSummaryForClass(cls, filePath) {
  const dirName = path.dirname(filePath);
  const relDir = dirName.replace(/\\/g, '/');
  const moduleKey = Object.keys(moduleDesc).find(k => relDir.startsWith(k));
  const moduleSummary = moduleKey ? moduleDesc[moduleKey].split('：')[0] : '';

  const methods = cls.methods || [];
  if (methods.length > 5) {
    return `${moduleSummary} 中的 ${cls.name} 类，提供 ${methods.length} 个方法：${methods.slice(0, 5).join('、')} 等。`;
  }
  return `${moduleSummary} 中的 ${cls.name} 类${methods.length > 0 ? `，包含 ${methods.join('、')} 方法` : ''}。`;
}

// Determine complexity
function getComplexity(nonEmptyLines, metrics) {
  if (nonEmptyLines < 50) return 'simple';
  if (nonEmptyLines < 200) return 'moderate';
  return 'complex';
}

// Node type mapping
function getNodeType(fileCategory, language, filePath) {
  if (fileCategory === 'config') return 'config';
  if (fileCategory === 'docs') return 'document';
  if (fileCategory === 'infra') {
    if (filePath.includes('.github/workflows') || filePath.includes('.gitlab-ci') || filePath === 'Jenkinsfile') return 'pipeline';
    if (filePath.endsWith('.tf') || filePath.endsWith('.tfvars')) return 'resource';
    return 'service';
  }
  if (fileCategory === 'data') {
    if (filePath.endsWith('.graphql') || filePath.endsWith('.proto') || filePath.endsWith('.prisma')) return 'schema';
    if (filePath.endsWith('.sql')) return 'table';
    return 'endpoint';
  }
  return 'file'; // code, script, markup
}

// Determine if a function is significant (10+ lines or exported)
function isSignificantFunction(fn, exports) {
  const lineCount = fn.endLine - fn.startLine;
  if (lineCount >= 10) return true;
  if (exports && exports.some(e => e.name === fn.name)) return true;
  return false;
}

// Determine if a class is significant (2+ methods or 20+ lines or exported)
function isSignificantClass(cls, exports) {
  if ((cls.methods?.length || 0) >= 2) return true;
  if (cls.endLine - cls.startLine >= 20) return true;
  if (exports && exports.some(e => e.name === cls.name)) return true;
  return false;
}

// Build nodes and edges
const allNodes = [];
const allEdges = [];
const nodeIds = new Set();

// Track which files are test files and what they test
const testFiles = new Set();
const prodFiles = new Set();

for (const result of extraction.results) {
  const { path: filePath, language, fileCategory, totalLines, nonEmptyLines, functions, classes, exports, metrics } = result;

  // Create file-level node
  const nodeType = getNodeType(fileCategory, language, filePath);
  const nodeId = `${nodeType}:${filePath}`;
  const baseName = path.basename(filePath);

  const fileNode = {
    id: nodeId,
    type: nodeType,
    name: baseName,
    filePath: filePath,
    summary: getSummaryForFile(filePath, language, fileCategory, result),
    tags: getTagsForFile(filePath, language, fileCategory, result),
    complexity: getComplexity(nonEmptyLines, metrics)
  };

  allNodes.push(fileNode);
  nodeIds.add(nodeId);

  // Track test vs prod
  if (filePath.includes('test_') || filePath.includes('/tests/')) {
    testFiles.add(filePath);
  } else if (fileCategory === 'code') {
    prodFiles.add(filePath);
  }

  // Create function nodes for significant functions
  if (functions && fileCategory === 'code') {
    for (const fn of functions) {
      if (isSignificantFunction(fn, exports)) {
        const fnNodeId = `function:${filePath}:${fn.name}`;
        if (nodeIds.has(fnNodeId)) continue;
        nodeIds.add(fnNodeId);

        allNodes.push({
          id: fnNodeId,
          type: 'function',
          name: fn.name,
          filePath: filePath,
          lineRange: [fn.startLine, fn.endLine],
          summary: getSummaryForFunction(fn, filePath),
          tags: getTagsForFile(filePath, language, fileCategory, result).slice(0, 3),
          complexity: getComplexity(fn.endLine - fn.startLine, null)
        });

        // contains edge: file -> function
        allEdges.push({
          source: nodeId,
          target: fnNodeId,
          type: 'contains',
          direction: 'forward',
          weight: 1.0
        });

        // exports edge: file -> function (if exported)
        if (exports && exports.some(e => e.name === fn.name)) {
          allEdges.push({
            source: nodeId,
            target: fnNodeId,
            type: 'exports',
            direction: 'forward',
            weight: 0.8
          });
        }
      }
    }
  }

  // Create class nodes for significant classes
  if (classes && fileCategory === 'code') {
    for (const cls of classes) {
      if (isSignificantClass(cls, exports)) {
        const clsNodeId = `class:${filePath}:${cls.name}`;
        if (nodeIds.has(clsNodeId)) continue;
        nodeIds.add(clsNodeId);

        allNodes.push({
          id: clsNodeId,
          type: 'class',
          name: cls.name,
          filePath: filePath,
          lineRange: [cls.startLine, cls.endLine],
          summary: getSummaryForClass(cls, filePath),
          tags: getTagsForFile(filePath, language, fileCategory, result).slice(0, 3),
          complexity: getComplexity(cls.endLine - cls.startLine, null)
        });

        // contains edge: file -> class
        allEdges.push({
          source: nodeId,
          target: clsNodeId,
          type: 'contains',
          direction: 'forward',
          weight: 1.0
        });

        // exports edge: file -> class (if exported)
        if (exports && exports.some(e => e.name === cls.name)) {
          allEdges.push({
            source: nodeId,
            target: clsNodeId,
            type: 'exports',
            direction: 'forward',
            weight: 0.8
          });
        }
      }
    }
  }
}

// Create import edges from batchImportData
for (const [filePath, imports] of Object.entries(allImportData)) {
  if (!Array.isArray(imports)) continue;

  // Determine source node type
  const fileResult = extraction.results.find(r => r.path === filePath);
  if (!fileResult) continue;

  const srcNodeType = getNodeType(fileResult.fileCategory, fileResult.language, filePath);
  const srcNodeId = `${srcNodeType}:${filePath}`;

  for (const importPath of imports) {
    if (importPath === filePath) continue; // skip self-references

    // Determine target node type
    const importResult = extraction.results.find(r => r.path === importPath);
    if (!importResult) continue;

    const tgtNodeType = getNodeType(importResult.fileCategory, importResult.language, importPath);
    const tgtNodeId = `${tgtNodeType}:${importPath}`;

    allEdges.push({
      source: srcNodeId,
      target: tgtNodeId,
      type: 'imports',
      direction: 'forward',
      weight: 0.7
    });
  }
}

// Create tested_by edges (production file -> test file)
// Match test files to production files by naming convention
for (const testFile of testFiles) {
  // test files: tests/unit/module/test_foo.py -> cc/module/foo.py
  const match = testFile.match(/^tests\/(?:unit|integration|e2e)\/(.+)\/test_(.+)\.py$/);
  if (match) {
    const modulePath = match[1];
    const testSubject = match[2];
    // Try to find the production file
    const prodPath = `cc/${modulePath}/${testSubject}.py`;
    if (prodFiles.has(prodPath)) {
      const prodResult = extraction.results.find(r => r.path === prodPath);
      const testResult = extraction.results.find(r => r.path === testFile);
      if (prodResult && testResult) {
        const prodNodeType = getNodeType(prodResult.fileCategory, prodResult.language, prodPath);
        const testNodeType = getNodeType(testResult.fileCategory, testResult.language, testFile);
        allEdges.push({
          source: `${prodNodeType}:${prodPath}`,
          target: `${testNodeType}:${testFile}`,
          type: 'tested_by',
          direction: 'forward',
          weight: 0.5
        });
      }
    }
  }
}

// Non-code edges
for (const result of extraction.results) {
  const { path: filePath, fileCategory } = result;
  const nodeType = getNodeType(fileCategory, result.language, filePath);
  const nodeId = `${nodeType}:${filePath}`;

  if (fileCategory === 'docs' && filePath === 'README.md') {
    // README documents the main entry point
    if (nodeIds.has('file:cc/main.py')) {
      allEdges.push({ source: nodeId, target: 'file:cc/main.py', type: 'documents', direction: 'forward', weight: 0.5 });
    }
    // README documents the package init
    if (nodeIds.has('file:cc/__init__.py')) {
      allEdges.push({ source: nodeId, target: 'file:cc/__init__.py', type: 'documents', direction: 'forward', weight: 0.5 });
    }
  }

  if (fileCategory === 'config') {
    if (filePath === 'pyproject.toml') {
      // Configures the whole project
      if (nodeIds.has('file:cc/main.py')) {
        allEdges.push({ source: nodeId, target: 'file:cc/main.py', type: 'configures', direction: 'forward', weight: 0.6 });
      }
    }
  }

  if (fileCategory === 'infra' && filePath === 'Makefile') {
    // Makefile triggers tests
    if (nodeIds.has('file:cc/main.py')) {
      allEdges.push({ source: nodeId, target: 'file:cc/main.py', type: 'related', direction: 'forward', weight: 0.5 });
    }
  }
}

// Remove duplicate edges
const edgeSet = new Set();
const uniqueEdges = allEdges.filter(e => {
  const key = `${e.source}|${e.target}|${e.type}`;
  if (edgeSet.has(key)) return false;
  edgeSet.add(key);
  return true;
});

// Remove self-referencing edges
const finalEdges = uniqueEdges.filter(e => e.source !== e.target);

// Group nodes and edges by batch
const batchData = {};
for (const node of allNodes) {
  const fp = node.filePath;
  if (!fp) continue;
  const batchIdx = fileToBatch[fp];
  if (batchIdx === undefined) continue;
  if (!batchData[batchIdx]) batchData[batchIdx] = { nodes: [], edges: [] };
  batchData[batchIdx].nodes.push(node);
}

// Assign edges to batches based on source node's file
for (const edge of finalEdges) {
  // Find which batch the source node belongs to
  const sourcePath = edge.source.replace(/^(file|function|class|config|document|service|pipeline|schema|resource|table|endpoint):/, '').replace(/:.+$/, '');
  const batchIdx = fileToBatch[sourcePath];
  if (batchIdx !== undefined && batchData[batchIdx]) {
    batchData[batchIdx].edges.push(edge);
  } else {
    // Try to find by looking at all nodes
    for (const [idx, data] of Object.entries(batchData)) {
      if (data.nodes.some(n => n.id === edge.source)) {
        data.edges.push(edge);
        break;
      }
    }
  }
}

// Write batch files
let totalNodes = 0;
let totalEdges = 0;
for (const [batchIdx, data] of Object.entries(batchData)) {
  const filePath = path.join(uaDir, 'intermediate', `batch-${batchIdx}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  totalNodes += data.nodes.length;
  totalEdges += data.edges.length;
  console.log(`batch-${batchIdx}.json: ${data.nodes.length} nodes, ${data.edges.length} edges`);
}

console.log(`\nTotal: ${totalNodes} nodes, ${totalEdges} edges`);
console.log(`Node types: ${JSON.stringify(allNodes.reduce((a, n) => { a[n.type] = (a[n.type]||0)+1; return a; }, {}))}`);
console.log(`Edge types: ${JSON.stringify(finalEdges.reduce((a, e) => { a[e.type] = (a[e.type]||0)+1; return a; }, {}))}`);
