#!/usr/bin/env bash
# install atelier as github copilot instructions
set -e

SCOPE="project"
while [[ $# -gt 0 ]]; do
  case $1 in
    --user) SCOPE="user"; shift ;;
    --project) SCOPE="project"; shift ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

ATELIER_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

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
# copilot instructions (atelier)

this project uses atelier. when writing code, documentation, prd, or copy, follow these rules.

## principles
$(cat "$ATELIER_ROOT/rules/common/principles.md")

## banned ai-tone phrases (never use)
$(cat "$ATELIER_ROOT/rules/brand/banned-words.md")

## prose rules
$(cat "$ATELIER_ROOT/rules/copy/anti-ai-tone.md")

## design constraints (when writing CSS/styles)
$(cat "$ATELIER_ROOT/rules/design/spacing.md")
$(cat "$ATELIER_ROOT/rules/design/type.md")
$(cat "$ATELIER_ROOT/rules/design/color.md")

## reference

full atelier source: $ATELIER_ROOT
when you need a skill or agent definition, read from there.
EOF

echo "atelier copilot instructions installed at $TARGET"
