const fs = require('fs');
const path = require('path');

const projectRoot = 'D:/program/AiLearning/MyClaudeCode';
const uaDir = path.join(projectRoot, '.ua');
const batchesPath = path.join(uaDir, 'intermediate', 'batches.json');
const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8'));

// Combine all batch files and import data into one input
const allFiles = [];
const allImportData = {};
for (const batch of batches.batches) {
  for (const f of batch.files) {
    allFiles.push(f);
  }
  if (batch.batchImportData) {
    Object.assign(allImportData, batch.batchImportData);
  }
}

const input = {
  projectRoot,
  batchFiles: allFiles,
  batchImportData: allImportData
};

const inputPath = path.join(uaDir, 'tmp', 'ua-file-analyzer-input-all.json');
fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
console.log(`Combined input: ${allFiles.length} files, ${Object.keys(allImportData).length} import entries`);
console.log(`Written to: ${inputPath}`);
