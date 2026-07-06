#!/usr/bin/env node
// safety-guard.js
// fails (exit 1) if any of these regress:
//   - README.md is missing the DYOR / experimental status footer
//   - README.md is missing the contributors section
//   - DISCLAIMER.md is missing required no-warranty / not-professional-advice /
//     operator-responsibility / no-affiliation language
//   - package.json author/contributors metadata is missing or unstructured
//
// runs in CI and as part of `npm test`. exists because the s1 -> s2 -> s3
// regeneration repeatedly dropped these blocks. catch the regression locally
// and on the remote before it ships.
//
// usage: node scripts/util/safety-guard.js
// exit 0 = all good, 1 = at least one block missing

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

let failures = [];

function fail(file, missing, hint) {
  failures.push({ file, missing, hint });
}

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8');
}

// ---------------------------------------------------------------------------
// README.md
// ---------------------------------------------------------------------------

const readme = read('README.md');
if (readme == null) {
  fail('README.md', 'file missing', 'create README.md');
} else {
  const lower = readme.toLowerCase();
  const checks = [
    {
      missing: 'DYOR / experimental status footer heading',
      // accept either em-dash, hyphen, or no separator
      test: () => /##\s+status[:\s].*experimental/i.test(readme) || /##\s+experimental/i.test(readme),
      hint: 'add a `## status: experimental — DYOR` section at the bottom of README.md',
    },
    {
      missing: 'DYOR mention',
      test: () => lower.includes('dyor') || lower.includes('do your own research'),
      hint: 'mention DYOR (do your own research) inside the experimental status section',
    },
    {
      missing: '"no warranty" language',
      test: () => /no\s+warrant/i.test(readme),
      hint: 'state "no warranty" in the README footer',
    },
    {
      missing: '"no affiliation" language',
      test: () => /no\s+affiliation/i.test(readme) || /not\s+affiliated/i.test(readme),
      hint: 'state that STUDIO is not affiliated with any referenced company',
    },
    {
      missing: '"operator owns the output" language',
      test: () => /operator owns|responsibility of the operator|operator.*responsib/i.test(readme),
      hint: 'restate that the operator owns generated output',
    },
    {
      missing: '## contributors section',
      test: () => /##\s+contributors/i.test(readme),
      hint: 'add a `## contributors` section listing maintainers + linking the GitHub contributors page',
    },
    {
      missing: 'Dragoon0x credit linked to GitHub profile',
      test: () => /\[Dragoon0x\]\(https:\/\/github\.com\/Dragoon0x\)/.test(readme),
      hint: 'link Dragoon0x to https://github.com/Dragoon0x in the author and/or contributors section',
    },
  ];
  for (const c of checks) {
    if (!c.test()) fail('README.md', c.missing, c.hint);
  }
}

// ---------------------------------------------------------------------------
// DISCLAIMER.md
// ---------------------------------------------------------------------------

const disclaimer = read('DISCLAIMER.md');
if (disclaimer == null) {
  fail('DISCLAIMER.md', 'file missing', 'create DISCLAIMER.md');
} else {
  const lower = disclaimer.toLowerCase();
  const checks = [
    {
      missing: 'experimental status block',
      test: () => /experimental/i.test(disclaimer),
      hint: 'state STUDIO is experimental / early-stage / work-in-progress',
    },
    {
      missing: 'DYOR section',
      test: () => lower.includes('dyor') || lower.includes('do your own research'),
      hint: 'include a "do your own research (DYOR)" section',
    },
    {
      missing: '"no warranty" section',
      test: () => /no\s+warrant/i.test(disclaimer),
      hint: 'include explicit "no warranty" language (e.g. `## no warranty`)',
    },
    {
      missing: '"no liability" language',
      test: () => /no\s+liability|accept[s]?\s+no\s+liability/i.test(disclaimer),
      hint: 'state that author + contributors accept no liability for damages',
    },
    {
      missing: '"not professional advice" section',
      test: () => /not.*professional\s+advice|not\s+legal|not.*financial\s+advice/i.test(disclaimer),
      hint: 'include a "not professional advice" section covering legal/financial/medical/etc.',
    },
    {
      missing: 'operator responsibility section',
      test: () => /operator/i.test(disclaimer) && /responsib/i.test(disclaimer),
      hint: 'include an "operator responsibility" section',
    },
    {
      missing: 'no-affiliation section',
      test: () => /no\s+affiliation/i.test(disclaimer) || /not\s+affiliated/i.test(disclaimer),
      hint: 'include a "no affiliation" section disclaiming endorsement by third parties',
    },
    {
      missing: 'security section',
      test: () => /##\s+security|##\s+secrets/i.test(disclaimer) || /audit them before running/i.test(disclaimer),
      hint: 'include a `## security` section warning that install/hook/dashboard scripts execute locally',
    },
  ];
  for (const c of checks) {
    if (!c.test()) fail('DISCLAIMER.md', c.missing, c.hint);
  }
}

// ---------------------------------------------------------------------------
// package.json
// ---------------------------------------------------------------------------

const pkgRaw = read('package.json');
if (pkgRaw == null) {
  fail('package.json', 'file missing', 'create package.json');
} else {
  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (e) {
    fail('package.json', 'invalid JSON', String(e.message));
    pkg = null;
  }
  if (pkg) {
    if (typeof pkg.author !== 'object' || pkg.author === null || Array.isArray(pkg.author)) {
      fail(
        'package.json',
        'author is not a structured object',
        'set `author` to `{ "name": "Dragoon0x", "url": "https://github.com/Dragoon0x" }`'
      );
    } else {
      if (pkg.author.name !== 'Dragoon0x') {
        fail('package.json', 'author.name is not "Dragoon0x"', 'set author.name to "Dragoon0x"');
      }
      if (pkg.author.url !== 'https://github.com/Dragoon0x') {
        fail(
          'package.json',
          'author.url is not the GitHub profile',
          'set author.url to "https://github.com/Dragoon0x"'
        );
      }
    }

    if (!Array.isArray(pkg.contributors) || pkg.contributors.length === 0) {
      fail(
        'package.json',
        'contributors[] missing or empty',
        'add a `contributors` array with at least { "name": "Dragoon0x", "url": "https://github.com/Dragoon0x" }'
      );
    }

    if (typeof pkg.homepage !== 'string' || !pkg.homepage.includes('github.com/Dragoon0x/studio')) {
      fail(
        'package.json',
        'homepage missing or wrong',
        'set `homepage` to "https://github.com/Dragoon0x/studio"'
      );
    }

    if (
      typeof pkg.bugs !== 'object' ||
      pkg.bugs == null ||
      typeof pkg.bugs.url !== 'string' ||
      !pkg.bugs.url.includes('github.com/Dragoon0x/studio/issues')
    ) {
      fail(
        'package.json',
        'bugs.url missing or wrong',
        'set `bugs` to `{ "url": "https://github.com/Dragoon0x/studio/issues" }`'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

if (failures.length === 0) {
  console.log('\x1b[32msafety-guard:\x1b[0m all required blocks present.');
  process.exit(0);
}

console.log(`\x1b[31msafety-guard: ${failures.length} regression(s) detected.\x1b[0m`);
console.log('');
console.log('the following safety/credit blocks were dropped between sessions');
console.log('and need to be restored before pushing:');
console.log('');
for (const f of failures) {
  console.log(`  \x1b[31m✗\x1b[0m ${f.file} — ${f.missing}`);
  if (f.hint) console.log(`     fix: ${f.hint}`);
}
console.log('');
console.log('see the commit history for prior restorations as reference.');
process.exit(1);
