# STUDIO.md

operator handbook. read this once before using STUDIO seriously.

## what this is

STUDIO is a system, not a library. it has a point of view about how design, product and brand work should be done. installing it imports that point of view into your harness.

the point of view shows up in three places:

- **agents** push you toward structured outputs and away from vibes-based critique
- **skills** install workflows that have been thought through, not one-shot prompts
- **rules** hold consistent across every output, project after project

if any part of this point of view conflicts with how your team works, override it. STUDIO is opinionated; it isn't dogmatic.

## the three lanes

```
design     |  product     |  brand
-----------|--------------|----------
how it     |  what to     |  how it
looks and  |  build and   |  sounds
feels      |  why         |
```

most agents and skills sit in one lane. some span lanes (e.g. landing-copy is brand-led but lands on a design surface). the lane structure is for navigation, not isolation.

## the operator loop

at any moment, STUDIO supports one of these moves:

1. **review** — critique an existing artifact (design, copy, prd)
2. **build** — create a new artifact from a brief
3. **decide** — work through a choice (positioning, naming, scoping)
4. **synthesize** — turn raw input into structured output (research, competitor notes)

every command and skill maps to one of these. when you're stuck, name the move you want to make and pick the matching tool.

## how to invoke STUDIO

### a. commands (fastest)

slash commands are the entry points designed for quick invocation:

```
/design-review
/prd
/brand-check
/name
/copy-review
/a11y-scan
```

these trigger specific skills with their default workflows.

### b. agents (deeper context)

agents are for sustained work where you want a specialist holding the rules:

```
@design-reviewer please critique this onboarding flow
@brand-voice-keeper check this whole article against our voice
@product-strategist help me think through whether to build this
```

agents have access to tools, can read files, can search code or content. they're more capable than a single command but slower to engage.

### c. skills (the most flexible)

skills can be invoked indirectly. when claude or your harness reads a prompt and matches it to a skill description, the skill activates. you don't have to know the name.

if you say "review my landing page copy for ai tone", the brand-voice-keeper agent or the anti-ai-tone rule will engage, even if you didn't name them.

## the rule of thumb

if you need a quick critique, use a command.
if you need sustained work, invoke an agent.
if you want the rules to influence whatever you're doing, don't invoke anything; the rules are already loaded.

## what STUDIO doesn't do

- **make decisions for you**. it surfaces tradeoffs and writes structured outputs. the call is still yours.
- **guarantee taste**. STUDIO can run an accessibility audit perfectly and still produce a boring design.
- **replace your judgment about your audience**. STUDIO has principles. your audience has context. when they conflict, your audience wins.
- **substitute for a brand voice guide you haven't written**. the brand-voice-keeper needs a voice to keep. without one, it can flag generic ai-tone markers but it can't enforce a specific voice.
- **replace research**. STUDIO can synthesize research; it can't go talk to your users.

## installation profiles

session 1 ships one install profile: full. session 2 ships profiles for specific stacks:

- **design-only**: agents and skills relevant to design and a11y, no product or brand
- **brand-only**: voice, naming, messaging, copy
- **founder**: a thin set covering the most common solo-operator needs
- **everything**: the default

select on install:

```bash
./install.sh --target claude --profile founder
```

## customizing

STUDIO is yours. every file is markdown. edit them.

common customizations:

- add your banned words to `rules/brand/banned-words.md`
- change spacing tokens in `rules/design/spacing.md`
- replace example metrics in `rules/product/metrics.md` with your team's
- add your own agents next to STUDIO's agents

if you want STUDIO's defaults preserved but your team's overrides on top, fork the repo or layer your changes in a separate directory and load both.

## conflicts between STUDIO and your project

project rules win. always. STUDIO is a default; your project knows context STUDIO doesn't.

if a STUDIO rule keeps conflicting with how your team works, change the rule. STUDIO is editable, not sacred.

## what's coming

- session 2: hooks runtime, cross-harness adapters (cursor, codex, opencode), additional commands, mcp configs filled in
- session 3: dashboard ui, drift guards, expanded skill set
- session 4: docs site, public launch
- session 5: npm package, github app (if traction)

session plan lives in CHANGELOG.md.

## reporting issues

github.com/Dragoon0x/studio/issues

include:

- what you tried
- what happened
- what you expected
- the agent, skill, or rule involved
- your harness (claude code version, cursor version, etc)
