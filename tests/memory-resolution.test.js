#!/usr/bin/env node
// memory-resolution.test.js
// verifies session-context.js reads per-project memory from <project>/.atelier/memory/
// and never crashes on missing or malformed memory.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.resolve(__dirname, '..', 'scripts', 'hooks', 'session-context.js');
let fail = 0;

function runHook(input) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
  });
}

function check(name, cond, detail) {
  if (cond) {
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    fail++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function tmpProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'atelier-test-'));
}

console.log('\nmemory resolution');

// 1. project instincts are injected
{
  const proj = tmpProject();
  const memDir = path.join(proj, '.atelier', 'memory');
  fs.mkdirSync(memDir, { recursive: true });
  fs.writeFileSync(path.join(memDir, 'instincts.md'), '- unique-instinct-marker-xyz\n');
  const res = runHook({ prompt: 'hello there', cwd: proj });
  check('exit 0 with project memory', res.status === 0, `status ${res.status}`);
  check('project instincts injected', res.stdout.includes('unique-instinct-marker-xyz'), res.stdout.slice(0, 200));
  check('labeled as project memory', res.stdout.includes('.atelier/memory/instincts.md'));
}

// 2. no project memory -> silent pass-through
//    (plugin seed instincts.md still contains the template marker, so it is skipped)
{
  const proj = tmpProject();
  const res = runHook({ prompt: 'hello there', cwd: proj });
  check('exit 0 without project memory', res.status === 0, `status ${res.status}`);
  check('no injection without memory', res.stdout.trim() === '', res.stdout.slice(0, 200));
}

// 3. malformed memory (instincts.md is a directory) -> no crash, no injection
{
  const proj = tmpProject();
  fs.mkdirSync(path.join(proj, '.atelier', 'memory', 'instincts.md'), { recursive: true });
  const res = runHook({ prompt: 'hello there', cwd: proj });
  check('exit 0 with malformed memory', res.status === 0, `status ${res.status}`);
}

// 4. nonexistent cwd -> no crash
{
  const res = runHook({ prompt: 'hello there', cwd: '/nonexistent/path/atelier-xyz' });
  check('exit 0 with bogus cwd', res.status === 0, `status ${res.status}`);
}

// 5. project instincts still injected with a logs-only ~/.claude/atelier
//    (regression: findAtelierRoot() must not accept a dir that only has logs/)
{
  const tmpHome = tmpProject();
  fs.mkdirSync(path.join(tmpHome, '.claude', 'atelier', 'logs'), { recursive: true });
  const proj = tmpProject();
  fs.mkdirSync(path.join(proj, '.atelier', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.atelier', 'memory', 'instincts.md'), '- logs-only-marker\n');
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ source: 'startup', cwd: proj }),
    encoding: 'utf-8',
    env: { ...process.env, HOME: tmpHome },
  });
  check('exit 0 with logs-only ~/.claude/atelier', res.status === 0, `status ${res.status}`);
  check('project instincts injected despite logs-only atelier root', res.stdout.includes('logs-only-marker'), res.stdout.slice(0, 200));
}

// 6. bogus ATELIER_ROOT falls back to the repo: seed instincts are still the template, so silent
{
  const bogusRoot = tmpProject();
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ source: 'startup', cwd: '/nonexistent-xyz' }),
    encoding: 'utf-8',
    env: { ...process.env, ATELIER_ROOT: bogusRoot },
  });
  check('exit 0 with bogus ATELIER_ROOT', res.status === 0, `status ${res.status}`);
  check('silent when only the template seed exists', res.stdout.trim() === '', res.stdout.slice(0, 200));
}

// 7. emits SessionStart context, never UserPromptSubmit
{
  const proj = tmpProject();
  fs.mkdirSync(path.join(proj, '.atelier', 'memory'), { recursive: true });
  fs.writeFileSync(path.join(proj, '.atelier', 'memory', 'instincts.md'), '- event-marker\n');
  const res = runHook({ source: 'startup', cwd: proj });
  let out = null;
  try { out = JSON.parse(res.stdout); } catch (e) { /* reported below */ }
  check('hookEventName is SessionStart', out && out.hookSpecificOutput.hookEventName === 'SessionStart', res.stdout.slice(0, 200));
}

if (fail > 0) {
  console.log(`\n${fail} failure(s)`);
  process.exit(1);
}
console.log('\nall memory-resolution checks passed');
process.exit(0);
