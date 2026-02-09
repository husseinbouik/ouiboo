const fs = require('fs');
const path = require('path');

const jestJson = path.resolve(process.cwd(), 'jest-results.json');
const outMd = path.resolve(process.cwd(), 'docs', 'TEST_REPORT.md');

function loadJson(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const results = loadJson(jestJson);
if (!results) {
  console.error('No jest-results.json found. Run jest with --json --outputFile=jest-results.json');
  process.exit(1);
}

const lines = [];
lines.push('# Test Summary Report');
lines.push('');
lines.push(`- Total tests: ${results.numTotalTests}`);
lines.push(`- Passed: ${results.numPassedTests}`);
lines.push(`- Failed: ${results.numFailedTests}`);
lines.push(`- Skipped: ${results.numPendingTests}`);
lines.push('');
if (results.testResults && results.testResults.length) {
  lines.push('## Failed Tests');
  results.testResults.forEach(tr => {
    tr.assertionResults.filter(a => a.status === 'failed').forEach(a => {
      lines.push(`- ${a.fullName} (${tr.name})`);
    });
  });
}

fs.mkdirSync(path.dirname(outMd), { recursive: true });
fs.writeFileSync(outMd, lines.join('\n'));
console.log('Test report written to', outMd);
