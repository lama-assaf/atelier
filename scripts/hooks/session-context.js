#!/usr/bin/env node
// session-context.js
// session-start hook. injects the project's instincts.md once, when a session starts
// (and again after /clear or compaction, which begin a fresh context).
//
// replaces prompt-context.js (user-prompt-submit), which re-sent instincts.md with
// every prompt and pasted whole skill files when a keyword appeared anywhere in the
// prompt. claude code already loads skills on demand from their descriptions, and the
// substring matcher fired mostly on false positives ("spec" in "specific",
// "experiment" in a folder path): 1,537 activations in 44 days, ~1.8 files each.
//
// install:
//   {
//     "hooks": [{ "type": "command", "command": "node /path/to/atelier/scripts/hooks/session-context.js" }]
//   }
//   under hooks.SessionStart in your claude code settings.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readHookInput } = require('./lib/io');

function isAtelierRoot(p) {
  try {
    return fs.existsSync(path.join(p, 'skills')) && fs.existsSync(path.join(p, 'memory'));
  } catch (e) {
    return false;
  }
}

function findAtelierRoot() {
  // env override, then ~/.claude/atelier — but only if they actually contain
  // plugin content (the logs dir alone also lives under ~/.claude/atelier)
  if (process.env.ATELIER_ROOT && isAtelierRoot(process.env.ATELIER_ROOT)) {
    return process.env.ATELIER_ROOT;
  }
  const claudeAtelier = path.join(os.homedir(), '.claude', 'atelier');
  if (isAtelierRoot(claudeAtelier)) return claudeAtelier;
  // fall back to two dirs up from this script (scripts/hooks/ -> root)
  return path.resolve(__dirname, '..', '..');
}

function findProjectDir(input) {
  const candidates = [];
  if (input && typeof input.cwd === 'string' && input.cwd) candidates.push(input.cwd);
  if (process.env.CLAUDE_PROJECT_DIR) candidates.push(process.env.CLAUDE_PROJECT_DIR);
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isDirectory()) return c;
    } catch (e) {
      // unreadable candidate — try the next one
    }
  }
  return null;
}

function readRelative(root, relPath) {
  try {
    const full = path.join(root, relPath);
    if (!fs.existsSync(full)) return null;
    const stat = fs.statSync(full);
    if (!stat.isFile()) return null;
    const text = fs.readFileSync(full, 'utf-8');
    // truncate huge files to first ~6000 chars
    return text.length > 6000 ? text.slice(0, 6000) + '\n\n[...truncated]' : text;
  } catch (e) {
    return null;
  }
}

function main() {
  const input = readHookInput() || {};

  // resolve instincts.md: per-project memory (.atelier/memory/instincts.md) first,
  // falling back to the plugin's seed copy (memory/instincts.md) if the project has
  // none. either way, skip it if it's still the unedited template —
  // heuristic: contains "delete these once you have your own".
  const projectDir = findProjectDir(input);
  let instinctsRel = null;
  let instinctsContent = null;
  if (projectDir) {
    const projInstincts = readRelative(projectDir, path.join('.atelier', 'memory', 'instincts.md'));
    if (projInstincts) {
      instinctsContent = projInstincts;
      instinctsRel = '.atelier/memory/instincts.md (project memory)';
    }
  }
  if (!instinctsContent) {
    instinctsContent = readRelative(findAtelierRoot(), 'memory/instincts.md');
    if (instinctsContent) instinctsRel = 'memory/instincts.md (atelier defaults)';
  }
  if (!instinctsContent) process.exit(0);
  const edited =
    !instinctsContent.includes('delete these once you have your own') ||
    // file has been edited substantially even if some example text remains
    instinctsContent.length > 1500;
  if (!edited) process.exit(0);

  const payload = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: `# atelier reference: ${instinctsRel}\n\n${instinctsContent}`,
    },
  };
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

try {
  main();
} catch (err) {
  process.exit(0);
}
