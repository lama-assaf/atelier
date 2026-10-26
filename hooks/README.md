# hooks

three claude code hooks ship with atelier. all are non-blocking by default.

## what each does

### session-context.js (SessionStart)

injects the current project's `.atelier/memory/instincts.md` once when a session starts, and again after `/clear` or compaction. falls back to the seed `memory/instincts.md` only once it has been edited.

- silent when there are no edited instincts
- truncates at ~6000 chars
- never reads your prompts

replaced `prompt-context.js` (UserPromptSubmit) in 0.2.0. that hook re-sent instincts with every prompt and pasted whole skill files on keyword matches; claude code already loads skills on demand from their descriptions, and the substring matcher fired mostly on false positives ("spec" inside "specific", "experiment" inside a folder path).

### pre-write.js (PreToolUse on Write/Edit)

scans content about to be written against the banned-word and ai-tone patterns from `rules/brand/banned-words.md` and `rules/copy/anti-ai-tone.md`. flags:

- ai-tone phrases (delve, leverage, robust, seamless, elevate, etc.)
- corporate filler (circle back, synergies, best-in-class, etc.)
- hollow openers (we listened to your feedback, exciting news, etc.)
- rhythm flatness (4+ sentences with stddev under 3 words)
- em-dash filler patterns

default: non-blocking warning surfaced as additional context.

strict mode: set `ATELIER_HOOK_STRICT=1` to block writes containing flags.

excludes binary files, lockfiles, the rules files themselves, node_modules, .git.

### post-write.js (PostToolUse on Write/Edit)

appends a one-line JSON record per write to `~/.claude/atelier/logs/session-YYYY-MM-DD.log`. override with `ATELIER_LOG_DIR`.

## install

these hooks load automatically when atelier is installed as a claude code plugin (`/plugin install atelier@atelier`) — `${CLAUDE_PLUGIN_ROOT}` in `hooks/hooks.json` is resolved by claude code to the installed plugin directory, no manual setup needed.

for other harnesses (or a manual/local checkout), merge them in yourself:

1. open `~/.claude/settings.json`
2. add the contents of `hooks/hooks.json` under `"hooks"` (merge with anything else there)
3. replace `${CLAUDE_PLUGIN_ROOT}` with the absolute path to your atelier install (usually `~/.claude/atelier`)

## test a hook

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.md","content":"we are excited to share that we have leveraged cutting-edge synergies to elevate our robust offering."}}' | node scripts/hooks/pre-write.js
```

expected output: JSON with `additionalContext` listing 4-5 tone flags.

## disable

remove the entries from `~/.claude/settings.json` under `hooks`. or rename the relevant file in `scripts/hooks/` so the command fails (claude code falls through on hook errors).

## environment variables

- `ATELIER_ROOT` — where atelier is installed (autodetected if unset)
- `ATELIER_HOOK_STRICT` — `1` to block writes on flags; default off
- `ATELIER_LOG_DIR` — where post-write logs go; default `~/.claude/atelier/logs`
