#!/usr/bin/env bash
# install STUDIO into opencode config
set -e

STUDIO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OPENCODE_DIR="$HOME/.config/opencode"

mkdir -p "$OPENCODE_DIR/command"
mkdir -p "$OPENCODE_DIR/agent"

# copy commands (prepend studio- to namespace)
count_cmd=0
for cmd in "$STUDIO_ROOT/commands"/*.md; do
  name=$(basename "$cmd" .md)
  cp "$cmd" "$OPENCODE_DIR/command/studio-$name.md"
  count_cmd=$((count_cmd + 1))
done

# copy agents (strip claude-specific frontmatter)
count_agent=0
for agent in "$STUDIO_ROOT/agents"/*.md; do
  name=$(basename "$agent" .md)
  # remove `model:` and `tools:` lines that are claude-code specific
  awk '
    /^---$/ { in_fm = !in_fm; print; next }
    in_fm && /^model:/ { next }
    in_fm && /^tools:/ { next }
    { print }
  ' "$agent" > "$OPENCODE_DIR/agent/studio-$name.md"
  count_agent=$((count_agent + 1))
done

# write an opencode.json fragment if not present
if [ ! -f "$OPENCODE_DIR/opencode.json" ]; then
  cat > "$OPENCODE_DIR/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "instructions": ["$OPENCODE_DIR/STUDIO-CONTEXT.md"]
}
EOF
fi

# global instructions file
cat > "$OPENCODE_DIR/STUDIO-CONTEXT.md" << EOF
# STUDIO context for opencode

source: $STUDIO_ROOT

## principles

$(cat "$STUDIO_ROOT/rules/common/principles.md")

## banned words

$(cat "$STUDIO_ROOT/rules/brand/banned-words.md")

## available commands (prefix: studio-)

run \`/studio-<name>\` for any of the commands in $OPENCODE_DIR/command/

available: $(ls "$OPENCODE_DIR/command" | sed 's/studio-//;s/\.md$//' | tr '
' ' ')

## available agents

ask opencode to act as a STUDIO specialist. definitions in $OPENCODE_DIR/agent/
EOF

echo "STUDIO opencode adapter installed."
echo "  commands: $count_cmd"
echo "  agents:   $count_agent"
echo "  config:   $OPENCODE_DIR/opencode.json"
