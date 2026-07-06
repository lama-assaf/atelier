# atelier Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Studio fork in this repo into `atelier`, a self-contained Claude Code marketplace plugin with opt-in MCP templates and per-project memory in `<project>/.atelier/memory/`.

**Architecture:** All work happens inside this repo (already a fresh git history). Identity rename first, then hook packaging via `${CLAUDE_PLUGIN_ROOT}`, then the per-project memory feature in `scripts/hooks/prompt-context.js` (TDD), then three new markdown commands, then publish to `lama-assaf/atelier`.

**Tech Stack:** Plain Node.js (no npm dependencies), markdown agents/skills/commands, Claude Code plugin manifest (`.claude-plugin/plugin.json`), existing test runner `tests/run-all.js`.

## Global Constraints

- Repo root: `/Users/zilliqa/Desktop/workhere/atelier`. All paths below are relative to it.
- Plugin name is exactly `atelier`; GitHub repo is `lama-assaf/atelier`; version resets to `0.1.0`.
- Per-project memory directory is literally `.atelier/memory/` in the project root.
- Env var prefix `ATELIER_` replaces `STUDIO_` (`ATELIER_ROOT`, `ATELIER_LOG_DIR`, `ATELIER_HOOK_STRICT`).
- No new npm dependencies. Node built-ins only.
- Hooks must never block a session: any missing/unreadable/malformed memory input → hook exits 0.
- Keep `LICENSE` (MIT) unchanged; README must credit Dragoon0x/studio.
- Commit style (upstream convention): lowercase, imperative, no exclamation marks. Append `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- After every task: `node tests/run-all.js` must exit 0.

---

### Task 1: Identity rename — manifests, version, README attribution

**Files:**
- Modify: `package.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `VERSION`
- Modify: `README.md`
- Test: `tests/run-all.js` (existing runner)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: plugin identity `atelier` that every later task assumes; marketplace source `lama-assaf/atelier` used by Task 8.

- [ ] **Step 1: Replace `package.json` with the atelier identity**

Full new content:

```json
{
  "name": "atelier",
  "version": "0.1.0",
  "description": "harness-native operator system for design, product and brand work",
  "main": "scripts/install.js",
  "bin": {
    "atelier-install": "scripts/install.js"
  },
  "scripts": {
    "install:claude": "node scripts/install.js --target claude",
    "test": "node tests/run-all.js",
    "dashboard": "node scripts/dashboard/build.js",
    "logs": "node scripts/dashboard/log-viewer.js",
    "check-refs": "node scripts/util/check-references.js"
  },
  "keywords": [
    "claude-code",
    "design-system",
    "brand-voice",
    "product-management",
    "ai-agents",
    "mcp"
  ],
  "author": {
    "name": "lama-assaf",
    "url": "https://github.com/lama-assaf"
  },
  "license": "MIT",
  "homepage": "https://github.com/lama-assaf/atelier",
  "bugs": {
    "url": "https://github.com/lama-assaf/atelier/issues"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/lama-assaf/atelier.git"
  }
}
```

(Removes the upstream `contributors` block; the `test` script gains a second runner in Task 4.)

- [ ] **Step 2: Replace `.claude-plugin/plugin.json`**

```json
{
  "name": "atelier",
  "version": "0.1.0",
  "description": "harness-native operator system for design, product and brand work. agents, skills, hooks, rules and commands for ai coding agents.",
  "author": "lama-assaf",
  "license": "MIT",
  "repository": "https://github.com/lama-assaf/atelier",
  "agents": "./agents",
  "skills": "./skills",
  "commands": "./commands"
}
```

(The `hooks` field is added in Task 2, not here.)

- [ ] **Step 3: Replace `.claude-plugin/marketplace.json`**

```json
{
  "name": "atelier",
  "description": "design, product and brand operator system for claude code",
  "plugins": [
    {
      "name": "atelier",
      "source": {
        "source": "github",
        "repo": "lama-assaf/atelier"
      },
      "description": "agents, skills, hooks, rules and commands for design, product and brand work"
    }
  ]
}
```

- [ ] **Step 4: Set `VERSION` to `0.1.0`**

The file contains exactly `0.1.0` followed by a newline.

- [ ] **Step 5: Update `README.md`**

1. Replace every occurrence of `Dragoon0x/studio` with `lama-assaf/atelier` (install URLs, badges, links).
2. Replace title-line occurrences of `STUDIO` with `atelier` in the first heading only (leave body prose alone for now — content rework is out of scope).
3. Insert this attribution block immediately after the first heading:

```markdown
> atelier is a fork of [Dragoon0x/studio](https://github.com/Dragoon0x/studio) (MIT) by Dragoon0x, adapted as a self-contained Claude Code marketplace plugin with per-project memory.
```

4. Add an install section near the top (replacing any upstream `/plugin marketplace add Dragoon0x/studio` instructions):

```markdown
## install (claude code)

/plugin marketplace add lama-assaf/atelier
/plugin install atelier@atelier
```

- [ ] **Step 6: Update identity in `STUDIO.md` and `SOUL.md`**

Keep the filenames (other files cross-reference them; renaming risks breaking `check-refs`). In both files: replace occurrences of `Dragoon0x/studio` with `lama-assaf/atelier`, and change the first heading's `STUDIO` to `atelier (STUDIO fork)`. Leave body prose alone.

- [ ] **Step 7: Run the test suite**

Run: `node tests/run-all.js`
Expected: exit 0, all sections pass (JSON parse checks cover the three edited JSON files).

- [ ] **Step 8: Verify no upstream identity remains in manifests**

Run: `grep -rn "Dragoon0x\|studio-universal" package.json .claude-plugin/ VERSION`
Expected: no output (exit 1 from grep).

- [ ] **Step 9: Commit**

```bash
git add package.json .claude-plugin/plugin.json .claude-plugin/marketplace.json VERSION README.md STUDIO.md SOUL.md
git commit -m "rename plugin identity to atelier under lama-assaf

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Self-contained hook packaging

**Files:**
- Modify: `.claude-plugin/plugin.json` (add `hooks` field)
- Modify: `hooks/hooks.json` (replace `${STUDIO_ROOT}` with `${CLAUDE_PLUGIN_ROOT}`)
- Test: `tests/run-all.js`

**Interfaces:**
- Consumes: plugin identity from Task 1.
- Produces: hooks that fire on plugin install with zero installer steps; `${CLAUDE_PLUGIN_ROOT}` path convention that Tasks 5–7 reuse inside commands.

- [ ] **Step 1: Add the `hooks` field to `.claude-plugin/plugin.json`**

Insert after the `"commands"` line so the manifest ends:

```json
  "agents": "./agents",
  "skills": "./skills",
  "commands": "./commands",
  "hooks": "./hooks/hooks.json"
}
```

- [ ] **Step 2: Replace `hooks/hooks.json`**

Full new content (same three hooks, plugin-root paths, updated comment):

```json
{
  "_comment": "atelier hooks. loaded automatically when the plugin is installed via claude code's plugin system; ${CLAUDE_PLUGIN_ROOT} is resolved by claude code to the installed plugin directory. for manual use in other harnesses, replace ${CLAUDE_PLUGIN_ROOT} with the repo path and merge into your settings under the hooks key.",
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/hooks/prompt-context.js"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-write.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-write.js"
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 3: Verify**

Run: `node tests/run-all.js && grep -c 'CLAUDE_PLUGIN_ROOT' hooks/hooks.json && ! grep -q 'STUDIO_ROOT' hooks/hooks.json && echo OK`
Expected: tests exit 0, grep count `3`, final `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json hooks/hooks.json
git commit -m "wire hooks into plugin manifest via CLAUDE_PLUGIN_ROOT

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Identity sweep in hook scripts

**Files:**
- Modify: `scripts/hooks/prompt-context.js`
- Modify: `scripts/hooks/pre-write.js`
- Modify: `scripts/hooks/post-write.js`
- Modify: `scripts/hooks/lib/io.js`
- Test: `tests/run-all.js` (it executes the hooks on representative inputs)

**Interfaces:**
- Consumes: nothing new.
- Produces: `findAtelierRoot()` in `prompt-context.js` (same signature as old `findStudioRoot()`: no args, returns absolute path string) — Task 4 modifies code that calls it. Env vars `ATELIER_ROOT`, `ATELIER_LOG_DIR`, `ATELIER_HOOK_STRICT`.

- [ ] **Step 1: Apply string renames in `scripts/hooks/prompt-context.js`**

Exact replacements (each occurs once unless noted):

| old | new |
|---|---|
| `function findStudioRoot() {` | `function findAtelierRoot() {` |
| `process.env.STUDIO_ROOT && fs.existsSync(process.env.STUDIO_ROOT)` | `process.env.ATELIER_ROOT && fs.existsSync(process.env.ATELIER_ROOT)` |
| `return process.env.STUDIO_ROOT;` | `return process.env.ATELIER_ROOT;` |
| `const claudeStudio = path.join(os.homedir(), '.claude', 'studio');` | `const claudeAtelier = path.join(os.homedir(), '.claude', 'atelier');` |
| `if (fs.existsSync(claudeStudio)) return claudeStudio;` | `if (fs.existsSync(claudeAtelier)) return claudeAtelier;` |
| `if (process.env.STUDIO_LOG_DIR) return process.env.STUDIO_LOG_DIR;` | `if (process.env.ATELIER_LOG_DIR) return process.env.ATELIER_LOG_DIR;` |
| `return path.join(os.homedir(), '.claude', 'studio', 'logs');` | `return path.join(os.homedir(), '.claude', 'atelier', 'logs');` |
| `const root = findStudioRoot();` | `const root = findAtelierRoot();` |
| `# studio reference: ` (2 occurrences) | `# atelier reference: ` |
| `studio loaded ${blocks.length} relevant reference(s)` | `atelier loaded ${blocks.length} relevant reference(s)` |
| header comment mentions of STUDIO/studio | atelier |

- [ ] **Step 2: Apply string renames in `scripts/hooks/pre-write.js`**

| old | new |
|---|---|
| `studio rules flagged the content being written` | `atelier rules flagged the content being written` |
| `set STUDIO_HOOK_STRICT=1 to block on flags` | `set ATELIER_HOOK_STRICT=1 to block on flags` |
| every code read of `process.env.STUDIO_HOOK_STRICT` | `process.env.ATELIER_HOOK_STRICT` |
| `/path/to/studio/` in the header comment | `/path/to/atelier/` |

- [ ] **Step 3: Apply string renames in `scripts/hooks/post-write.js`**

| old | new |
|---|---|
| `$STUDIO_LOG_DIR or ~/.claude/studio/logs` (comment) | `$ATELIER_LOG_DIR or ~/.claude/atelier/logs` |
| every code read of `process.env.STUDIO_LOG_DIR` | `process.env.ATELIER_LOG_DIR` |
| `path.join(os.homedir(), '.claude', 'studio', 'logs')` | `path.join(os.homedir(), '.claude', 'atelier', 'logs')` |
| `/path/to/studio/` in the header comment | `/path/to/atelier/` |

- [ ] **Step 4: Rename the warn prefix in `scripts/hooks/lib/io.js`**

```js
process.stderr.write(`[atelier:hook] ${message}\n`);
```

(was `[studio:hook]`)

- [ ] **Step 5: Verify**

Run: `node tests/run-all.js && ! grep -rn "STUDIO_\|studio" scripts/hooks/*.js scripts/hooks/lib/*.js | grep -iv atelier && echo CLEAN`
Expected: tests exit 0; the grep pipeline prints `CLEAN` (no remaining `studio`/`STUDIO_` identifiers in hook scripts). If any hit remains, rename it the same way and re-run.

- [ ] **Step 6: Commit**

```bash
git add scripts/hooks
git commit -m "rename hook env vars, log paths and prefixes to atelier

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Per-project memory resolution in prompt-context (TDD)

**Files:**
- Create: `tests/memory-resolution.test.js`
- Modify: `scripts/hooks/prompt-context.js`
- Modify: `package.json` (test script)
- Modify: `memory/README.md`

**Interfaces:**
- Consumes: `findAtelierRoot()` and `readRelative(root, relPath)` from Task 3 / existing code. Hook stdin JSON: `{ prompt: string, cwd: string }` (Claude Code UserPromptSubmit protocol).
- Produces: the `.atelier/memory/instincts.md` per-project convention that Tasks 5–6 write into. `findProjectDir(input)` (takes parsed hook input, returns absolute dir path or `null`).

- [ ] **Step 1: Write the failing test**

Create `tests/memory-resolution.test.js`:

```js
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

if (fail > 0) {
  console.log(`\n${fail} failure(s)`);
  process.exit(1);
}
console.log('\nall memory-resolution checks passed');
process.exit(0);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/memory-resolution.test.js`
Expected: FAIL — checks `project instincts injected` and `labeled as project memory` fail (current hook reads only the plugin's own `memory/instincts.md`, which is template-marked and skipped). Exit code 1.

- [ ] **Step 3: Implement project-memory resolution in `scripts/hooks/prompt-context.js`**

3a. Add this function directly below `findAtelierRoot()`:

```js
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
```

3b. In `main()`, replace this existing block:

```js
  const instinctsRel = 'memory/instincts.md';
  const instinctsContent = readRelative(root, instinctsRel);
  let hasInstincts = false;
  if (instinctsContent && !instinctsContent.includes('delete these once you have your own')) {
    hasInstincts = true;
  } else if (instinctsContent && instinctsContent.length > 1500) {
    // file has been edited substantially even if some example text remains
    hasInstincts = true;
  }
```

with:

```js
  // per-project memory first; plugin seed only as fallback
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
    instinctsContent = readRelative(root, 'memory/instincts.md');
    if (instinctsContent) instinctsRel = 'memory/instincts.md (atelier defaults)';
  }
  let hasInstincts = false;
  if (instinctsContent && !instinctsContent.includes('delete these once you have your own')) {
    hasInstincts = true;
  } else if (instinctsContent && instinctsContent.length > 1500) {
    // file has been edited substantially even if some example text remains
    hasInstincts = true;
  }
```

No other lines in `main()` change — the later `blocks.push(...)` and `surfacedRefs.push(instinctsRel)` lines already use `instinctsRel`/`instinctsContent` and keep working. (`readRelative` already returns `null` for directories and unreadable files, which is what makes test cases 3–4 pass.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node tests/memory-resolution.test.js && node tests/run-all.js`
Expected: both exit 0, all checks green.

- [ ] **Step 5: Wire the new test into `npm test`**

In `package.json`, change:

```json
    "test": "node tests/run-all.js",
```

to:

```json
    "test": "node tests/run-all.js && node tests/memory-resolution.test.js",
```

Run: `npm test` — Expected: exit 0.

- [ ] **Step 6: Rewrite `memory/README.md` for the per-project model**

Full new content:

```markdown
# memory

atelier memory is **per-project**. each project you work in gets its own
`.atelier/memory/` directory at the project root:

    <project>/.atelier/memory/
    ├── instincts.md   # short, durable patterns for this project, injected automatically
    ├── lessons.md     # dated takeaways from work in this project
    ├── decisions/     # one file per significant project decision
    └── glossary.md    # project-specific terminology that overrides defaults

## how it gets used

the prompt-context hook (scripts/hooks/prompt-context.js) resolves the current
project from the hook's `cwd` and injects that project's `instincts.md` as
context. if the project has no memory directory, the seed `instincts.md` in
this folder is used as a fallback (and skipped while it still contains only
template examples).

## this directory is the seed

the files here (instincts.md, lessons.md, glossary.md, decisions/, templates/)
are **templates**, copied into a project by `/atelier:memory-init`. edit them to
change what new projects start with; edit the project's own `.atelier/memory/`
to change what atelier remembers about that project.

## commands

- `/atelier:memory-init` — seed `.atelier/memory/` in the current project
- `/atelier:remember <note>` — append a dated entry to the project's lessons.md
- `/atelier:remember --instinct <note>` — add a standing rule to instincts.md

## committed or ignored?

committed by default — project memory is most useful when the whole team's
sessions share it. add `.atelier/` to `.gitignore` instead if you want memory
to stay personal to your machine.

## maintenance

once a quarter, per project: prune instincts that no longer apply, archive old
decisions, update the glossary. memory that grows unchecked stops being useful.
```

- [ ] **Step 7: Commit**

```bash
git add tests/memory-resolution.test.js scripts/hooks/prompt-context.js package.json memory/README.md
git commit -m "resolve memory per project from .atelier/memory with seed fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: /atelier:memory-init command

**Files:**
- Create: `commands/memory-init.md`
- Test: `tests/run-all.js` (validates command frontmatter)

**Interfaces:**
- Consumes: the `.atelier/memory/` layout from Task 4; seed files in `${CLAUDE_PLUGIN_ROOT}/memory/`.
- Produces: seeded project memory that the Task 4 hook picks up and `/atelier:remember` (Task 6) appends to.

- [ ] **Step 1: Create `commands/memory-init.md`**

Full content:

```markdown
---
name: memory-init
description: seed per-project atelier memory (.atelier/memory/) in the current project
---

# /memory-init

seed the current project with atelier per-project memory.

## steps

1. determine the project root (the current working directory's repo root, or
   the cwd itself if not a git repo).
2. if `<project>/.atelier/memory/` already exists, report that memory is
   already initialized, list the files it contains, and STOP. never overwrite
   existing memory.
3. create the directory structure and copy seed content from the plugin:
   - `.atelier/memory/instincts.md` ← `${CLAUDE_PLUGIN_ROOT}/memory/instincts.md`
   - `.atelier/memory/lessons.md` ← `${CLAUDE_PLUGIN_ROOT}/memory/lessons.md`
   - `.atelier/memory/glossary.md` ← `${CLAUDE_PLUGIN_ROOT}/memory/glossary.md`
   - `.atelier/memory/decisions/README.md` ← `${CLAUDE_PLUGIN_ROOT}/memory/decisions/README.md`
4. tell the user:
   - memory is seeded and which files were created
   - instincts.md is injected automatically once they replace the template
     examples with their own entries
   - memory is meant to be committed so the team shares it; if they prefer
     machine-local memory, add `.atelier/` to `.gitignore`

## notes

- do not create `templates/` in the project; project memory starts minimal.
- if `${CLAUDE_PLUGIN_ROOT}` is not set (running outside the installed plugin),
  fall back to the repo checkout's `memory/` directory.
```

- [ ] **Step 2: Validate and commit**

Run: `npm test`
Expected: exit 0 (frontmatter check covers the new command; memory test still green).

```bash
git add commands/memory-init.md
git commit -m "add memory-init command to seed project memory

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: /atelier:remember command

**Files:**
- Create: `commands/remember.md`
- Test: `tests/run-all.js`

**Interfaces:**
- Consumes: `.atelier/memory/lessons.md` and `instincts.md` created by Task 5 (or creates them via the same seeding rules if absent).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `commands/remember.md`**

Full content:

```markdown
---
name: remember
description: append a note to this project's atelier memory (lessons.md, or instincts.md with --instinct)
---

# /remember

save a note into the current project's `.atelier/memory/`.

usage:

- `/atelier:remember <note>` — append a dated entry to `lessons.md`
- `/atelier:remember --instinct <note>` — add a standing rule to `instincts.md`

## steps

1. read the note from $ARGUMENTS. if $ARGUMENTS starts with `--instinct`,
   strip that flag and target `instincts.md`; otherwise target `lessons.md`.
   if the remaining note is empty, ask the user what to remember and stop.
2. if `<project>/.atelier/memory/` does not exist, create the directory and
   the target file first (empty file with just a `# lessons` or `# instincts`
   heading — do not run the full memory-init seeding).
3. append to the target file:
   - lessons.md entry format:

     ## YYYY-MM-DD — [short label you derive from the note]

     [the note, lightly edited for clarity]

   - instincts.md entry format (one bullet at the end of the file):

     - **[2-4 word label]**: [the note as a directly applicable rule]

4. use today's real date. keep the user's meaning; fix only grammar.
5. confirm to the user what was written and to which file.
```

- [ ] **Step 2: Validate and commit**

Run: `npm test`
Expected: exit 0.

```bash
git add commands/remember.md
git commit -m "add remember command for per-project memory notes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: /atelier:mcp-setup command

**Files:**
- Create: `commands/mcp-setup.md`
- Modify: `mcp-configs/README.md` (point at the command)
- Test: `tests/run-all.js`

**Interfaces:**
- Consumes: the template catalog `${CLAUDE_PLUGIN_ROOT}/mcp-configs/mcp-servers.json` (unchanged from upstream).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create `commands/mcp-setup.md`**

Full content:

```markdown
---
name: mcp-setup
description: enable optional MCP servers (figma, notion, linear, posthog, filesystem) for this project
---

# /mcp-setup

atelier bundles no MCP servers by default. this command copies the ones you
choose into the current project's `.mcp.json`.

## steps

1. read the catalog at `${CLAUDE_PLUGIN_ROOT}/mcp-configs/mcp-servers.json`
   (fall back to the repo checkout's `mcp-configs/mcp-servers.json` if the env
   var is unset).
2. present the available servers with a one-line description each and which
   env tokens they need:
   - figma-remote — remote URL, OAuth in-client, no token
   - figma-dev-mode — needs FIGMA_API_KEY
   - notion — needs NOTION_TOKEN
   - linear-remote — remote URL, OAuth in-client, no token
   - posthog — needs POSTHOG_API_KEY (and optionally POSTHOG_HOST)
   - filesystem — needs a directory path argument; default to the project root
3. ask the user which servers to enable ($ARGUMENTS may already name them —
   e.g. `/atelier:mcp-setup notion linear` skips the question).
4. merge the chosen entries into `<project>/.mcp.json`:
   - create the file with `{ "mcpServers": {} }` if it does not exist
   - NEVER overwrite an existing server entry with the same name; report the
     conflict and leave the existing entry alone
   - strip all `_comment` keys from copied entries
   - for filesystem, replace `${STUDIO_ROOT}` in the template args with the
     project root path
5. after writing, list which env vars the user must export (or add to their
   shell profile / secret store) before the servers will start, and remind
   them to restart the session or run /mcp to connect.
```

- [ ] **Step 2: Update `mcp-configs/README.md`**

Add this section at the top of the file, after its first heading:

```markdown
## quick start

run `/atelier:mcp-setup` in any project — it walks through this catalog and
merges your choices into that project's `.mcp.json`. nothing here auto-loads
with the plugin; every server is opt-in per project.
```

- [ ] **Step 3: Validate and commit**

Run: `npm test`
Expected: exit 0.

```bash
git add commands/mcp-setup.md mcp-configs/README.md
git commit -m "add mcp-setup command for opt-in server config

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification and publish

**Files:**
- No source changes expected (fix-forward if verification finds issues).

**Interfaces:**
- Consumes: everything above.
- Produces: the public GitHub repo `lama-assaf/atelier` users install from.

- [ ] **Step 1: Full local test suite and reference check**

Run: `npm test && npm run check-refs`
Expected: both exit 0. If `check-refs` flags the three new command files, fix the specific reference it names (it validates cross-references between skills/commands/rules).

- [ ] **Step 2: Validate the plugin with the Claude Code CLI**

Run: `claude plugin validate .`
Expected: manifest validates with no errors. (If this subcommand is unavailable in the installed CLI version, note that and rely on Step 4's live install instead.)

- [ ] **Step 3: Simulate the hook exactly as the plugin runs it**

```bash
mkdir -p /private/tmp/claude-501/-Users-zilliqa-Desktop-workhere/43606cde-a1c7-4616-bc33-0d396bdf174d/scratchpad/e2e-proj/.atelier/memory
printf -- '- **test rule**: e2e-marker-abc\n' > /private/tmp/claude-501/-Users-zilliqa-Desktop-workhere/43606cde-a1c7-4616-bc33-0d396bdf174d/scratchpad/e2e-proj/.atelier/memory/instincts.md
echo '{"prompt":"design review of the header","cwd":"/private/tmp/claude-501/-Users-zilliqa-Desktop-workhere/43606cde-a1c7-4616-bc33-0d396bdf174d/scratchpad/e2e-proj"}' | node scripts/hooks/prompt-context.js
```

Expected: stdout JSON whose `additionalContext` contains BOTH `e2e-marker-abc` (project memory) and `design-review/SKILL.md` content (keyword match) — proving memory and keyword injection compose.

- [ ] **Step 4: Create and push the GitHub repo**

```bash
gh repo create lama-assaf/atelier --public --source . --push --description "harness-native operator system for design, product and brand work — claude code plugin with per-project memory"
```

Expected: repo created, main branch pushed.

- [ ] **Step 5: Live install check (user-interactive)**

Ask the user to run, in a fresh Claude Code session:

```
/plugin marketplace add lama-assaf/atelier
/plugin install atelier@atelier
```

then in any project: `/atelier:memory-init`, add a real instinct to
`.atelier/memory/instincts.md`, start a new prompt, and confirm the injected
"atelier loaded ... reference(s)" context appears. Report results back.
