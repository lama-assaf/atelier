# hooks

three claude code hooks ship with STUDIO. all are non-blocking by default.

## what each does

### prompt-context.js (UserPromptSubmit)

inspects the user's prompt for studio-relevant keywords and surfaces the matching skill/rule files as additional context to the model. matches things like "design review", "prd", "brand voice", "naming", "a11y".

- silent when no keywords match
- silent when too many match (over 6, signals noisy prompt)
- truncates large files at ~6000 chars per reference

### pre-write.js (PreToolUse on Write/Edit)

scans content about to be written against the banned-word and ai-tone patterns from `rules/brand/banned-words.md` and `rules/copy/anti-ai-tone.md`. flags:

- ai-tone phrases (delve, leverage, robust, seamless, elevate, etc.)
- corporate filler (circle back, synergies, best-in-class, etc.)
- hollow openers (we listened to your feedback, exciting news, etc.)
- rhythm flatness (4+ sentences with stddev under 3 words)
- em-dash filler patterns

default: non-blocking warning surfaced as additional context.

strict mode: set `STUDIO_HOOK_STRICT=1` to block writes containing flags.

excludes binary files, lockfiles, the rules files themselves, node_modules, .git.

### post-write.js (PostToolUse on Write/Edit)

appends a one-line JSON record per write to `~/.claude/studio/logs/session-YYYY-MM-DD.log`. override with `STUDIO_LOG_DIR`.

## install

the installer writes `~/.claude/settings.json` with these hooks pointing at the absolute STUDIO path.

manually:

1. open `~/.claude/settings.json`
2. add the contents of `hooks/hooks.json` under `"hooks"` (merge with anything else there)
3. replace `${STUDIO_ROOT}` with the absolute path to your studio install (usually `~/.claude/studio`)

## test a hook

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"test.md","content":"we are excited to share that we have leveraged cutting-edge synergies to elevate our robust offering."}}' | node scripts/hooks/pre-write.js
```

expected output: JSON with `additionalContext` listing 4-5 tone flags.

## disable

remove the entries from `~/.claude/settings.json` under `hooks`. or rename the relevant file in `scripts/hooks/` so the command fails (claude code falls through on hook errors).

## environment variables

- `STUDIO_ROOT` — where STUDIO is installed (autodetected if unset)
- `STUDIO_HOOK_STRICT` — `1` to block writes on flags; default off
- `STUDIO_LOG_DIR` — where post-write logs go; default `~/.claude/studio/logs`
