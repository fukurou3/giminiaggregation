import fs from 'fs';

interface LogEntry {
  ipHash: string;
  ua: string;
  timestamp: string;
}

const logs: LogEntry[] = JSON.parse(fs.readFileSync('favorite-logs.json', 'utf-8'));
const counts = new Map<string, number>();
for (const entry of logs) {
  counts.set(entry.ipHash, (counts.get(entry.ipHash) || 0) + 1);
}
for (const [ipHash, count] of counts) {
  if (count > 100) {
    console.log(`suspicious: ${ipHash} -> ${count} requests`);
  }
}
