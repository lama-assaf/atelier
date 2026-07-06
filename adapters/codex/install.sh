#!/usr/bin/env bash
# install STUDIO as codex AGENTS.md
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
  TARGET_DIR="$HOME/.codex"
else
  TARGET_DIR="$PWD"
fi

mkdir -p "$TARGET_DIR"
TARGET="$TARGET_DIR/AGENTS.md"

cat > "$TARGET" << EOF
# AGENTS.md (STUDIO)

this project uses STUDIO for design, product, and brand work. STUDIO source: $STUDIO_ROOT

## principles (always apply)

$(cat "$STUDIO_ROOT/rules/common/principles.md")

## banned words

$(cat "$STUDIO_ROOT/rules/brand/banned-words.md")

## anti-ai tone

$(cat "$STUDIO_ROOT/rules/copy/anti-ai-tone.md")

## active voice

$(cat "$STUDIO_ROOT/rules/copy/active-voice.md")

## available skills

invoke by name. each skill has its own workflow at $STUDIO_ROOT/skills/<name>/SKILL.md:

- design-review, design-system-audit, accessibility-audit, figma-handoff-spec, component-spec, motion-direction, responsive-rules, dark-mode-pairing, iconography-system, data-viz-design
- prd-writing, spec-writing, research-synthesis, jtbd-framing, roadmap-planning, feature-scoping, metric-design, ab-test-design, competitive-analysis, launch-planning
- brand-voice-extraction, naming-generation, tagline-writing, positioning-statement, messaging-architecture, value-prop-writing, microcopy-writing, landing-copy, case-study-writing, release-narrative

## agents (roles)

ask codex to act as one of these specialists when relevant. full definitions in $STUDIO_ROOT/agents/:

- design-reviewer, design-system-auditor, accessibility-reviewer
- brand-voice-keeper, copywriter, microcopy-writer
- product-strategist, ux-research-synthesizer, competitor-analyst
- naming-generator, narrative-architect, taxonomy-architect
- release-narrator, case-study-writer, pitch-deck-writer

## reference

full source of truth: $STUDIO_ROOT
EOF

echo "STUDIO codex adapter installed at $TARGET"
