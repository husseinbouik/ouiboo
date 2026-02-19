const fs = require('fs');
try {
  const content = fs.readFileSync('build_output.txt', 'utf8');
  console.log(content);
} catch (err) {
  // try reading with different encoding if utf8 fails, but usually node handles it
  console.error(err);
}
