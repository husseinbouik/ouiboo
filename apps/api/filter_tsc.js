const fs = require('fs');
try {
  const content = fs.readFileSync('tsc_output.txt', 'utf8');
  const lines = content.split('\n');
  const filtered = lines.filter(line => line.includes('error TS') || line.includes('trips.service.ts') || line.includes('seeds.service.ts'));
  console.log(filtered.join('\n').slice(0, 2000));
} catch (err) {
  console.error(err);
}
