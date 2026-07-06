# gemini cli adapter

gemini cli reads GEMINI.md files in the project (and home) and supports @-imports for modular context.

## what this adapter installs

- `~/.gemini/GEMINI.md` (or project-local) that imports STUDIO modules via @-syntax
- `~/.gemini/studio/` containing the STUDIO files referenced

## install

```bash
./adapters/gemini/install.sh
```

or project-local:

```bash
./adapters/gemini/install.sh --project
```

## limitations

- gemini cli has no slash-command system at parity with claude code; STUDIO commands are described as patterns
- no subagents
- no hooks
- @-imports are loaded eagerly; large STUDIO context will consume tokens

## uninstall

delete `~/.gemini/studio/` and remove the @-imports from your `GEMINI.md`.
