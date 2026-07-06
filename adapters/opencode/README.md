# opencode adapter

opencode uses `opencode.json` for configuration and supports custom commands, custom agent modes, and provider-level settings.

## what this adapter installs

- `~/.config/opencode/opencode.json` (or merges into existing) with:
  - custom mode entries for each STUDIO command
  - reference to STUDIO instructions file
- `~/.config/opencode/command/*.md` — one file per STUDIO command (these become custom commands in opencode)
- `~/.config/opencode/agent/*.md` — STUDIO agents adapted to opencode's agent format

## install

```bash
./adapters/opencode/install.sh
```

## limitations

- opencode's agent format differs from claude code's; the adapter strips claude-specific fields (model = opus) and lets opencode choose its default
- no equivalent to UserPromptSubmit hooks; the prompt-context hook has no port
- pre-write validation could be approximated with a custom mode that asks opencode to self-check, but this isn't automatic

## uninstall

remove `~/.config/opencode/command/` and `agent/` entries with `studio-` prefix, or `rm -rf ~/.config/opencode/{command,agent}/studio-*`.
