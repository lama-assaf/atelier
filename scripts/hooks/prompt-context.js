#!/usr/bin/env node
// prompt-context.js
// user-prompt-submit hook. inspects the user's prompt and surfaces the most relevant
// STUDIO skill/agent/rule files as additional context.
//
// install:
//   {
//     "hooks": [{ "type": "command", "command": "node /path/to/studio/scripts/hooks/prompt-context.js" }]
//   }
//   under hooks.UserPromptSubmit in your claude code settings.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { readHookInput } = require('./lib/io');

// keyword to category map. very intentional, very small. larger map = more noise.
const KEYWORDS = {
  // design
  'design review': ['skills/design-review/SKILL.md', 'rules/design/spacing.md', 'rules/design/type.md'],
  'design critique': ['skills/design-review/SKILL.md'],
  'design system': ['skills/design-system-audit/SKILL.md'],
  'accessibility': ['skills/accessibility-audit/SKILL.md', 'rules/design/accessibility.md'],
  'a11y': ['skills/accessibility-audit/SKILL.md', 'rules/design/accessibility.md'],
  'wcag': ['skills/accessibility-audit/SKILL.md', 'rules/design/accessibility.md'],
  'dark mode': ['skills/dark-mode-pairing/SKILL.md'],
  'motion': ['skills/motion-direction/SKILL.md', 'rules/design/motion.md'],
  'icon system': ['skills/iconography-system/SKILL.md'],
  'data viz': ['skills/data-viz-design/SKILL.md'],
  'chart': ['skills/data-viz-design/SKILL.md'],

  // product
  'prd': ['skills/prd-writing/SKILL.md', 'rules/product/prd-structure.md'],
  'product requirements': ['skills/prd-writing/SKILL.md'],
  'spec': ['skills/spec-writing/SKILL.md', 'rules/product/specs.md'],
  'jtbd': ['skills/jtbd-framing/SKILL.md', 'rules/product/jtbd.md'],
  'job-to-be-done': ['skills/jtbd-framing/SKILL.md'],
  'roadmap': ['skills/roadmap-planning/SKILL.md'],
  'mvp': ['skills/feature-scoping/SKILL.md'],
  'scope': ['skills/feature-scoping/SKILL.md'],
  'metric': ['skills/metric-design/SKILL.md', 'rules/product/metrics.md'],
  'a/b test': ['skills/ab-test-design/SKILL.md'],
  'ab test': ['skills/ab-test-design/SKILL.md'],
  'experiment': ['skills/ab-test-design/SKILL.md'],
  'competitor': ['skills/competitive-analysis/SKILL.md'],
  'competitive': ['skills/competitive-analysis/SKILL.md'],
  'launch': ['skills/launch-planning/SKILL.md'],
  'research synthesis': ['skills/research-synthesis/SKILL.md'],

  // brand
  'brand voice': ['skills/brand-voice-extraction/SKILL.md', 'rules/brand/voice.md'],
  'tone of voice': ['rules/brand/tone-matrix.md'],
  'naming': ['skills/naming-generation/SKILL.md', 'rules/brand/naming-conventions.md'],
  'tagline': ['skills/tagline-writing/SKILL.md'],
  'positioning': ['skills/positioning-statement/SKILL.md'],
  'messaging': ['skills/messaging-architecture/SKILL.md', 'rules/brand/messaging-hierarchy.md'],
  'value prop': ['skills/value-prop-writing/SKILL.md'],
  'microcopy': ['skills/microcopy-writing/SKILL.md'],
  'landing page': ['skills/landing-copy/SKILL.md'],
  'case study': ['skills/case-study-writing/SKILL.md'],
  'release notes': ['skills/release-narrative/SKILL.md'],
  'changelog': ['skills/release-narrative/SKILL.md'],
  'brand identity': ['skills/brand-identity-audit/SKILL.md'],
  'brand audit': ['skills/brand-identity-audit/SKILL.md'],
  'content calendar': ['skills/content-calendar/SKILL.md'],
  'editorial calendar': ['skills/content-calendar/SKILL.md'],
  'content plan': ['skills/content-calendar/SKILL.md'],
  'email sequence': ['skills/email-sequence/SKILL.md'],
  'drip campaign': ['skills/email-sequence/SKILL.md'],
  'welcome series': ['skills/email-sequence/SKILL.md'],
  'onboarding email': ['skills/email-sequence/SKILL.md'],
};

function findStudioRoot() {
  // try env var first
  if (process.env.STUDIO_ROOT && fs.existsSync(process.env.STUDIO_ROOT)) {
    return process.env.STUDIO_ROOT;
  }
  // then ~/.claude/studio
  const claudeStudio = path.join(os.homedir(), '.claude', 'studio');
  if (fs.existsSync(claudeStudio)) return claudeStudio;
  // fall back to two dirs up from this script (scripts/hooks/ -> root)
  return path.resolve(__dirname, '..', '..');
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

function getLogDir() {
  if (process.env.STUDIO_LOG_DIR) return process.env.STUDIO_LOG_DIR;
  return path.join(os.homedir(), '.claude', 'studio', 'logs');
}

function logActivation(prompt, matchedKeywords, refs) {
  try {
    const dir = getLogDir();
    fs.mkdirSync(dir, { recursive: true });
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(dir, `activations-${today}.log`);
    const ts = new Date().toISOString();
    // truncate prompt to keep log entries reasonable
    const promptSnippet = prompt.length > 200 ? prompt.slice(0, 200) + '...' : prompt;
    const line = JSON.stringify({
      ts,
      keywords: matchedKeywords,
      refs,
      prompt: promptSnippet,
    }) + '\n';
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // never let logging break anything
  }
}

function main() {
  const input = readHookInput();
  if (!input) {
    process.exit(0);
  }

  const prompt = (input.prompt || input.user_message || '').toString().toLowerCase();
  if (!prompt) process.exit(0);

  const matched = new Set();
  const matchedKeywords = [];
  for (const [kw, refs] of Object.entries(KEYWORDS)) {
    if (prompt.includes(kw)) {
      matchedKeywords.push(kw);
      for (const r of refs) matched.add(r);
    }
  }

  const root = findStudioRoot();

  // always include memory/instincts.md if it exists and has user content
  // (we skip if the file is unedited template — heuristic: contains "delete these once you have your own")
  const instinctsRel = 'memory/instincts.md';
  const instinctsContent = readRelative(root, instinctsRel);
  let hasInstincts = false;
  if (instinctsContent && !instinctsContent.includes('delete these once you have your own')) {
    hasInstincts = true;
  } else if (instinctsContent && instinctsContent.length > 1500) {
    // file has been edited substantially even if some example text remains
    hasInstincts = true;
  }

  if (matched.size === 0 && !hasInstincts) process.exit(0);
  if (matched.size > 6) {
    // too noisy, skip context injection (but still load instincts if present)
    if (!hasInstincts) process.exit(0);
    matched.clear();
    matchedKeywords.length = 0;
  }

  const blocks = [];

  if (hasInstincts) {
    blocks.push(`# studio reference: ${instinctsRel}\n\n${instinctsContent}`);
  }

  for (const rel of matched) {
    const content = readRelative(root, rel);
    if (content) {
      blocks.push(`# studio reference: ${rel}\n\n${content}`);
    }
  }

  if (blocks.length === 0) process.exit(0);

  // log this activation for later analysis
  const surfacedRefs = [];
  if (hasInstincts) surfacedRefs.push(instinctsRel);
  for (const r of matched) surfacedRefs.push(r);
  logActivation(prompt, matchedKeywords, surfacedRefs);

  const payload = {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `studio loaded ${blocks.length} relevant reference(s) based on your prompt:\n\n${blocks.join('\n\n---\n\n')}`,
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
