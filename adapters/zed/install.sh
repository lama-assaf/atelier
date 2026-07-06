#!/usr/bin/env bash
# generate STUDIO agent config for zed
set -e

STUDIO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_DIR="$HOME/.config/zed"
mkdir -p "$TARGET_DIR"

CONTEXT_FILE="$TARGET_DIR/studio-context.md"

cat > "$CONTEXT_FILE" << EOF
# STUDIO context

source: $STUDIO_ROOT

## principles
$(cat "$STUDIO_ROOT/rules/common/principles.md")

## banned words
$(cat "$STUDIO_ROOT/rules/brand/banned-words.md")

## anti-ai tone
$(cat "$STUDIO_ROOT/rules/copy/anti-ai-tone.md")

## active voice
$(cat "$STUDIO_ROOT/rules/copy/active-voice.md")

## available skills
30 skills across design, product, and brand. invoke by name. full definitions: $STUDIO_ROOT/skills/

## available agents
15 specialist agents. ask the assistant to act as one when relevant. full definitions: $STUDIO_ROOT/agents/
EOF

cat << SNIPPET
STUDIO context written to: $CONTEXT_FILE

paste this snippet into your zed settings.json under "assistant":

  "agents": [
    {
      "name": "studio",
      "description": "design, product and brand operator system",
      "instructions": "$CONTEXT_FILE"
    }
  ]

restart zed for the agent to appear.
SNIPPET
