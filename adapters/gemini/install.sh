#!/usr/bin/env bash
# install atelier into gemini cli config
set -e

SCOPE="user"
while [[ $# -gt 0 ]]; do
  case $1 in
    --project) SCOPE="project"; shift ;;
    --user) SCOPE="user"; shift ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

ATELIER_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "$SCOPE" = "user" ]; then
  TARGET_DIR="$HOME/.gemini"
else
  TARGET_DIR="$PWD/.gemini"
fi

atelier_TARGET="$TARGET_DIR/atelier"
mkdir -p "$atelier_TARGET"

# copy core rules files for @-import
cp "$ATELIER_ROOT/rules/common/principles.md" "$atelier_TARGET/principles.md"
cp "$ATELIER_ROOT/rules/brand/banned-words.md" "$atelier_TARGET/banned-words.md"
cp "$ATELIER_ROOT/rules/copy/anti-ai-tone.md" "$atelier_TARGET/anti-ai-tone.md"
cp "$ATELIER_ROOT/rules/copy/active-voice.md" "$atelier_TARGET/active-voice.md"

# write GEMINI.md with @-imports
GEMINI_MD="$TARGET_DIR/GEMINI.md"
cat > "$GEMINI_MD" << EOF
# GEMINI.md (atelier)

this environment uses atelier for design, product, and brand work.

## always-on rules

@./atelier/principles.md
@./atelier/banned-words.md
@./atelier/anti-ai-tone.md
@./atelier/active-voice.md

## skills (loaded on demand)

atelier source: $ATELIER_ROOT/skills

ask gemini to use a skill by name when relevant. skill definitions are at $ATELIER_ROOT/skills/<name>/SKILL.md.

## agents (roles)

atelier source: $ATELIER_ROOT/agents

ask gemini to act as a atelier specialist when relevant. role definitions at $ATELIER_ROOT/agents/<name>.md.

## commands (invocation patterns)

atelier source: $ATELIER_ROOT/commands

describe what you want using atelier's vocabulary: "run a design review on...", "write a prd for...", "check this copy against our brand voice...".

## full source of truth

$ATELIER_ROOT
EOF

echo "atelier gemini adapter installed."
echo "  GEMINI.md: $GEMINI_MD"
echo "  context:   $atelier_TARGET"
