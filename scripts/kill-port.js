#!/usr/bin/env node
const { execSync } = require('child_process');
const os = require('os');

const port = process.argv[2];
if (!port) {
  console.error('Port number is required');
  process.exit(1);
}

try {
  if (os.platform() === 'win32') {
    const output = execSync(`netstat -ano | findstr :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    output.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const pid = trimmed.split(/\s+/).pop();
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
      } catch (e) {
        // ignore individual taskkill errors
      }
    });
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
  }
} catch (e) {
  // ignore errors when the port is not in use
}
