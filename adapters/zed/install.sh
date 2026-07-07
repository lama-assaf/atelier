#!/usr/bin/env bash
# generate atelier agent config for zed
set -e

ATELIER_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TARGET_DIR="$HOME/.config/zed"
mkdir -p "$TARGET_DIR"

CONTEXT_FILE="$TARGET_DIR/atelier-context.md"

cat > "$CONTEXT_FILE" << EOF
# atelier context

source: $ATELIER_ROOT

## principles
$(cat "$ATELIER_ROOT/rules/common/principles.md")

## banned words
$(cat "$ATELIER_ROOT/rules/brand/banned-words.md")

## anti-ai tone
$(cat "$ATELIER_ROOT/rules/copy/anti-ai-tone.md")

## active voice
$(cat "$ATELIER_ROOT/rules/copy/active-voice.md")

## available skills
30 skills across design, product, and brand. invoke by name. full definitions: $ATELIER_ROOT/skills/

## available agents
15 specialist agents. ask the assistant to act as one when relevant. full definitions: $ATELIER_ROOT/agents/
EOF

cat << SNIPPET
atelier context written to: $CONTEXT_FILE

paste this snippet into your zed settings.json under "assistant":

  "agents": [
    {
      "name": "atelier",
      "description": "design, product and brand operator system",
      "instructions": "$CONTEXT_FILE"
    }
  ]

restart zed for the agent to appear.
SNIPPET
