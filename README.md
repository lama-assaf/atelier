# atelier

> atelier is a fork of [Dragoon0x/studio](https://github.com/Dragoon0x/studio) (MIT) by Dragoon0x, adapted as a self-contained Claude Code marketplace plugin with per-project memory.

harness-native operator system for design, product and brand work.

agents, skills, hooks, rules and commands for ai coding agents like claude code, cursor, codex, opencode, gemini cli, zed, and vscode + copilot. one source of truth in markdown, six adapters for the rest. MIT licensed, free for everyone, designed to be edited freely.

```
atelier/
├── agents/           15 specialist agents
├── skills/           33 skills across design, product, brand
├── commands/         32 slash commands
├── rules/            23 rules across 5 lanes
├── hooks/            working claude code hooks (pre-write, post-write, prompt-context)
├── mcp-configs/      figma, notion, linear, posthog, filesystem (opt-in via /atelier:mcp-setup)
├── memory/           seed templates for per-project memory (.atelier/memory/)
├── adapters/         cursor, codex, opencode, gemini, zed, vscode
├── scripts/
│   ├── hooks/        hook runtime (node, executable)
│   ├── dashboard/    build.js (static html), log-viewer.js (cli)
│   └── util/         check-references.js (drift guard)
├── docs/             generated static dashboard (github pages ready)
└── tests/            run-all.js validator
```

## install (claude code)

the only supported claude code install path is the plugin marketplace:

```
/plugin marketplace add lama-assaf/atelier
/plugin install atelier@atelier
```

hooks, commands, agents, and skills load automatically once the plugin is installed — no manual settings.json editing needed. commands are namespaced: `/atelier:design-review`, `/atelier:memory-init`, etc.

note: while this repo is private, installing requires github access to it (e.g. `gh auth login` as an authorized account).

then, in each project you work in:

```
/atelier:memory-init      # seed per-project memory (.atelier/memory/)
/atelier:mcp-setup        # optionally enable mcp servers for the project
```

## manual / other-harness install (cursor, codex, opencode, gemini cli, zed, vscode)

for harnesses other than claude code (or if you want a local checkout instead of the plugin), use the installer:

```bash
git clone https://github.com/lama-assaf/atelier.git ~/.claude/atelier
cd ~/.claude/atelier
./install.sh
```

the installer links the checkout, writes a hooks config with absolute paths (for manual merge into `~/.claude/settings.json` if you're not using the claude code plugin), and copies the mcp templates. see "install options" below and each adapter's own installer for cursor, codex, opencode, gemini cli, zed, and vscode.

## what's in here

### agents (15)

design-reviewer, design-system-auditor, accessibility-reviewer, brand-voice-keeper, copywriter, microcopy-writer, product-strategist, ux-research-synthesizer, competitor-analyst, naming-generator, narrative-architect, taxonomy-architect, release-narrator, case-study-writer, pitch-deck-writer.

### skills (33)

**design (10)**: design-review, design-system-audit, accessibility-audit, figma-handoff-spec, component-spec, motion-direction, responsive-rules, dark-mode-pairing, iconography-system, data-viz-design.

**product (10)**: prd-writing, spec-writing, research-synthesis, jtbd-framing, roadmap-planning, feature-scoping, metric-design, ab-test-design, competitive-analysis, launch-planning.

**brand (13)**: brand-voice-extraction, naming-generation, tagline-writing, positioning-statement, messaging-architecture, value-prop-writing, microcopy-writing, landing-copy, case-study-writing, release-narrative, brand-identity-audit, content-calendar, email-sequence.

### commands (32)

design: `/design-review`, `/a11y-scan`, `/system-audit`, `/handoff`
product: `/prd`, `/spec`, `/research-synth`, `/jtbd`, `/roadmap`, `/scope`, `/metrics`, `/experiment`, `/competitor`, `/launch`
brand: `/brand-check`, `/name`, `/copy-review`, `/voice-extract`, `/tagline`, `/position`, `/messaging`, `/value-prop`, `/microcopy`, `/landing`, `/case-study`, `/release`, `/brand-identity`, `/content-calendar`, `/email-sequence`
memory & setup: `/memory-init`, `/remember`, `/mcp-setup`

(installed as a claude code plugin, all commands carry the `atelier:` prefix, e.g. `/atelier:prd`.)

### hooks (3)

`pre-write` flags ai-tone and rhythm flatness before writes. `post-write` logs every write. `prompt-context` surfaces relevant skills based on prompt keywords and logs each activation. all non-blocking by default. set `ATELIER_HOOK_STRICT=1` to block on flags.

### rules (23)

- common (5): principles, process, handoff, research, decisions
- design (5): spacing, type, color, motion, accessibility
- product (5): prd-structure, jtbd, metrics, specs, research-standards
- brand (5): voice, tone-matrix, banned-words, naming-conventions, messaging-hierarchy
- copy (3): sentence-rhythm, anti-ai-tone, active-voice

### dashboard

a static HTML site browsing every agent, skill, command and rule. searchable, filterable by type and lane. click a card to open the full source.

```bash
npm run dashboard        # writes to docs/
node scripts/dashboard/build.js --out custom-path
node scripts/dashboard/build.js --watch
```

deploy: push to github, enable github pages serving from `docs/` on main.

### log viewer

inspect what atelier surfaced and what got written.

```bash
npm run logs                                    # today's activations
node scripts/dashboard/log-viewer.js --top      # most-activated keywords
node scripts/dashboard/log-viewer.js --writes   # write log
node scripts/dashboard/log-viewer.js --last 7   # last 7 days
```

### drift guard

scans for broken cross-references. runs as part of the test suite, also standalone.

```bash
npm run check-refs
node scripts/util/check-references.js --strict   # exit 1 on findings
```

### adapters (6)

cursor (.mdc rules), codex (AGENTS.md), opencode (commands + agents + opencode.json), gemini cli (GEMINI.md + @-imports), zed (agent profile), vscode + github copilot (.github/copilot-instructions.md).

each adapter has its own `install.sh`. run from the atelier root:

```bash
./adapters/cursor/install.sh           # user-scope
./adapters/cursor/install.sh --project # project-scope
```

### memory (per-project)

each project gets its own memory in `<project>/.atelier/memory/` (instincts, lessons, decisions, glossary):

- `/atelier:memory-init` seeds it from the templates in this repo's `memory/` dir
- `/atelier:remember <note>` appends a dated lesson; `--instinct` adds a standing rule
- the prompt-context hook injects the current project's `instincts.md` automatically (this repo's `memory/instincts.md` is only the seed/fallback)

memory is committed by default so the team shares it; gitignore `.atelier/` for machine-local memory. see `memory/README.md`.

### mcp servers (opt-in)

none auto-load with the plugin. `/atelier:mcp-setup` merges the servers you choose — figma (remote + dev mode stdio), notion, linear (remote), posthog, filesystem — into the current project's `.mcp.json` and tells you which env tokens to set. see `mcp-configs/README.md`.

## install options

```bash
./install.sh                        # default: claude code, all rules
./install.sh --rules common,design  # only common and design rules
./install.sh --target claude        # claude code (default)
./install.sh --no-hooks             # skip hooks setup
./install.sh --with-adapters cursor # also install cursor adapter
```

windows:

```powershell
.\install.ps1 -Rules "common,design"
```

## tests

```bash
npm test
```

validates: JSON parsing, agent/skill/command frontmatter, hook execution on edge cases, adapter install scripts, cross-references, dashboard build, log-viewer cli, unit tests on the banned-word and rhythm checkers, and an end-to-end suite for per-project memory resolution (spawns the real prompt-context hook). ~358 checks across `tests/run-all.js` and `tests/memory-resolution.test.js`.

## license

MIT. see LICENSE.

## disclaimer

see DISCLAIMER.md. opinions in agents and skills are starting points; override them when context demands it. content generated through atelier is the responsibility of the operator running the harness.

## author

[lama-assaf](https://github.com/lama-assaf). issues and PRs welcome at [github.com/lama-assaf/atelier](https://github.com/lama-assaf/atelier).

## contributors

- [lama-assaf](https://github.com/lama-assaf) — fork maintainer.
- [Dragoon0x](https://github.com/Dragoon0x) — creator of upstream [studio](https://github.com/Dragoon0x/studio).

full contributor list lives on the GitHub [contributors page](https://github.com/lama-assaf/atelier/graphs/contributors).

---

## status: experimental — DYOR

atelier is **early-stage, experimental software** (v0.1.0, forked from upstream studio v0.3.0). interfaces, agent contracts, skill descriptions, rule formats, hook signatures, adapter layouts, dashboard scripts, and install scripts may change without notice and without migration paths.

**do your own research (DYOR)** before relying on atelier for anything that matters:

- read every agent, skill, rule, hook, and dashboard script before running them. they encode opinions and they execute on your machine.
- review every output before shipping it. agents and skills will be wrong sometimes.
- validate generated copy, prds, audits, scopes, brand identities, content calendars, email sequences, and recommendations against your own context, audience, and legal/compliance requirements.
- treat anything atelier produces as a draft, not a deliverable.
- audit the hook scripts under `scripts/hooks/`, dashboard scripts under `scripts/dashboard/`, and each adapter's `install.sh` before running them — they execute locally, read prompts, write logs, and modify your harness config.

**no warranty.** atelier is provided "as is" under the MIT license. there is no guarantee of accuracy, originality, fitness for any purpose, security, or availability. the author and contributors accept no liability for losses, damages, missed deadlines, brand harm, leaked information, or any other consequence arising from use of this repo.

**not professional advice.** nothing in atelier constitutes legal, financial, medical, security, accessibility-compliance, or other professional advice. accessibility audits, brand guidance, product specs, content calendars, email sequences, and copy reviews here are starting points — not substitutes for qualified review.

**operator owns the output.** content generated through atelier via any harness (claude code, cursor, codex, opencode, gemini, zed, vscode, etc.) is the responsibility of the operator running the harness, not the author of atelier.

**no affiliation.** atelier is not affiliated with, endorsed by, or sponsored by Anthropic, Cursor, OpenAI, Google, Zed Industries, GitHub/Microsoft, Figma, Notion, Linear, PostHog, or any other company referenced in agents, skills, adapters, examples, or docs. all trademarks belong to their respective owners.

if any of this is a problem for your use case, do not install atelier. fork it, audit it, or wait for a stable release.

see [DISCLAIMER.md](DISCLAIMER.md) for the long form.
