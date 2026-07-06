#!/usr/bin/env bash
# install STUDIO content as cursor rules
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
  TARGET="$HOME/.cursor/rules/studio"
else
  TARGET="$PWD/.cursor/rules/studio"
fi

mkdir -p "$TARGET"

# always-on: principles + banned-words
cat > "$TARGET/principles.mdc" << EOF
---
description: STUDIO universal principles for design, product, brand work
alwaysApply: true
---

$(cat "$STUDIO_ROOT/rules/common/principles.md")
EOF

cat > "$TARGET/banned-words.mdc" << EOF
---
description: STUDIO banned words and ai-tone patterns to avoid in all writing
alwaysApply: true
---

$(cat "$STUDIO_ROOT/rules/brand/banned-words.md")
EOF

# auto-attached: design rules for CSS/figma files
for rule in spacing type color motion accessibility; do
  if [ -f "$STUDIO_ROOT/rules/design/$rule.md" ]; then
    cat > "$TARGET/design-$rule.mdc" << EOF
---
description: STUDIO design rule - $rule
globs: ["**/*.css", "**/*.scss", "**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte"]
---

$(cat "$STUDIO_ROOT/rules/design/$rule.md")
EOF
  fi
done

# auto-attached: copy rules for markdown / prose files
for rule in sentence-rhythm anti-ai-tone active-voice; do
  if [ -f "$STUDIO_ROOT/rules/copy/$rule.md" ]; then
    cat > "$TARGET/copy-$rule.mdc" << EOF
---
description: STUDIO copy rule - $rule
globs: ["**/*.md", "**/*.mdx", "**/*.txt"]
---

$(cat "$STUDIO_ROOT/rules/copy/$rule.md")
EOF
  fi
done

# agent-requested: skills as referenceable rules
for skill_dir in "$STUDIO_ROOT/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ]; then
    cat > "$TARGET/skill-$skill_name.mdc" << EOF
---
description: STUDIO skill - $skill_name (reference when needed)
---

$(cat "$skill_dir/SKILL.md")
EOF
  fi
done

echo "STUDIO cursor adapter installed at $TARGET"
echo "rules: $(ls "$TARGET" | wc -l | tr -d ' ')"
