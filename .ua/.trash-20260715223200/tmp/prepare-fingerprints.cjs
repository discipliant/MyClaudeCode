const fs = require('fs');
const path = require('path');

const projectRoot = 'D:/program/AiLearning/MyClaudeCode';
const uaDir = path.join(projectRoot, '.ua');

// Get git commit hash
const { execSync } = require('child_process');
const gitHash = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

// Read scan result to get source file paths
const scanResult = JSON.parse(fs.readFileSync(path.join(uaDir, 'intermediate', 'scan-result.json'), 'utf8'));
const sourceFiles = scanResult.files.map(f => f.path);

// Write fingerprint input
const input = {
  projectRoot,
  sourceFilePaths: sourceFiles,
  gitCommitHash: gitHash
};

const inputPath = path.join(uaDir, 'intermediate', 'fingerprint-input.json');
fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
console.log(`Fingerprint input: ${sourceFiles.length} source files, git hash: ${gitHash}`);
