# openai codex cli adapter

codex looks for AGENTS.md files in the project, parent dirs, and home (`~/.codex/AGENTS.md`). it loads them in priority order and uses them as durable instructions.

## what this adapter installs

a single AGENTS.md at one of:

- `~/.codex/AGENTS.md` (global, applies to every codex session) — default
- `<project>/AGENTS.md` (project-scoped)

the AGENTS.md imports STUDIO content via referenced paths rather than inlining everything (to keep context budget reasonable).

## install

```bash
./adapters/codex/install.sh
```

or for project scope:

```bash
./adapters/codex/install.sh --project
```

## what's referenced

- the principles and process rules
- the banned-words and anti-ai-tone rules
- skill index (skills are loaded on demand by codex when referenced)

## limitations

- codex doesn't have a slash-command system; STUDIO commands are described as patterns to invoke in chat
- no subagents; STUDIO agents are described as roles you can ask codex to adopt
- no hooks; pre-write validation is approximated by always-on rules

## uninstall

delete `~/.codex/AGENTS.md` or the project's `AGENTS.md`.
