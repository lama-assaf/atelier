#!/usr/bin/env bash
# install STUDIO into gemini cli config
set -e

SCOPE="user"
while [[ $# -gt 0 ]]; do
  case $1 in
    --project) SCOPE="project"; shift ;;
    --user) SCOPE="user"; shift ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

STUDIO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "$SCOPE" = "user" ]; then
  TARGET_DIR="$HOME/.gemini"
else
  TARGET_DIR="$PWD/.gemini"
fi

STUDIO_TARGET="$TARGET_DIR/studio"
mkdir -p "$STUDIO_TARGET"

# copy core rules files for @-import
cp "$STUDIO_ROOT/rules/common/principles.md" "$STUDIO_TARGET/principles.md"
cp "$STUDIO_ROOT/rules/brand/banned-words.md" "$STUDIO_TARGET/banned-words.md"
cp "$STUDIO_ROOT/rules/copy/anti-ai-tone.md" "$STUDIO_TARGET/anti-ai-tone.md"
cp "$STUDIO_ROOT/rules/copy/active-voice.md" "$STUDIO_TARGET/active-voice.md"

# write GEMINI.md with @-imports
GEMINI_MD="$TARGET_DIR/GEMINI.md"
cat > "$GEMINI_MD" << EOF
# GEMINI.md (STUDIO)

this environment uses STUDIO for design, product, and brand work.

## always-on rules

@./studio/principles.md
@./studio/banned-words.md
@./studio/anti-ai-tone.md
@./studio/active-voice.md

## skills (loaded on demand)

STUDIO source: $STUDIO_ROOT/skills

ask gemini to use a skill by name when relevant. skill definitions are at $STUDIO_ROOT/skills/<name>/SKILL.md.

## agents (roles)

STUDIO source: $STUDIO_ROOT/agents

ask gemini to act as a STUDIO specialist when relevant. role definitions at $STUDIO_ROOT/agents/<name>.md.

## commands (invocation patterns)

STUDIO source: $STUDIO_ROOT/commands

describe what you want using studio's vocabulary: "run a design review on...", "write a prd for...", "check this copy against our brand voice...".

## full source of truth

$STUDIO_ROOT
EOF

echo "STUDIO gemini adapter installed."
echo "  GEMINI.md: $GEMINI_MD"
echo "  context:   $STUDIO_TARGET"
