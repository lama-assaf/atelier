#!/usr/bin/env bash
# install atelier into opencode config
set -e

ATELIER_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OPENCODE_DIR="$HOME/.config/opencode"

mkdir -p "$OPENCODE_DIR/command"
mkdir -p "$OPENCODE_DIR/agent"

# copy commands (prepend atelier- to namespace)
count_cmd=0
for cmd in "$ATELIER_ROOT/commands"/*.md; do
  name=$(basename "$cmd" .md)
  cp "$cmd" "$OPENCODE_DIR/command/atelier-$name.md"
  count_cmd=$((count_cmd + 1))
done

# copy agents (strip claude-specific frontmatter)
count_agent=0
for agent in "$ATELIER_ROOT/agents"/*.md; do
  name=$(basename "$agent" .md)
  # remove `model:` and `tools:` lines that are claude-code specific
  awk '
    /^---$/ { in_fm = !in_fm; print; next }
    in_fm && /^model:/ { next }
    in_fm && /^tools:/ { next }
    { print }
  ' "$agent" > "$OPENCODE_DIR/agent/atelier-$name.md"
  count_agent=$((count_agent + 1))
done

# write an opencode.json fragment if not present
if [ ! -f "$OPENCODE_DIR/opencode.json" ]; then
  cat > "$OPENCODE_DIR/opencode.json" << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "instructions": ["$OPENCODE_DIR/atelier-CONTEXT.md"]
}
EOF
fi

# global instructions file
cat > "$OPENCODE_DIR/atelier-CONTEXT.md" << EOF
# atelier context for opencode

source: $ATELIER_ROOT

## principles

$(cat "$ATELIER_ROOT/rules/common/principles.md")

## banned words

$(cat "$ATELIER_ROOT/rules/brand/banned-words.md")

## available commands (prefix: atelier-)

run \`/atelier-<name>\` for any of the commands in $OPENCODE_DIR/command/

available: $(ls "$OPENCODE_DIR/command" | sed 's/atelier-//;s/\.md$//' | tr '
' ' ')

## available agents

ask opencode to act as a atelier specialist. definitions in $OPENCODE_DIR/agent/
EOF

echo "atelier opencode adapter installed."
echo "  commands: $count_cmd"
echo "  agents:   $count_agent"
echo "  config:   $OPENCODE_DIR/opencode.json"
