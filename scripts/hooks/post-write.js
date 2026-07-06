#!/usr/bin/env node
// post-write.js
// post-tool-use hook for Write and Edit. logs file writes to a session log so the
// operator can review what STUDIO touched.
//
// install:
//   {
//     "matcher": "Write|Edit|MultiEdit",
//     "hooks": [{ "type": "command", "command": "node /path/to/studio/scripts/hooks/post-write.js" }]
//   }
//
// log location: $STUDIO_LOG_DIR or ~/.claude/studio/logs/session-YYYY-MM-DD.log

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readHookInput, extractWriteContent } = require('./lib/io');

function getLogDir() {
  if (process.env.STUDIO_LOG_DIR) return process.env.STUDIO_LOG_DIR;
  return path.join(os.homedir(), '.claude', 'studio', 'logs');
}

function isoDate() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const input = readHookInput();
  if (!input) {
    process.exit(0);
  }

  const extracted = extractWriteContent(input);
  if (!extracted) {
    process.exit(0);
  }

  try {
    const dir = getLogDir();
    fs.mkdirSync(dir, { recursive: true });
    const logFile = path.join(dir, `session-${isoDate()}.log`);
    const ts = new Date().toISOString();
    const line = JSON.stringify({
      ts,
      tool: extracted.toolName,
      path: extracted.path,
      bytes: extracted.text.length,
    }) + '\n';
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // never let logging break the harness
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  process.exit(0);
}
