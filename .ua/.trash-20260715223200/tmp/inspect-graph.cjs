const fs = require('fs');
const path = require('path');

const uaDir = 'D:/program/AiLearning/MyClaudeCode/.ua';
const graph = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'assembled-graph.json'), 'utf8'));

// Stats
console.log('=== Assembled Graph Stats ===');
console.log('Nodes:', graph.nodes.length);
console.log('Edges:', graph.edges.length);
console.log('Node types:', JSON.stringify(graph.nodes.reduce((a, n) => { a[n.type] = (a[n.type]||0)+1; return a; }, {})));
console.log('Edge types:', JSON.stringify(graph.edges.reduce((a, e) => { a[e.type] = (a[e.type]||0)+1; return a; }, {})));

// File-level nodes (for layers and tour)
const fileLevelTypes = new Set(['file', 'config', 'document', 'service', 'pipeline', 'schema', 'resource', 'table', 'endpoint']);
const fileNodes = graph.nodes.filter(n => fileLevelTypes.has(n.type));
console.log('\nFile-level nodes:', fileNodes.length);

// Group by directory for layer assignment
const dirGroups = {};
for (const node of fileNodes) {
  const fp = node.filePath;
  if (!fp) continue;
  const parts = fp.replace(/\\/g, '/').split('/');
  let key;
  if (fp.startsWith('cc/')) {
    key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  } else if (fp.startsWith('tests/')) {
    key = parts.length > 2 ? `${parts[0]}/${parts[1]}` : 'tests';
  } else {
    key = parts.length > 1 ? parts[0] : 'root';
  }
  if (!dirGroups[key]) dirGroups[key] = [];
  dirGroups[key].push(node.id);
}

console.log('\n=== Directory Groups ===');
for (const [dir, ids] of Object.entries(dirGroups).sort()) {
  console.log(`${dir}: ${ids.length} nodes`);
}
