#!/usr/bin/env node
// log-viewer.js
// inspect STUDIO logs: activations (which skill matched on which prompt) and writes (file ops).
//
// usage:
//   node scripts/dashboard/log-viewer.js                  # summary of today's activations
//   node scripts/dashboard/log-viewer.js --writes         # show write log
//   node scripts/dashboard/log-viewer.js --date 2026-05-27 # specific day
//   node scripts/dashboard/log-viewer.js --last 7         # last N days
//   node scripts/dashboard/log-viewer.js --top            # most-activated skills

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function getLogDir() {
  if (process.env.STUDIO_LOG_DIR) return process.env.STUDIO_LOG_DIR;
  return path.join(os.homedir(), '.claude', 'studio', 'logs');
}

function parseArgs(argv) {
  const args = { mode: 'activations', date: null, last: null, top: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--writes') args.mode = 'writes';
    else if (a === '--date') args.date = argv[++i];
    else if (a === '--last') args.last = parseInt(argv[++i], 10);
    else if (a === '--top') args.top = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function help() {
  console.log(`STUDIO log viewer

usage:
  node scripts/dashboard/log-viewer.js                     today's activations
  node scripts/dashboard/log-viewer.js --writes            today's write log
  node scripts/dashboard/log-viewer.js --date YYYY-MM-DD   specific day
  node scripts/dashboard/log-viewer.js --last N            last N days (activations)
  node scripts/dashboard/log-viewer.js --top               most-activated skills/refs

logs read from: ${getLogDir()}
(override with STUDIO_LOG_DIR)`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf-8');
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch (e) {
      // skip malformed lines silently
    }
  }
  return out;
}

function datesInLastN(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function showActivations(dates) {
  const dir = getLogDir();
  const all = [];
  for (const date of dates) {
    const f = path.join(dir, `activations-${date}.log`);
    all.push(...readJsonl(f));
  }

  if (all.length === 0) {
    console.log(`no activations found for: ${dates.join(', ')}`);
    return;
  }

  console.log(`activations (${all.length} total across ${dates.length} day(s))\n`);
  // sort newest first
  all.sort((a, b) => (a.ts < b.ts ? 1 : -1));

  for (const a of all.slice(0, 50)) {
    const ts = a.ts.slice(11, 19);
    const date = a.ts.slice(0, 10);
    const kws = a.keywords && a.keywords.length ? a.keywords.join(', ') : '(none)';
    const refCount = a.refs ? a.refs.length : 0;
    console.log(`  ${date} ${ts}  [${kws}]  → ${refCount} ref(s)`);
    if (a.prompt) {
      console.log(`    "${a.prompt.slice(0, 80)}${a.prompt.length > 80 ? '...' : ''}"`);
    }
  }

  if (all.length > 50) {
    console.log(`\n(showing 50 of ${all.length}; pass --last N for more days)`);
  }
}

function showTop(dates) {
  const dir = getLogDir();
  const all = [];
  for (const date of dates) {
    const f = path.join(dir, `activations-${date}.log`);
    all.push(...readJsonl(f));
  }

  if (all.length === 0) {
    console.log(`no activations found`);
    return;
  }

  const keywordCounts = {};
  const refCounts = {};
  for (const a of all) {
    if (Array.isArray(a.keywords)) {
      for (const k of a.keywords) keywordCounts[k] = (keywordCounts[k] || 0) + 1;
    }
    if (Array.isArray(a.refs)) {
      for (const r of a.refs) refCounts[r] = (refCounts[r] || 0) + 1;
    }
  }

  console.log(`top keywords (${all.length} activations across ${dates.length} day(s))\n`);
  Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, c]) => console.log(`  ${c.toString().padStart(4)}  ${k}`));

  console.log(`\ntop refs surfaced\n`);
  Object.entries(refCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, c]) => console.log(`  ${c.toString().padStart(4)}  ${k}`));
}

function showWrites(date) {
  const dir = getLogDir();
  const f = path.join(dir, `session-${date}.log`);
  const all = readJsonl(f);

  if (all.length === 0) {
    console.log(`no writes logged for ${date}`);
    return;
  }

  console.log(`writes on ${date} (${all.length} total)\n`);
  for (const w of all) {
    const ts = w.ts ? w.ts.slice(11, 19) : '--';
    console.log(`  ${ts}  ${w.tool || '?'}  ${w.path || '(no path)'}  ${w.bytes || 0}b`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    help();
    return;
  }

  if (args.mode === 'writes') {
    showWrites(args.date || today());
    return;
  }

  let dates;
  if (args.date) {
    dates = [args.date];
  } else if (args.last) {
    dates = datesInLastN(args.last);
  } else {
    dates = [today()];
  }

  if (args.top) {
    showTop(dates);
  } else {
    showActivations(dates);
  }
}

main();
