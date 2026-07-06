# changelog

## 0.3.0 — session 3

### added

- **dashboard ui** (`scripts/dashboard/build.js`) — generates a static HTML site at `docs/` indexing every agent, skill, command, and rule. browseable, searchable, filterable by type and lane. clicking a card opens the full source body. designed for github pages (includes `.nojekyll`).
  - run: `node scripts/dashboard/build.js` or `npm run dashboard`
  - `--out <path>` for custom output dir
  - `--watch` for poll-based rebuild on change
- **skill activation log** — the `prompt-context` hook now writes one JSON line per activation to `~/.claude/studio/logs/activations-YYYY-MM-DD.log`. records timestamp, matched keywords, refs surfaced, and a truncated prompt snippet.
- **log viewer cli** (`scripts/dashboard/log-viewer.js`) — inspects both activation and write logs.
  - default: today's activations
  - `--writes` show write log
  - `--date YYYY-MM-DD` specific day
  - `--last N` last N days
  - `--top` most-activated keywords and refs across the period
- **drift guard** (`scripts/util/check-references.js`) — scans for broken cross-references.
  - prompt-context keyword refs pointing at nonexistent files
  - commands invoking nonexistent skills
  - skill `## related` sections naming things that don't exist
  - agent files referencing nonexistent skills
  - missing memory files
  - orphan skills (informational; skills no command/agent/hook references)
  - integrated into `tests/run-all.js`
  - run standalone: `node scripts/util/check-references.js` or `npm run check-refs`
- **3 new skills** to bring total to 33:
  - `brand-identity-audit` — full identity audit across logo, type, color, voice, imagery, motion
  - `content-calendar` — content plan tied to goals, audiences, channels, owners
  - `email-sequence` — multi-email sequences for onboarding, nurture, sales, lifecycle, launch
- **3 new commands** to bring total to 29:
  - `/brand-identity`, `/content-calendar`, `/email-sequence`
- **keywords map extended** in `prompt-context.js` to recognize new skills (brand identity, content calendar, drip campaign, welcome series, etc.)

### bugs caught and fixed during s3 build

- `scripts/util/check-references.js` initial regex `^## related` matched `^## related components` (substring), and the 1500-char window pulled bullets from unrelated sections like `## what to avoid`. fixed by requiring exact heading match and bounding the block at the next heading.

### tested

- 339 tests pass (the s2 suite of 314 + 25 new checks for reference integrity, dashboard build, log viewer)
- drift guard verified by injecting two real broken refs (renamed skill, fake `## related` entry) and confirming the scanner caught both, then cleaning up.
- dashboard generation tested: 100 items indexed, JSON data block parses clean, valid HTML5 with proper doctype.
- log viewer tested across all modes (default, --writes, --top, --help, empty log dir).

### scope honesty

s3 adds the operator-facing surface: dashboard, logs, drift guards. it does not yet include a public docs site, dark-mode toggle on the dashboard, or live-reload on watch (uses 2s polling). those are session 4 work if there's demand.

---

## 0.2.0 — session 2

### added

- **hooks runtime** (`scripts/hooks/`) — three claude code hooks ship working:
  - `pre-write.js` (PreToolUse) scans content for banned ai-tone, corporate filler, hollow openers, and rhythm flatness against the rules in `rules/brand/banned-words.md` and `rules/copy/anti-ai-tone.md`. non-blocking by default; set `STUDIO_HOOK_STRICT=1` to block.
  - `post-write.js` (PostToolUse) logs every write to `~/.claude/studio/logs/session-YYYY-MM-DD.log`.
  - `prompt-context.js` (UserPromptSubmit) inspects the user prompt for ~40 keywords (prd, design review, brand voice, a11y, jtbd, etc.) and surfaces the matching skill/rule files as additional context. also includes `memory/instincts.md` automatically when edited.
- **cross-harness adapters** under `adapters/` for cursor, openai codex cli, opencode, gemini cli, zed, and vscode/copilot. each has an install script and README explaining what's supported per harness.
- **20 new commands** to bring total to 26: `spec`, `research-synth`, `jtbd`, `roadmap`, `scope`, `metrics`, `experiment`, `competitor`, `launch`, `voice-extract`, `tagline`, `position`, `messaging`, `value-prop`, `microcopy`, `landing`, `case-study`, `release`, `system-audit`, `handoff`.
- **mcp configs** filled in with real references: figma (remote + dev mode), notion, linear (remote), posthog, filesystem. paired with a README that documents required env vars and source URLs.
- **memory directory** (`memory/`) for `instincts.md`, `lessons.md`, `glossary.md`, `decisions/`, `templates/`. memory is where operator-specific learnings live, outside the source-of-truth files.
- **tests directory** (`tests/run-all.js`) — comprehensive validator covering JSON parsing, frontmatter validity, hook script execution, adapter install scripts, cross-references between hooks and skills/rules, and unit tests for the checks library.

### fixed

- `hooks/hooks.json` was a placeholder in s1; now a real template with `${STUDIO_ROOT}` substitution.
- `mcp-configs/mcp-servers.json` was a placeholder in s1; now references real mcp servers (figma, notion, linear, posthog, filesystem) with env var templates.

### bugs caught and fixed during s2 build

- `prompt-context.js` used `import.meta.url` which forced node 22 into ESM mode and crashed on `require`. fixed by removing the import.meta path and using `__dirname` directly.
- ai-tone pattern list was missing -ed inflections (`leveraged`, `elevated`, `empowered`, `fostered`, etc.). caught by smoke test; expanded patterns.js to cover them.

### tested

- 314 tests pass (json parsing, frontmatter validity, hook execution including edge cases, adapter install scripts, cross-references, unit tests for checks library)
- all 6 adapter install scripts verified clean on a sandbox `HOME`
- pre-write hook verified on 8 edge cases (clean, empty, malformed, binary, rules-file, code, rhythm, strict-mode)

### scope honesty

s2 ships the hooks and adapters. it does not include a dashboard, no docs site, no v0 of the npm package as a runnable cli. those are session 3 / 4 work.

---

## 0.1.0 — session 1

### added

- claude code plugin scaffold: `.claude-plugin/plugin.json` + marketplace manifest
- 15 specialist agents across design, product, brand
- 30 skills (10 per lane) with structured workflows
- 6 commands: `design-review`, `prd`, `brand-check`, `name`, `copy-review`, `a11y-scan`
- 23 rules across common, design, product, brand, copy
- `install.sh` and `install.ps1` for unix and windows
- `README.md`, `STUDIO.md` (operator handbook), `SOUL.md` (founding principles), `DISCLAIMER.md`
- MIT license
- placeholder `hooks/hooks.json` and `mcp-configs/mcp-servers.json` (real versions in 0.2.0)

---

## planned

### 0.4.0 — session 4

- public docs site (github pages or hosted)
- npm package as runnable cli (`npx studio-universal <command>`)
- contribution guide and skill authoring template

### 0.5.0 — session 5

- github app for repo-level integration (if there's traction)
- skill marketplace (third-party authoring)
