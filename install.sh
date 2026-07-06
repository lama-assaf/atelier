#!/usr/bin/env bash
# STUDIO installer for unix-like systems
set -e

STUDIO_ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="claude"
RULES="all"
WITH_HOOKS=1
ADAPTERS=""

usage() {
  cat << HELP
STUDIO installer

usage: ./install.sh [options]

options:
  --target <name>          claude (default)
  --rules <list>           comma-separated rule groups: all (default), common, design, product, brand, copy
  --no-hooks               skip writing hooks into ~/.claude/settings.json
  --with-adapters <list>   comma-separated: cursor, codex, opencode, gemini, zed, vscode
  --help                   show this message

examples:
  ./install.sh
  ./install.sh --rules common,design --with-adapters cursor
  ./install.sh --no-hooks
HELP
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --target) TARGET="$2"; shift 2 ;;
    --rules) RULES="$2"; shift 2 ;;
    --no-hooks) WITH_HOOKS=0; shift ;;
    --with-adapters) ADAPTERS="$2"; shift 2 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "unknown arg: $1"; usage; exit 1 ;;
  esac
done

echo "STUDIO installer"
echo "  source:    $STUDIO_ROOT"
echo "  target:    $TARGET"
echo "  rules:     $RULES"
echo "  hooks:     $([ $WITH_HOOKS -eq 1 ] && echo 'yes' || echo 'no')"
echo "  adapters:  ${ADAPTERS:-none}"
echo ""

# install claude code plugin (symlink-style for now, since the plugin is local)
if [ "$TARGET" = "claude" ]; then
  CLAUDE_DIR="$HOME/.claude"
  mkdir -p "$CLAUDE_DIR"
  if [ ! -e "$CLAUDE_DIR/studio" ]; then
    ln -s "$STUDIO_ROOT" "$CLAUDE_DIR/studio"
    echo "linked $CLAUDE_DIR/studio -> $STUDIO_ROOT"
  else
    echo "$CLAUDE_DIR/studio already exists (skipping)"
  fi

  # hooks setup
  if [ $WITH_HOOKS -eq 1 ]; then
    SETTINGS="$CLAUDE_DIR/settings.json"
    HOOKS_TEMPLATE="$STUDIO_ROOT/hooks/hooks.json"

    # generate a hooks config with STUDIO_ROOT resolved
    GENERATED_HOOKS="$CLAUDE_DIR/studio-hooks.json"
    sed "s|\${STUDIO_ROOT}|$STUDIO_ROOT|g" "$HOOKS_TEMPLATE" > "$GENERATED_HOOKS"
    echo "wrote $GENERATED_HOOKS"
    echo ""
    echo "next: merge the hooks key from $GENERATED_HOOKS into $SETTINGS"
    echo "or run: jq -s '.[0] * {hooks: .[1].hooks}' $SETTINGS $GENERATED_HOOKS > $SETTINGS.new && mv $SETTINGS.new $SETTINGS"
    echo "       (requires jq, backs up nothing — review first)"
  fi
fi

# adapters
if [ -n "$ADAPTERS" ]; then
  IFS=',' read -ra ADAPTER_LIST <<< "$ADAPTERS"
  for a in "${ADAPTER_LIST[@]}"; do
    a_trim=$(echo "$a" | tr -d '[:space:]')
    if [ -x "$STUDIO_ROOT/adapters/$a_trim/install.sh" ]; then
      echo ""
      echo "running adapter: $a_trim"
      bash "$STUDIO_ROOT/adapters/$a_trim/install.sh"
    else
      echo "unknown adapter: $a_trim (expected one of: cursor, codex, opencode, gemini, zed, vscode)"
    fi
  done
fi

echo ""
echo "STUDIO installed."
echo "see $STUDIO_ROOT/STUDIO.md for the operator handbook."
