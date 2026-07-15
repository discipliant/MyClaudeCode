const fs = require('fs');
const result = JSON.parse(fs.readFileSync('D:/program/AiLearning/MyClaudeCode/.ua/tmp/ua-file-extract-results-all.json', 'utf8'));
console.log('scriptCompleted:', result.scriptCompleted);
console.log('filesAnalyzed:', result.filesAnalyzed);
console.log('filesSkipped:', JSON.stringify(result.filesSkipped));
console.log('results count:', result.results.length);
console.log('\n=== Sample results (first 5) ===');
for (let i = 0; i < Math.min(5, result.results.length); i++) {
  const r = result.results[i];
  console.log(`\n[${i}] ${r.path} (${r.language}, ${r.totalLines} lines, ${r.nonEmptyLines} non-empty)`);
  console.log(`  functions: ${r.functions?.length || 0}, classes: ${r.classes?.length || 0}, exports: ${r.exports?.length || 0}`);
  if (r.functions?.length) console.log(`  fn names: ${r.functions.map(f=>f.name).slice(0,5).join(', ')}`);
  if (r.classes?.length) console.log(`  cls names: ${r.classes.map(c=>c.name).slice(0,5).join(', ')}`);
  console.log(`  metrics: ${JSON.stringify(r.metrics)}`);
}
console.log('\n=== Files with most functions ===');
const sorted = [...result.results].sort((a,b) => (b.functions?.length||0) - (a.functions?.length||0));
for (let i = 0; i < 10; i++) {
  const r = sorted[i];
  console.log(`  ${r.path}: ${r.functions?.length||0} functions, ${r.classes?.length||0} classes`);
}
