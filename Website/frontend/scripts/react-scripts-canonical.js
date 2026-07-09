const fs = require('fs');
const { spawn } = require('child_process');

const canonicalCwd = fs.realpathSync.native(process.cwd());

if (canonicalCwd !== process.cwd()) {
  process.chdir(canonicalCwd);
}

const reactScriptsBin = require.resolve('react-scripts/bin/react-scripts.js');
const child = spawn(process.execPath, [reactScriptsBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
