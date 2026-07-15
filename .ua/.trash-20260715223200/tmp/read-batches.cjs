const b = require('D:/program/AiLearning/MyClaudeCode/.ua/intermediate/batches.json');
b.batches.forEach(batch => {
  const files = batch.files.map(f => f.path);
  console.log(`Batch ${batch.batchIndex}/${b.totalBatches}: ${batch.files.length} files, imports: ${Object.keys(batch.batchImportData||{}).length}, neighbors: ${Object.keys(batch.neighborMap||{}).length}`);
  console.log('  Files: ' + files.slice(0, 5).join(', ') + (files.length > 5 ? `, ... (+${files.length-5} more)` : ''));
});
