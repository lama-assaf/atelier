# zed adapter

zed's AI assistant supports custom agents via JSON-formatted agent profiles in its settings.

## what this adapter installs

- a single JSON snippet you can paste into zed's settings.json under `assistant.agents`
- a markdown file with the STUDIO context the agent loads

## install

```bash
./adapters/zed/install.sh
```

prints the JSON snippet and the markdown content path. paste the JSON into your zed settings manually (zed's settings format makes automatic merging unreliable across versions).

## limitations

- zed's agent model is less rich than claude code's; STUDIO is represented as one agent with the full instruction set loaded
- no slash commands at parity; STUDIO commands are patterns you describe in chat
- no hooks
- single zed agent per install; you can duplicate the snippet to add per-lane agents

## uninstall

remove the studio agent entry from your zed settings.json.
