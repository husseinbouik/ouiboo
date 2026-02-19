const fs = require('fs');
try {
  const content = fs.readFileSync('tsc_plain.txt', 'utf8');
  console.log(content.slice(0, 5000)); // First 5000 chars should catch main errors
} catch (err) {
  console.error(err);
}
