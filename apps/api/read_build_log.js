const fs = require('fs');
try {
  const content = fs.readFileSync('build.log', 'utf8');
  console.log(content);
} catch (err) {
  console.error(err);
}
