# atelier — generic fork of Studio as a self-contained marketplace plugin

**Date:** 2026-07-06
**Status:** Approved
**Upstream:** https://github.com/Dragoon0x/studio (MIT, v0.3.0) — attribution retained.

## Goal

Turn the Studio operator system into `atelier`, a domain-neutral Claude Code plugin
distributed through our own marketplace repo (`lama-assaf/atelier`), with:

1. Fully self-contained plugin packaging (no installer scripts needed for Claude Code).
2. MCP servers offered as opt-in templates via a setup command (none auto-load).
3. **Per-project memory**: each project accumulates its own instincts, lessons,
   decisions and glossary in `<project>/.atelier/memory/`.

Non-goals: rewriting Studio's content (agents/skills/rules stay as-is), Zilliqa
branding, supporting the non-Claude adapters as first-class (they remain in-repo,
untouched).

## 1. Repo & identity

- Fresh git history (upstream `.git` removed), repo `lama-assaf/atelier`.
- Keep `LICENSE` (MIT) and add a README attribution line: "Forked from
  Dragoon0x/studio (MIT)."
- Rename `studio` → `atelier` across: `package.json` (name `atelier`, author,
  repository, homepage, bugs), `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json` (source repo → `lama-assaf/atelier`),
  README/STUDIO.md-style docs, and `${STUDIO_ROOT}` naming in scripts where it
  refers to plugin identity. Command namespace becomes `/atelier:*`.
- `VERSION` and plugin version reset to `0.1.0`.

## 2. Plugin packaging (self-contained)

- `.claude-plugin/plugin.json` gains a `hooks` field pointing at
  `./hooks/hooks.json`.
- `hooks/hooks.json`: replace `${STUDIO_ROOT}` with `${CLAUDE_PLUGIN_ROOT}` so
  the three hooks (UserPromptSubmit → prompt-context, PreToolUse/PostToolUse on
  Write|Edit|MultiEdit → pre-write/post-write) run without any installer.
- Install flow: `/plugin marketplace add lama-assaf/atelier` →
  `/plugin install atelier@atelier`. The legacy `install.sh` / `install.js`
  paths remain for other harnesses but are not required for Claude Code.

## 3. MCP servers — opt-in templates only

- Nothing added to the plugin manifest's `mcpServers`; no server auto-starts.
- `mcp-configs/mcp-servers.json` remains the template catalog (figma-remote,
  figma-dev-mode, notion, linear-remote, posthog, filesystem).
- New command **`/atelier:mcp-setup`**: lists the catalog, asks which servers to
  enable, merges the chosen entries into the current project's `.mcp.json`
  (creating it if absent, never clobbering existing entries), and tells the user
  which env tokens (e.g. `FIGMA_API_KEY`, `NOTION_TOKEN`, `POSTHOG_API_KEY`)
  must be set before the servers will work.

## 4. Per-project memory

Layout, created in the project being worked on (not the plugin):

```
<project>/.atelier/memory/
├── instincts.md   # durable per-project patterns, injected as context
├── lessons.md     # dated takeaways
├── decisions/     # one file per significant decision
└── glossary.md    # project-specific terminology
```

- The plugin's own `memory/` directory becomes **seed templates** (read-only at
  runtime; used only to initialize projects).
- **`scripts/hooks/prompt-context.js`**: resolve the project root from the hook
  input's `cwd` (fallback `CLAUDE_PROJECT_DIR`), read
  `<project>/.atelier/memory/instincts.md` and inject it; fall back to the
  plugin's seed `instincts.md` only if the project has no memory dir.
- New command **`/atelier:memory-init`**: seeds `.atelier/memory/` in the current
  project from the plugin templates; explains the commit-vs-gitignore choice
  (default: committed, shared with the team).
- New command **`/atelier:remember <note>`**: appends a dated entry to the
  project's `lessons.md` by default; `/atelier:remember --instinct <note>`
  targets `instincts.md` instead. Creates the memory dir first if needed.

### Error handling

Hooks must never block a session:
- Missing `.atelier/memory/` → silent fallback to seed defaults.
- Unreadable/malformed memory files → skipped, hook exits 0.
- Hook resolves paths defensively; no writes ever happen from the
  prompt-context hook (read-only).

## 5. Testing & verification

- Keep `tests/run-all.js` and `scripts/util/check-references.js` green after the
  rename sweep.
- Add a small test for project-memory path resolution (project memory present /
  absent / malformed).
- End-to-end: add the local repo as a marketplace from the filesystem, install
  the plugin, confirm hooks fire, `/atelier:memory-init` seeds a scratch
  project, and prompt-context injects that project's instincts.
- Then create `lama-assaf/atelier` on GitHub, push, and re-verify install from
  GitHub.
