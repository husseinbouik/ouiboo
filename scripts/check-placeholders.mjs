import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLACEHOLDERS = [
  'Dashboard.png',
  'logo-placeholder',
  'lorem ipsum',
  'John Doe',
  'Maria S.',
  'David L.',
  'Chen W.',
  'replace-me',
  'change-me',
];

const IGNORE_DIRS = [
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  '.git',
  'scripts', // Ignore our own script
];

const IGNORE_FILES = [
  '.env.example',
  'README.md',
];

function scanDir(dir, found = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        scanDir(fullPath, found);
      }
    } else {
      if (!IGNORE_FILES.includes(file)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const placeholder of PLACEHOLDERS) {
          if (content.includes(placeholder)) {
            found.push({ file: fullPath, placeholder });
          }
        }
      }
    }
  }
  return found;
}

export function checkPlaceholders() {
  console.log('🔍 Scanning for placeholders...');
  const rootDir = path.join(__dirname, '..');
  const appsDir = path.join(rootDir, 'apps');
  const packagesDir = path.join(rootDir, 'packages');
  
  const results = [...scanDir(appsDir), ...scanDir(packagesDir)];
  
  if (results.length > 0) {
    console.error('❌ Found placeholders:');
    results.forEach((res) => {
      console.error(`   - ${res.placeholder} in ${res.file}`);
    });
    return false;
  }
  
  console.log('✅ No placeholders found.');
  return true;
}

if (process.argv[1] === __filename) {
  if (!checkPlaceholders()) {
    process.exit(1);
  }
}
