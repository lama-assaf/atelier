#!/usr/bin/env node
// run-all.js
// STUDIO test runner. validates every part of the repo:
//   - all JSON files parse
//   - every agent/skill/command has valid markdown frontmatter
//   - every skill folder has exactly SKILL.md
//   - hooks scripts run cleanly on representative inputs
//   - adapter install scripts have correct shebangs and are executable
//   - no broken cross-references between skills/commands/rules
//
// usage: node tests/run-all.js [--verbose]
// exit 0 = all pass, 1 = failures

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');

let pass = 0;
let fail = 0;
const failures = [];

function ok(name) {
  pass++;
  if (VERBOSE) console.log(`  \x1b[32m✓\x1b[0m ${name}`);
}

function err(name, detail) {
  fail++;
  failures.push({ name, detail });
  console.log(`  \x1b[31m✗\x1b[0m ${name}`);
  if (detail) console.log(`      ${detail}`);
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function walkFiles(dir, pattern) {
  const out = [];
  function walk(d) {
    if (!fs.existsSync(d)) return;
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile() && pattern.test(ent.name)) out.push(full);
    }
  }
  walk(dir);
  return out;
}

function parseFrontmatter(text, filePath) {
  if (!text.startsWith('---\n')) {
    return { ok: false, error: 'no frontmatter delimiter at start' };
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    return { ok: false, error: 'no closing frontmatter delimiter' };
  }
  const block = text.slice(4, end);
  const fields = {};
  const lines = block.split('\n');
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim();
    const v = line.slice(colon + 1).trim();
    fields[k] = v;
  }
  return { ok: true, fields, body: text.slice(end + 5) };
}

// ============================================================
// 1. JSON files parse
// ============================================================
section('JSON files');

const jsonFiles = walkFiles(ROOT, /\.json$/).filter((p) => !p.includes('node_modules'));
for (const f of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(f, 'utf-8'));
    ok(`parse ${path.relative(ROOT, f)}`);
  } catch (e) {
    err(`parse ${path.relative(ROOT, f)}`, e.message);
  }
}

// ============================================================
// 2. plugin.json has required fields
// ============================================================
section('plugin manifest');

try {
  const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf-8'));
  for (const field of ['name', 'version', 'description', 'author']) {
    if (plugin[field]) ok(`plugin.json has ${field}`);
    else err(`plugin.json has ${field}`, `missing required field`);
  }
} catch (e) {
  err('plugin.json readable', e.message);
}

// ============================================================
// 3. agents: frontmatter + required fields
// ============================================================
section('agents');

const agentsDir = path.join(ROOT, 'agents');
const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
ok(`agent count = ${agentFiles.length}`);

for (const af of agentFiles) {
  const full = path.join(agentsDir, af);
  const text = fs.readFileSync(full, 'utf-8');
  const fm = parseFrontmatter(text, full);
  if (!fm.ok) {
    err(`agent ${af}`, fm.error);
    continue;
  }
  const expected = ['name', 'description', 'tools', 'model'];
  const missing = expected.filter((k) => !fm.fields[k]);
  if (missing.length === 0) ok(`agent ${af} frontmatter complete`);
  else err(`agent ${af} frontmatter`, `missing: ${missing.join(', ')}`);

  // name in frontmatter matches filename
  const expectedName = af.replace(/\.md$/, '');
  if (fm.fields.name === expectedName) ok(`agent ${af} name matches filename`);
  else err(`agent ${af} name`, `frontmatter name "${fm.fields.name}" != filename "${expectedName}"`);

  // body is non-trivial
  if (fm.body.trim().length > 200) ok(`agent ${af} has substantive body`);
  else err(`agent ${af} body`, `body too short: ${fm.body.trim().length} chars`);
}

// ============================================================
// 4. skills: each is a directory with SKILL.md, valid frontmatter
// ============================================================
section('skills');

const skillsDir = path.join(ROOT, 'skills');
const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
ok(`skill count = ${skillDirs.length}`);

for (const sd of skillDirs) {
  const skillFile = path.join(skillsDir, sd, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    err(`skill ${sd}`, 'missing SKILL.md');
    continue;
  }
  const text = fs.readFileSync(skillFile, 'utf-8');
  const fm = parseFrontmatter(text, skillFile);
  if (!fm.ok) {
    err(`skill ${sd}/SKILL.md`, fm.error);
    continue;
  }
  if (fm.fields.name && fm.fields.description) {
    ok(`skill ${sd} frontmatter complete`);
  } else {
    err(`skill ${sd} frontmatter`, `missing name or description`);
  }
  if (fm.fields.name === sd) {
    ok(`skill ${sd} name matches dir`);
  } else {
    err(`skill ${sd} name`, `frontmatter name "${fm.fields.name}" != dir "${sd}"`);
  }
  if (fm.body.trim().length > 300) ok(`skill ${sd} has substantive body`);
  else err(`skill ${sd} body`, `body too short: ${fm.body.trim().length} chars`);
}

// ============================================================
// 5. commands: frontmatter with name + description
// ============================================================
section('commands');

const commandsDir = path.join(ROOT, 'commands');
const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
ok(`command count = ${commandFiles.length}`);

for (const cf of commandFiles) {
  const full = path.join(commandsDir, cf);
  const text = fs.readFileSync(full, 'utf-8');
  const fm = parseFrontmatter(text, full);
  if (!fm.ok) {
    err(`command ${cf}`, fm.error);
    continue;
  }
  if (fm.fields.name && fm.fields.description) {
    ok(`command ${cf} frontmatter complete`);
  } else {
    err(`command ${cf} frontmatter`, `missing name or description`);
  }
  const expectedName = cf.replace(/\.md$/, '');
  if (fm.fields.name === expectedName) {
    ok(`command ${cf} name matches filename`);
  } else {
    err(`command ${cf} name`, `frontmatter name "${fm.fields.name}" != filename "${expectedName}"`);
  }
}

// ============================================================
// 6. rules: every file has body content
// ============================================================
section('rules');

const ruleFiles = walkFiles(path.join(ROOT, 'rules'), /\.md$/);
ok(`rule file count = ${ruleFiles.length}`);
for (const rf of ruleFiles) {
  const text = fs.readFileSync(rf, 'utf-8');
  const rel = path.relative(ROOT, rf);
  if (text.trim().length > 100) {
    ok(`rule ${rel} non-trivial`);
  } else {
    err(`rule ${rel}`, `body too short: ${text.trim().length} chars`);
  }
}

// ============================================================
// 7. hook scripts: pre-write executes cleanly on representative inputs
// ============================================================
section('hooks');

const HOOKS_DIR = path.join(ROOT, 'scripts/hooks');
for (const hookFile of ['pre-write.js', 'post-write.js', 'prompt-context.js']) {
  const p = path.join(HOOKS_DIR, hookFile);
  if (!fs.existsSync(p)) {
    err(`hook ${hookFile} exists`, 'not found');
    continue;
  }
  ok(`hook ${hookFile} exists`);
  // check first line is shebang
  const first = fs.readFileSync(p, 'utf-8').split('\n', 1)[0];
  if (first === '#!/usr/bin/env node') ok(`hook ${hookFile} shebang ok`);
  else err(`hook ${hookFile} shebang`, `first line was: ${first}`);
}

// run pre-write with empty stdin (should exit 0 silently)
{
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'pre-write.js')], { input: '', encoding: 'utf-8' });
  if (r.status === 0 && r.stdout.length === 0) ok('pre-write: empty input → silent exit 0');
  else err('pre-write empty input', `status=${r.status}, stdout="${r.stdout}", stderr="${r.stderr}"`);
}

// run pre-write with banned content
{
  const input = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: 'test.md', content: 'leverage cutting-edge synergies to elevate our robust offering.' },
  });
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'pre-write.js')], { input, encoding: 'utf-8' });
  if (r.status === 0 && r.stdout.includes('tone flags')) ok('pre-write: detects banned tone');
  else err('pre-write banned tone', `status=${r.status}, stdout=${r.stdout.slice(0,200)}`);
}

// run pre-write with binary file path (should skip)
{
  const input = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: 'image.png', content: 'robust seamless cutting-edge' },
  });
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'pre-write.js')], { input, encoding: 'utf-8' });
  if (r.status === 0 && r.stdout.length === 0) ok('pre-write: skips binary path');
  else err('pre-write binary path', `expected silent exit, got status=${r.status}, stdout=${r.stdout}`);
}

// run pre-write with strict mode + banned content (should block, exit 2)
{
  const input = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: 'bad.md', content: 'leverage synergies' },
  });
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'pre-write.js')], {
    input,
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_HOOK_STRICT: '1' },
  });
  if (r.status === 2) ok('pre-write: strict mode blocks (exit 2)');
  else err('pre-write strict', `expected exit 2, got ${r.status}`);
}

// run post-write
{
  const input = JSON.stringify({
    tool_name: 'Write',
    tool_input: { file_path: 'foo.md', content: 'hello' },
  });
  const tmpLog = '/tmp/studio-test-logs-' + Date.now();
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'post-write.js')], {
    input,
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_LOG_DIR: tmpLog },
  });
  if (r.status === 0) ok('post-write: exit 0');
  else err('post-write exit', `status=${r.status}, stderr=${r.stderr}`);

  // verify log was written
  if (fs.existsSync(tmpLog)) {
    const logs = fs.readdirSync(tmpLog);
    if (logs.length > 0) {
      ok('post-write: log file created');
      // cleanup
      for (const f of logs) fs.unlinkSync(path.join(tmpLog, f));
      fs.rmdirSync(tmpLog);
    } else {
      err('post-write log file', 'log dir empty');
    }
  } else {
    err('post-write log dir', 'log dir not created');
  }
}

// run prompt-context with a keyword
{
  const input = JSON.stringify({ prompt: 'help me write a prd' });
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'prompt-context.js')], {
    input,
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_ROOT: ROOT },
  });
  if (r.status === 0 && r.stdout.includes('prd-writing')) ok('prompt-context: surfaces prd skill');
  else err('prompt-context prd', `status=${r.status}, stdout=${r.stdout.slice(0,200)}`);
}

// prompt-context with no match
{
  const input = JSON.stringify({ prompt: 'random unrelated question about cooking' });
  const r = spawnSync('node', [path.join(HOOKS_DIR, 'prompt-context.js')], {
    input,
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_ROOT: ROOT },
  });
  if (r.status === 0 && r.stdout.length === 0) ok('prompt-context: silent on no match');
  else err('prompt-context no match', `status=${r.status}, stdout=${r.stdout.slice(0,100)}`);
}

// ============================================================
// 8. adapters: install scripts have shebangs and are executable
// ============================================================
section('adapters');

const adaptersDir = path.join(ROOT, 'adapters');
const adapterDirs = fs.readdirSync(adaptersDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

ok(`adapter count = ${adapterDirs.length}`);

for (const ad of adapterDirs) {
  const install = path.join(adaptersDir, ad, 'install.sh');
  if (!fs.existsSync(install)) {
    err(`adapter ${ad} install.sh`, 'not found');
    continue;
  }
  const first = fs.readFileSync(install, 'utf-8').split('\n', 1)[0];
  if (first.startsWith('#!')) ok(`adapter ${ad} has shebang`);
  else err(`adapter ${ad} shebang`, `first line: ${first}`);

  const stat = fs.statSync(install);
  if (stat.mode & 0o111) ok(`adapter ${ad} executable`);
  else err(`adapter ${ad} executable`, `mode: ${stat.mode.toString(8)}`);

  // README exists
  const rd = path.join(adaptersDir, ad, 'README.md');
  if (fs.existsSync(rd)) ok(`adapter ${ad} has README.md`);
  else err(`adapter ${ad} README.md`, 'not found');
}

// ============================================================
// 9. install.sh / install.ps1 exist and are correct shape
// ============================================================
section('top-level installers');

for (const inst of ['install.sh', 'install.ps1']) {
  const p = path.join(ROOT, inst);
  if (fs.existsSync(p)) {
    ok(`${inst} exists`);
    if (inst === 'install.sh') {
      const stat = fs.statSync(p);
      if (stat.mode & 0o111) ok(`${inst} executable`);
      else err(`${inst} executable`, `mode: ${stat.mode.toString(8)}`);
    }
  } else {
    err(`${inst}`, 'not found');
  }
}

// ============================================================
// 10. cross-reference checks
// ============================================================
section('cross-references');

// every skill referenced in prompt-context KEYWORDS map should exist
const promptContextSrc = fs.readFileSync(path.join(HOOKS_DIR, 'prompt-context.js'), 'utf-8');
const referencedSkills = [...promptContextSrc.matchAll(/'(skills\/[a-z-]+\/SKILL\.md)'/g)].map((m) => m[1]);
const uniqueRefs = [...new Set(referencedSkills)];
for (const r of uniqueRefs) {
  const full = path.join(ROOT, r);
  if (fs.existsSync(full)) ok(`prompt-context ref: ${r}`);
  else err(`prompt-context ref ${r}`, 'skill file does not exist');
}

// every rule referenced should exist
const referencedRules = [...promptContextSrc.matchAll(/'(rules\/[a-z\/-]+\.md)'/g)].map((m) => m[1]);
for (const r of [...new Set(referencedRules)]) {
  const full = path.join(ROOT, r);
  if (fs.existsSync(full)) ok(`prompt-context ref: ${r}`);
  else err(`prompt-context ref ${r}`, 'rule file does not exist');
}

// ============================================================
// 11. checks.js unit tests
// ============================================================
section('checks.js unit tests');

const { findBannedTone, checkRhythm, scanText, checkEmDashFiller } = require(path.join(HOOKS_DIR, 'lib/checks.js'));

// banned tone hits
{
  const hits = findBannedTone('we leverage cutting-edge synergies daily.');
  if (hits.length === 3) ok('findBannedTone: 3 hits in test sentence');
  else err('findBannedTone count', `expected 3, got ${hits.length}: ${JSON.stringify(hits.map(h => h.phrase))}`);
}

// clean content has no hits
{
  const hits = findBannedTone('we built a simple thing that works.');
  if (hits.length === 0) ok('findBannedTone: 0 hits on clean text');
  else err('findBannedTone clean', `expected 0, got ${hits.length}`);
}

// inflections
{
  const hits = findBannedTone('we leveraged the system and empowered the team.');
  if (hits.length === 2) ok('findBannedTone: catches -ed inflections');
  else err('findBannedTone inflections', `expected 2, got ${hits.length}`);
}

// technical context allowlist
{
  const hits = findBannedTone('the test harness validates the system.');
  if (hits.length === 0) ok('findBannedTone: allowlists "test harness"');
  else err('findBannedTone allowlist', `expected 0, got ${hits.length}: ${JSON.stringify(hits.map(h => h.phrase))}`);
}

// rhythm flatness detected
{
  const r = checkRhythm('this is a sentence. this is another sentence. this is one more sentence. this is yet another sentence. this is the final.');
  if (r.flag === true) ok('checkRhythm: detects flat rhythm');
  else err('checkRhythm flat', `expected flag=true, got ${JSON.stringify(r)}`);
}

// rhythm varied
{
  const r = checkRhythm('short. then a medium one. now a really long sentence that goes on and on with many words. ok. done.');
  if (r.flag === false) ok('checkRhythm: passes varied rhythm');
  else err('checkRhythm varied', `expected flag=false, got ${JSON.stringify(r)}`);
}

// empty input
{
  const r = checkRhythm('');
  if (r.flag === false && r.sentenceCount === 0) ok('checkRhythm: handles empty');
  else err('checkRhythm empty', JSON.stringify(r));
}

// scanText returns combined result
{
  const r = scanText('we leverage synergies. we leverage synergies. we leverage synergies.');
  if (r.summary.toneHits > 0) ok('scanText: combined banned tone');
  else err('scanText combined', JSON.stringify(r.summary));
}

// em-dash filler
{
  const r = checkEmDashFiller('this is a sentence — with em dash filler — that goes on.');
  if (r.length === 1) ok('checkEmDashFiller: detects pattern');
  else err('checkEmDashFiller', `expected 1, got ${r.length}`);
}

// ============================================================
// 12. README + STUDIO.md + SOUL.md substantive
// ============================================================
section('docs');

for (const doc of ['README.md', 'STUDIO.md', 'SOUL.md', 'DISCLAIMER.md', 'LICENSE', 'CHANGELOG.md']) {
  const p = path.join(ROOT, doc);
  if (fs.existsSync(p)) {
    const len = fs.statSync(p).size;
    if (len > 500) ok(`${doc} substantive (${len} bytes)`);
    else err(`${doc}`, `too short: ${len} bytes`);
  } else {
    err(`${doc}`, 'missing');
  }
}

// ============================================================
// 13. reference integrity (drift guard)
// ============================================================
section('reference integrity');

{
  const r = spawnSync('node', [path.join(ROOT, 'scripts/util/check-references.js'), '--strict'], { encoding: 'utf-8' });
  if (r.status === 0) {
    ok('check-references: zero errors and warnings');
  } else {
    err('check-references', `found broken refs:\n${r.stdout}`);
  }
}

// ============================================================
// 14. dashboard build runs cleanly
// ============================================================
section('dashboard build');

{
  const tmpOut = '/tmp/studio-dashboard-test-' + Date.now();
  const r = spawnSync('node', [path.join(ROOT, 'scripts/dashboard/build.js'), '--out', tmpOut], { encoding: 'utf-8' });
  if (r.status === 0) {
    ok('build.js: exits clean');
    if (fs.existsSync(path.join(tmpOut, 'index.html'))) ok('build.js: writes index.html');
    else err('build.js index.html', 'missing');
    if (fs.existsSync(path.join(tmpOut, '.nojekyll'))) ok('build.js: writes .nojekyll');
    else err('build.js .nojekyll', 'missing');
    const html = fs.readFileSync(path.join(tmpOut, 'index.html'), 'utf-8');
    // verify generated HTML doesn't contain unsubstituted server-side template vars
    // (${escapeHtml(...)} inside <script> is legitimate JS template literal usage, not server-side)
    const serverSidePatterns = ['${STUDIO_ROOT}', '${VERSION}', '${COUNT}'];
    const hasUnsubstituted = serverSidePatterns.some((p) => html.includes(p));
    if (!hasUnsubstituted) {
      ok('build.js: no unsubstituted server-side template vars');
    } else {
      err('build.js template vars', `found one of: ${serverSidePatterns.join(', ')}`);
    }
    if (html.includes('<!doctype html>')) ok('build.js: valid doctype');
    else err('build.js doctype', 'missing');
    // cleanup
    fs.rmSync(tmpOut, { recursive: true, force: true });
  } else {
    err('build.js exit', `status=${r.status}, stderr=${r.stderr}`);
  }
}

// ============================================================
// 15. log-viewer runs cleanly
// ============================================================
section('log viewer');

{
  const tmpLog = '/tmp/studio-log-viewer-test-' + Date.now();
  fs.mkdirSync(tmpLog, { recursive: true });
  // log-viewer should handle empty log dir gracefully
  const r = spawnSync('node', [path.join(ROOT, 'scripts/dashboard/log-viewer.js')], {
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_LOG_DIR: tmpLog },
  });
  if (r.status === 0 && r.stdout.includes('no activations')) ok('log-viewer: handles empty dir');
  else err('log-viewer empty', `status=${r.status}, stdout=${r.stdout}`);

  // log-viewer --help
  const r2 = spawnSync('node', [path.join(ROOT, 'scripts/dashboard/log-viewer.js'), '--help'], {
    encoding: 'utf-8',
    env: { ...process.env, STUDIO_LOG_DIR: tmpLog },
  });
  if (r2.status === 0 && r2.stdout.includes('STUDIO log viewer')) ok('log-viewer: --help works');
  else err('log-viewer --help', `status=${r2.status}`);

  fs.rmSync(tmpLog, { recursive: true, force: true });
}

// ============================================================
// 16. safety-guard: DYOR + contributor metadata didn't regress
// ============================================================
section('safety guard');

{
  const r = spawnSync('node', [path.join(ROOT, 'scripts/util/safety-guard.js')], {
    encoding: 'utf-8',
  });
  if (r.status === 0) {
    ok('safety-guard: README DYOR footer, hardened DISCLAIMER, package.json author/contributors all present');
  } else {
    err('safety-guard', `status=${r.status}\n${r.stdout}${r.stderr}`);
  }
}

// ============================================================
// summary
// ============================================================
console.log(`\n\x1b[1msummary\x1b[0m`);
console.log(`  passed: \x1b[32m${pass}\x1b[0m`);
console.log(`  failed: ${fail > 0 ? '\x1b[31m' + fail + '\x1b[0m' : '\x1b[32m0\x1b[0m'}`);

if (fail > 0) {
  console.log(`\n\x1b[31mFAILURES:\x1b[0m`);
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.detail || ''}`);
  }
  process.exit(1);
}

console.log(`\n\x1b[32mall good.\x1b[0m`);
process.exit(0);
