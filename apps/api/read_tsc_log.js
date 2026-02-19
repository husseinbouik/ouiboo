const fs = require('fs');
try {
  const content = fs.readFileSync('api_tsc.log', 'utf16le');
  const lines = content.split('\n');
  const errors = lines.filter(l => l.includes('error TS'));
  console.log(errors.join('\n').slice(0, 10000));
} catch (err) {
  console.error(err);
}
