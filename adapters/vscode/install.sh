#!/usr/bin/env bash
# install STUDIO as github copilot instructions
set -e

SCOPE="project"
while [[ $# -gt 0 ]]; do
  case $1 in
    --user) SCOPE="user"; shift ;;
    --project) SCOPE="project"; shift ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

STUDIO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "$SCOPE" = "user" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    TARGET_DIR="$HOME/Library/Application Support/Code/User"
  else
    TARGET_DIR="$HOME/.config/Code/User"
  fi
else
  TARGET_DIR="$PWD/.github"
fi

mkdir -p "$TARGET_DIR"
TARGET="$TARGET_DIR/copilot-instructions.md"

cat > "$TARGET" << EOF
# copilot instructions (STUDIO)

this project uses STUDIO. when writing code, documentation, prd, or copy, follow these rules.

## principles
$(cat "$STUDIO_ROOT/rules/common/principles.md")

## banned ai-tone phrases (never use)
$(cat "$STUDIO_ROOT/rules/brand/banned-words.md")

## prose rules
$(cat "$STUDIO_ROOT/rules/copy/anti-ai-tone.md")

## design constraints (when writing CSS/styles)
$(cat "$STUDIO_ROOT/rules/design/spacing.md")
$(cat "$STUDIO_ROOT/rules/design/type.md")
$(cat "$STUDIO_ROOT/rules/design/color.md")

## reference

full STUDIO source: $STUDIO_ROOT
when you need a skill or agent definition, read from there.
EOF

echo "STUDIO copilot instructions installed at $TARGET"
