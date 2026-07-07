#!/usr/bin/env bash
# install atelier content as cursor rules
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
  TARGET="$HOME/.cursor/rules/atelier"
else
  TARGET="$PWD/.cursor/rules/atelier"
fi

mkdir -p "$TARGET"

# always-on: principles + banned-words
cat > "$TARGET/principles.mdc" << EOF
---
description: atelier universal principles for design, product, brand work
alwaysApply: true
---

$(cat "$ATELIER_ROOT/rules/common/principles.md")
EOF

cat > "$TARGET/banned-words.mdc" << EOF
---
description: atelier banned words and ai-tone patterns to avoid in all writing
alwaysApply: true
---

$(cat "$ATELIER_ROOT/rules/brand/banned-words.md")
EOF

# auto-attached: design rules for CSS/figma files
for rule in spacing type color motion accessibility; do
  if [ -f "$ATELIER_ROOT/rules/design/$rule.md" ]; then
    cat > "$TARGET/design-$rule.mdc" << EOF
---
description: atelier design rule - $rule
globs: ["**/*.css", "**/*.scss", "**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte"]
---

$(cat "$ATELIER_ROOT/rules/design/$rule.md")
EOF
  fi
done

# auto-attached: copy rules for markdown / prose files
for rule in sentence-rhythm anti-ai-tone active-voice; do
  if [ -f "$ATELIER_ROOT/rules/copy/$rule.md" ]; then
    cat > "$TARGET/copy-$rule.mdc" << EOF
---
description: atelier copy rule - $rule
globs: ["**/*.md", "**/*.mdx", "**/*.txt"]
---

$(cat "$ATELIER_ROOT/rules/copy/$rule.md")
EOF
  fi
done

# agent-requested: skills as referenceable rules
for skill_dir in "$ATELIER_ROOT/skills"/*/; do
  skill_name=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ]; then
    cat > "$TARGET/skill-$skill_name.mdc" << EOF
---
description: atelier skill - $skill_name (reference when needed)
---

$(cat "$skill_dir/SKILL.md")
EOF
  fi
done

echo "atelier cursor adapter installed at $TARGET"
echo "rules: $(ls "$TARGET" | wc -l | tr -d ' ')"
