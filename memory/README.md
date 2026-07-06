# memory

memory is how STUDIO carries learnings forward across projects, sessions, and harnesses.

it lives outside the source-of-truth files in agents/, skills/, rules/, and commands/. those describe how STUDIO works in principle. memory captures what was learned in practice — and is meant to be edited freely by the operator without worrying about breaking the system.

## what's in here

```
memory/
├── instincts.md          # short, durable patterns the operator wants STUDIO to apply automatically
├── lessons.md            # specific takeaways from past projects, dated
├── decisions/            # one file per significant project decision
├── glossary.md           # team-specific terminology that overrides defaults
└── templates/            # custom artifact templates you reuse
```

each file is markdown. each is meant to be small. memory is a knife, not a library.

## how it gets used

the prompt-context hook (scripts/hooks/prompt-context.js) reads memory/instincts.md and includes it when relevant. agents and skills are expected to consult memory when their workflow includes the line "check memory/instincts.md for project-specific overrides."

## what memory is not

- a backup of every conversation
- a research database
- a generic notes app

memory is the small set of things you actually want STUDIO to remember and apply by default.

## maintenance

once a quarter:

- review instincts.md, prune things that no longer apply
- archive old decisions
- update glossary if the team has settled on new terminology

drift in memory is fine. memory that grows unchecked stops being useful.
