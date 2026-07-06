#!/usr/bin/env node
// memory-resolution.test.js
// verifies prompt-context.js reads per-project memory from <project>/.atelier/memory/
// and never crashes on missing or malformed memory.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.resolve(__dirname, '..', 'scripts', 'hooks', 'prompt-context.js');
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

// 2. no project memory, no keywords -> silent pass-through
//    (plugin seed instincts.md still contains the template marker, so it is skipped)
{
  const proj = tmpProject();
  const res = runHook({ prompt: 'hello there', cwd: proj });
  check('exit 0 without project memory', res.status === 0, `status ${res.status}`);
  check('no injection without memory or keywords', res.stdout.trim() === '', res.stdout.slice(0, 200));
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

// 5. keyword injection survives a logs-only ~/.claude/atelier
//    (regression: findAtelierRoot() must not accept a dir that only has logs/)
{
  const tmpHome = tmpProject();
  fs.mkdirSync(path.join(tmpHome, '.claude', 'atelier', 'logs'), { recursive: true });
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt: 'design review of the header', cwd: '/nonexistent-xyz' }),
    encoding: 'utf-8',
    env: { ...process.env, HOME: tmpHome },
  });
  check('exit 0 with logs-only ~/.claude/atelier', res.status === 0, `status ${res.status}`);
  check(
    'keyword reference injected despite logs-only atelier root',
    res.stdout.includes('skills/design-review/SKILL.md'),
    res.stdout.slice(0, 200)
  );
}

// 6. bogus ATELIER_ROOT falls back to the repo
{
  const bogusRoot = tmpProject();
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ prompt: 'design review of the header', cwd: '/nonexistent-xyz' }),
    encoding: 'utf-8',
    env: { ...process.env, ATELIER_ROOT: bogusRoot },
  });
  check('exit 0 with bogus ATELIER_ROOT', res.status === 0, `status ${res.status}`);
  check(
    'keyword reference injected via fallback to repo root',
    res.stdout.includes('skills/design-review/SKILL.md'),
    res.stdout.slice(0, 200)
  );
}

if (fail > 0) {
  console.log(`\n${fail} failure(s)`);
  process.exit(1);
}
console.log('\nall memory-resolution checks passed');
process.exit(0);
