# adapters

STUDIO is built around claude code's plugin format (agents, skills, hooks, rules, commands). these adapters port the same content to other harnesses so you can use STUDIO inside cursor, codex, opencode, gemini cli, zed, and vscode/copilot.

## what each adapter provides

| harness | format | adapter dir |
|---|---|---|
| claude code | plugin manifest (native) | ../.claude-plugin/ |
| cursor | .cursor/rules/*.mdc | adapters/cursor/ |
| openai codex cli | AGENTS.md + custom prompts | adapters/codex/ |
| opencode | opencode.json + command/agent files | adapters/opencode/ |
| gemini cli | GEMINI.md + memory imports | adapters/gemini/ |
| zed | agent profile JSON | adapters/zed/ |
| vscode + copilot | .github/copilot-instructions.md | adapters/vscode/ |

each subdir has its own README with install steps.

## the philosophy

STUDIO's source of truth is the markdown in `agents/`, `skills/`, `rules/`, and `commands/`. adapters generate harness-specific configs that point at, reference, or include that content. when you update STUDIO, re-run the adapter generator to refresh derived configs.

## installing an adapter

each adapter has its own `install.sh` or instructions. typical flow:

```bash
cd adapters/<harness>
./install.sh
```

most adapters install into your home dir or the current project, not into STUDIO itself.

## limitations

not every harness supports every STUDIO concept. cursor has no equivalent to subagents. gemini cli loads context via @-imports. opencode supports custom modes but not sub-agents in the claude code sense. each adapter README documents what's supported and what's approximated.
