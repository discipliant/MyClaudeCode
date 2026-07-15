const fs = require('fs');
const path = require('path');

const uaDir = 'D:/program/AiLearning/MyClaudeCode/.ua';
const projectRoot = 'D:/program/AiLearning/MyClaudeCode';

// Get git commit hash
const { execSync } = require('child_process');
const gitHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

// Write meta.json
const meta = {
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash: gitHash,
  version: '1.0.0',
  analyzedFiles: 195
};
fs.writeFileSync(path.join(uaDir, 'meta.json'), JSON.stringify(meta, null, 2));
console.log('meta.json written:', JSON.stringify(meta));
