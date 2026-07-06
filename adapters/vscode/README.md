# vscode + github copilot adapter

github copilot reads `.github/copilot-instructions.md` from your repo and uses it as durable context.

## what this adapter installs

- `<project>/.github/copilot-instructions.md` with STUDIO context
- optionally: `~/.config/Code/User/copilot-instructions.md` for user-level (note: copilot's user-level instructions support depends on version)

## install

```bash
# project-local (the standard placement):
./adapters/vscode/install.sh

# or:
./adapters/vscode/install.sh --user
```

## limitations

- copilot has no skill or agent abstraction; STUDIO is represented as instructions
- no slash commands (copilot chat has slash commands but they're not user-defined the same way)
- no hooks
- context budget is tight; the adapter writes a condensed version, not the full set

## uninstall

delete `.github/copilot-instructions.md`.
