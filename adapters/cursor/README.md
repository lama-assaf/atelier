# cursor adapter

cursor reads `.cursor/rules/*.mdc` files for project rules and `~/.cursor/rules/*.mdc` for user-level rules. it supports a frontmatter that controls when each rule activates.

## what this adapter installs

- one `.mdc` file per STUDIO rule (rules/common, design, product, brand, copy)
- one `.mdc` file per STUDIO skill that maps to a slash command in cursor's command palette
- a top-level `STUDIO.mdc` that loads the principles

## install

```bash
# from STUDIO root:
./adapters/cursor/install.sh
```

by default this installs to `~/.cursor/rules/studio/`. pass `--project` to install into the current project's `.cursor/rules/` instead.

```bash
./adapters/cursor/install.sh --project
```

## rule activation modes

each generated `.mdc` uses one of cursor's three activation modes:

- **always**: principles, banned-words. these load every conversation.
- **auto-attached**: design rules attach when editing CSS/SCSS/figma files. product rules attach for markdown/prd-style docs. brand/copy rules attach for prose.
- **agent-requested**: skill files are pulled in only when the user invokes a related command.

## limitations

- cursor has no agents (in the claude code sense), so STUDIO agents are converted into prompt templates the user invokes via the chat panel.
- cursor has no hooks. the pre-write banned-word check has no equivalent.
- cursor's command palette is limited; STUDIO commands appear as `@studio-` prefixed prompts you can pin.

## uninstall

remove `~/.cursor/rules/studio/` or the `studio/` dir inside your project's `.cursor/rules/`.
