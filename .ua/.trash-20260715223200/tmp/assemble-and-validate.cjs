const fs = require('fs');
const path = require('path');

const uaDir = 'D:/program/AiLearning/MyClaudeCode/.ua';
const projectRoot = 'D:/program/AiLearning/MyClaudeCode';

// Read components
const assembledGraph = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'assembled-graph.json'), 'utf8'));
const layers = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'layers.json'), 'utf8'));
const tour = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'tour.json'), 'utf8'));

// Get git commit hash
const { execSync } = require('child_process');
const gitHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

// Assemble final KnowledgeGraph
const finalGraph = {
  version: '1.0.0',
  project: {
    name: 'cc-python-claude',
    languages: ['json', 'makefile', 'markdown', 'python', 'toml', 'unknown'],
    frameworks: ['pydantic', 'pytest'],
    description: '用纯 Python 还原 Claude Code CLI 的核心 Agent Runtime — 包含 Agent Loop 状态机、22 个内置工具、权限系统、System Prompt 动态拼装、Memory 记忆系统、MCP 协议、Hooks、Skills、Agent Teams/Swarm、上下文压缩等完整能力。',
    analyzedAt: new Date().toISOString(),
    gitCommitHash: gitHash
  },
  nodes: assembledGraph.nodes,
  edges: assembledGraph.edges,
  layers: layers,
  tour: tour
};

// Write to intermediate for validation
fs.writeFileSync(path.join(uaDir, 'intermediate', 'assembled-graph-final.json'), JSON.stringify(finalGraph, null, 2));
console.log('Assembled final graph:', finalGraph.nodes.length, 'nodes,', finalGraph.edges.length, 'edges,', finalGraph.layers.length, 'layers,', finalGraph.tour.length, 'tour steps');

// === Inline Validation ===
const issues = [];
const warnings = [];
const nodeIds = new Set();
const seen = new Map();

if (!Array.isArray(finalGraph.nodes)) { issues.push('graph.nodes is missing or not an array'); finalGraph.nodes = []; }
if (!Array.isArray(finalGraph.edges)) { issues.push('graph.edges is missing or not an array'); finalGraph.edges = []; }

finalGraph.nodes.forEach((n, i) => {
  if (!n.id) { issues.push(`Node[${i}] missing id`); return; }
  if (!n.type) issues.push(`Node[${i}] '${n.id}' missing type`);
  if (!n.name) issues.push(`Node[${i}] '${n.id}' missing name`);
  if (!n.summary) issues.push(`Node[${i}] '${n.id}' missing summary`);
  if (!n.tags || !n.tags.length) issues.push(`Node[${i}] '${n.id}' missing tags`);
  if (seen.has(n.id)) issues.push(`Duplicate node ID '${n.id}' at indices ${seen.get(n.id)} and ${i}`);
  else seen.set(n.id, i);
  nodeIds.add(n.id);
});

finalGraph.edges.forEach((e, i) => {
  if (!nodeIds.has(e.source)) issues.push(`Edge[${i}] source '${e.source}' not found`);
  if (!nodeIds.has(e.target)) issues.push(`Edge[${i}] target '${e.target}' not found`);
});

const fileLevelTypes = new Set(['file', 'config', 'document', 'service', 'pipeline', 'table', 'schema', 'resource', 'endpoint']);
const fileNodes = finalGraph.nodes.filter(n => fileLevelTypes.has(n.type)).map(n => n.id);
const assigned = new Map();

if (!Array.isArray(finalGraph.layers)) { issues.push('graph.layers is not an array'); finalGraph.layers = []; }
if (!Array.isArray(finalGraph.tour)) { issues.push('graph.tour is not an array'); finalGraph.tour = []; }

finalGraph.layers.forEach(layer => {
  (layer.nodeIds || []).forEach(id => {
    if (!nodeIds.has(id)) issues.push(`Layer '${layer.id}' refs missing node '${id}'`);
    if (assigned.has(id)) issues.push(`Node '${id}' appears in multiple layers`);
    assigned.set(id, layer.id);
  });
});

fileNodes.forEach(id => {
  if (!assigned.has(id)) issues.push(`File node '${id}' not in any layer`);
});

finalGraph.tour.forEach((step, i) => {
  (step.nodeIds || []).forEach(id => {
    if (!nodeIds.has(id)) issues.push(`Tour step[${i}] refs missing node '${id}'`);
  });
});

const withEdges = new Set([
  ...finalGraph.edges.map(e => e.source),
  ...finalGraph.edges.map(e => e.target)
]);

finalGraph.nodes.forEach(n => {
  if (!withEdges.has(n.id)) warnings.push(`Node '${n.id}' has no edges (orphan)`);
});

const stats = {
  totalNodes: finalGraph.nodes.length,
  totalEdges: finalGraph.edges.length,
  totalLayers: finalGraph.layers.length,
  tourSteps: finalGraph.tour.length,
  nodeTypes: finalGraph.nodes.reduce((a, n) => { a[n.type] = (a[n.type]||0)+1; return a; }, {}),
  edgeTypes: finalGraph.edges.reduce((a, e) => { a[e.type] = (a[e.type]||0)+1; return a; }, {})
};

const review = { issues, warnings, stats };
fs.writeFileSync(path.join(uaDir, 'intermediate', 'review.json'), JSON.stringify(review, null, 2));

console.log('\n=== Validation Results ===');
console.log('Issues:', issues.length);
if (issues.length > 0) {
  console.log('First 10 issues:', issues.slice(0, 10));
}
console.log('Warnings:', warnings.length);
if (warnings.length > 0) {
  console.log('First 5 warnings:', warnings.slice(0, 5));
}
console.log('Stats:', JSON.stringify(stats, null, 2));
