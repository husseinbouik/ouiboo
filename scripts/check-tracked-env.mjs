import { execFileSync } from 'node:child_process';

const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
}).split('\0').filter(Boolean);

const trackedEnvironmentFiles = trackedFiles.filter((file) => {
  const normalized = file.replaceAll('\\', '/');
  const name = normalized.split('/').pop() || '';
  return /^\.env(?:\..+)?$/.test(name) && !name.endsWith('.example');
});

if (trackedEnvironmentFiles.length > 0) {
  console.error('❌ Environment files must not be tracked by Git:');
  for (const file of trackedEnvironmentFiles) {
    console.error(`   - ${file}`);
  }
  console.error('Rotate exposed credentials, remove these files from Git tracking, and purge them from repository history.');
  process.exit(1);
}

console.log('✅ No environment files are tracked by Git.');
