const { spawn } = require('child_process');
const child = spawn('npx', ['ts-node', '-T', '-r', 'tsconfig-paths/register', 'src/main.ts'], {
    cwd: process.cwd(),
    shell: true
});

child.stdout.on('data', (data) => {
    console.log(`STDOUT: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`STDERR: ${data}`);
});

child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});
