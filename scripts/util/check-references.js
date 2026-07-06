#!/usr/bin/env node
// check-references.js
// scan STUDIO source for broken cross-references and orphaned files.
//
// detects:
//   - skill referenced in prompt-context.js but doesn't exist on disk
//   - rule referenced but doesn't exist
//   - skill/agent/command/rule referenced in another markdown by relative path that doesn't resolve
//   - skill that no command, agent, or hook references (orphan)
//   - command with `invokes <skill>` clause where the named skill doesn't exist
//   - related blocks at the end of markdown that name non-existent skills/commands
//
// usage:
//   node scripts/util/check-references.js              # report mode (exit 0 even on findings)
//   node scripts/util/check-references.js --strict     # exit 1 if any findings

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');

function listDir(d, suffix) {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith(suffix));
}

function listSubdirs(d) {
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
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

// ============================================================
// build inventory
// ============================================================

const skills = new Set(listSubdirs(path.join(ROOT, 'skills')).filter((d) =>
  fs.existsSync(path.join(ROOT, 'skills', d, 'SKILL.md'))
));
const commands = new Set(listDir(path.join(ROOT, 'commands'), '.md').map((f) => f.replace(/\.md$/, '')));
const agents = new Set(listDir(path.join(ROOT, 'agents'), '.md').map((f) => f.replace(/\.md$/, '')));
const rulesFiles = walkFiles(path.join(ROOT, 'rules'), /\.md$/).map((f) =>
  path.relative(ROOT, f).replace(/\\/g, '/')
);
const rules = new Set(rulesFiles);

// ============================================================
// findings
// ============================================================

const issues = [];
function flag(severity, file, message) {
  issues.push({ severity, file, message });
}

// ============================================================
// 1. prompt-context KEYWORDS map -> files on disk
// ============================================================

const promptContextPath = path.join(ROOT, 'scripts/hooks/prompt-context.js');
if (fs.existsSync(promptContextPath)) {
  const src = fs.readFileSync(promptContextPath, 'utf-8');
  const refs = [...src.matchAll(/'(skills\/[a-z-]+\/SKILL\.md|rules\/[a-z\/-]+\.md|memory\/[a-z]+\.md)'/g)].map((m) => m[1]);
  const uniqueRefs = [...new Set(refs)];
  for (const r of uniqueRefs) {
    const full = path.join(ROOT, r);
    if (!fs.existsSync(full)) {
      flag('error', promptContextPath, `references "${r}" which does not exist`);
    }
  }
}

// ============================================================
// 2. command files referencing skills (in body text)
// ============================================================

for (const cmd of commands) {
  const p = path.join(ROOT, 'commands', `${cmd}.md`);
  const text = fs.readFileSync(p, 'utf-8');

  // pattern: "invokes <skill-name>" or "invokes the <skill-name> skill"
  const invokeMatches = [...text.matchAll(/invokes\s+(?:the\s+)?([a-z][a-z-]+)(?:\s+skill)?/gi)];
  for (const m of invokeMatches) {
    const skillName = m[1].toLowerCase();
    if (!skills.has(skillName)) {
      // check if it might be a partial match (e.g. "invokes a brand-voice")
      let foundPartial = false;
      for (const s of skills) {
        if (s.startsWith(skillName) || s.includes(skillName)) {
          foundPartial = true;
          break;
        }
      }
      if (!foundPartial) {
        flag('warning', p, `mentions "invokes ${skillName}" but no skill by that name`);
      }
    }
  }

  // pattern: "related" section with `/cmd` references
  const relatedRefs = [...text.matchAll(/\/([a-z][a-z-]+)/g)].map((m) => m[1]);
  for (const r of [...new Set(relatedRefs)]) {
    // ignore obvious paths like /home/, /usr/, /etc/
    if (['home', 'usr', 'etc', 'var', 'mnt', 'tmp', 'dev', 'opt'].includes(r)) continue;
    if (!commands.has(r) && r.length > 2) {
      // only flag if appears in a "related" or "see also" context
      const ctx = text.toLowerCase();
      const idx = ctx.indexOf(`/${r}`);
      if (idx > 0) {
        const before = ctx.slice(Math.max(0, idx - 100), idx);
        if (/related|see also/.test(before)) {
          flag('warning', p, `references command /${r} which does not exist`);
        }
      }
    }
  }
}

// ============================================================
// 3. skill files referencing related skills
// ============================================================

for (const skill of skills) {
  const p = path.join(ROOT, 'skills', skill, 'SKILL.md');
  const text = fs.readFileSync(p, 'utf-8');

  // pattern: under "## related" section only (not "## related components" etc), bounded by the next heading
  const relatedMatch = text.match(/\n## related\s*\n([\s\S]*?)(?=\n## |\n# |$)/i);
  if (relatedMatch) {
    const relatedBlock = relatedMatch[1];
    // skill names should look like bare lowercase-hyphenated tokens at the start of a bullet
    // accept either `- name` or `- name (` or `- /name`
    const candidates = [...relatedBlock.matchAll(/^- ([a-z][a-z-]{3,})(?:\s|$|\(|—)/gm)].map((m) => m[1]);
    for (const c of [...new Set(candidates)]) {
      if (!skills.has(c) && !commands.has(c)) {
        // double check: is this listed in a `/cmd` form?
        if (!relatedBlock.includes(`/${c}`)) {
          flag('warning', p, `related section names "${c}" but no skill or command by that name`);
        }
      }
    }
  }
}

// ============================================================
// 4. skills not referenced by any command, agent, hook, or other skill (orphans)
// ============================================================

// build the full corpus of references
const allMarkdown = walkFiles(ROOT, /\.md$/).filter((f) => !f.includes('/docs/') && !f.includes('/node_modules/'));
const allCode = walkFiles(path.join(ROOT, 'scripts'), /\.js$/);
let corpus = '';
for (const f of [...allMarkdown, ...allCode]) {
  // exclude the skill file itself from its own reference check (only count external refs)
  corpus += '\n[FILE:' + f + ']\n' + fs.readFileSync(f, 'utf-8');
}

for (const skill of skills) {
  // count references to this skill name outside its own SKILL.md
  const skillFile = path.join(ROOT, 'skills', skill, 'SKILL.md');
  // build a regex that finds the skill name as a token
  const pattern = new RegExp('\\b' + skill.replace(/-/g, '[-]') + '\\b', 'g');
  let externalCount = 0;
  let inOwnFile = false;
  for (const block of corpus.split(/\n\[FILE:/)) {
    if (!block.trim()) continue;
    const newlineIdx = block.indexOf(']\n');
    if (newlineIdx === -1) continue;
    const fileName = block.slice(0, newlineIdx);
    const content = block.slice(newlineIdx + 2);
    if (fileName === skillFile) continue; // skip own file
    if (pattern.test(content)) externalCount++;
  }
  if (externalCount === 0) {
    flag('info', skillFile, `skill "${skill}" is not referenced by any command, agent, hook, or other skill (orphan)`);
  }
}

// ============================================================
// 5. command name doesn't match a skill (informational)
// ============================================================

// not all commands map 1:1 to a skill (some wrap multiple, e.g. /name -> naming-generation)
// this is informational only

// ============================================================
// 6. agent files mentioning skills that don't exist
// ============================================================

for (const agent of agents) {
  const p = path.join(ROOT, 'agents', `${agent}.md`);
  const text = fs.readFileSync(p, 'utf-8');
  // look for "skill: <name>" or "skills: [name1, name2]" style refs
  const matches = [...text.matchAll(/skill:\s*([a-z][a-z-]+)/gi)];
  for (const m of matches) {
    const skillName = m[1].toLowerCase();
    if (!skills.has(skillName)) {
      flag('warning', p, `agent references skill "${skillName}" which does not exist`);
    }
  }
}

// ============================================================
// 7. memory references in hooks
// ============================================================

const memoryRefs = ['memory/instincts.md', 'memory/lessons.md', 'memory/glossary.md'];
for (const m of memoryRefs) {
  const full = path.join(ROOT, m);
  if (!fs.existsSync(full)) {
    flag('warning', ROOT, `memory file "${m}" missing (referenced by hooks)`);
  }
}

// ============================================================
// summary
// ============================================================

const errors = issues.filter((i) => i.severity === 'error');
const warnings = issues.filter((i) => i.severity === 'warning');
const infos = issues.filter((i) => i.severity === 'info');

function rel(f) {
  return path.relative(ROOT, f) || f;
}

console.log('STUDIO reference check\n');
console.log(`  errors:   ${errors.length}`);
console.log(`  warnings: ${warnings.length}`);
console.log(`  info:     ${infos.length}\n`);

if (errors.length > 0) {
  console.log('errors:');
  for (const i of errors) console.log(`  [${rel(i.file)}] ${i.message}`);
}

if (warnings.length > 0) {
  console.log('warnings:');
  for (const i of warnings) console.log(`  [${rel(i.file)}] ${i.message}`);
}

if (VERBOSE && infos.length > 0) {
  console.log('info:');
  for (const i of infos) console.log(`  [${rel(i.file)}] ${i.message}`);
} else if (infos.length > 0) {
  console.log(`(${infos.length} info-level findings — pass --verbose to see)`);
}

if (issues.length === 0) {
  console.log('no findings.');
}

if (STRICT && (errors.length > 0 || warnings.length > 0)) {
  process.exit(1);
}
process.exit(0);
