#!/usr/bin/env node
// thin wrapper that delegates to the platform-appropriate installer.
// run via: npx studio-universal --target claude --with-adapters cursor
//
// on unix: exec install.sh with passed args
// on windows: print instructions to run install.ps1

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

if (os.platform() === 'win32') {
  console.log('on windows, run: powershell -ExecutionPolicy Bypass -File ' + path.join(ROOT, 'install.ps1') + ' ' + args.join(' '));
  process.exit(0);
}

const script = path.join(ROOT, 'install.sh');
const r = spawnSync('bash', [script, ...args], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
