#!/bin/sh
# @file install.sh
# @brief Installs oriko, its command and its agent skill; run it again to update.
# @description Clones oriko into ~/.local/share/oriko, installs its dependencies with the pnpm
# that package.json pins, links the command oriko into ~/.local/bin and, when Claude Code is
# set up, the skill into ~/.claude/skills. It never replaces a file it did not write.
#
# @example curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh
set -eu

# ORIKO_REPOSITORY points the script at another copy, as the install test does with its checkout.
REPOSITORY="${ORIKO_REPOSITORY:-https://github.com/honeyglass/oriko.git}"
DIR="${XDG_DATA_HOME:-$HOME/.local/share}/oriko"
BIN_DIR="$HOME/.local/bin"
SKILLS_DIR="$HOME/.claude/skills"

# The whole script sits in functions, and main runs last: a download cut short runs nothing.
main() {
  need_node
  need_command git
  fetch_oriko
  install_dependencies
  link "$DIR/bin/oriko.ts" "$BIN_DIR/oriko" 'command'
  link_skill
  "$BIN_DIR/oriko" schema >/dev/null || fail "oriko does not start; see the output above. Nothing else was changed."
  say "installed in $DIR"
  path_hint
}

say() { printf 'oriko: %s\n' "$*"; }
fail() {
  printf 'oriko: %s\n' "$*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is missing; install it and run this script again."
}

# Node 24 runs the TypeScript files of oriko as they are, so nothing is compiled.
need_node() {
  need_command node
  major=$(node -p 'process.versions.node.split(".")[0]')
  [ "$major" -ge 24 ] || fail "oriko needs Node 24 or newer, found $(node --version)."
}

# A new folder gets a clone; an existing checkout moves to the newest commit of the default
# branch. git refuses that move over local changes, so nothing of yours is overwritten.
fetch_oriko() {
  if [ -d "$DIR/.git" ]; then
    git -C "$DIR" fetch --quiet --depth 1 origin HEAD
    git -C "$DIR" checkout --quiet --detach FETCH_HEAD
    return
  fi
  [ -e "$DIR" ] && fail "$DIR exists and is no oriko checkout; move it away and run this script again."
  mkdir -p "$(dirname "$DIR")"
  git clone --quiet --depth 1 "$REPOSITORY" "$DIR"
}

# Corepack runs the pnpm that package.json names, and refuses one whose sha512 differs.
# pnpm-workspace.yaml keeps every install script and every fresh release out.
install_dependencies() {
  if command -v corepack >/dev/null 2>&1; then
    (cd "$DIR" && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm install --frozen-lockfile --prod)
    return
  fi
  need_command pnpm
  (cd "$DIR" && pnpm install --frozen-lockfile --prod)
}

# The skill finds the oriko folder through this link, so it works in every folder.
link_skill() {
  if [ -d "$HOME/.claude" ]; then
    link "$DIR/.claude/skills/oriko" "$SKILLS_DIR/oriko" 'skill'
    return
  fi
  say "Claude Code is not set up, so no skill was linked; run this script again after setting it up."
}

# A link that already points at oriko stays; anything else at that path is the user's and stays too.
link() {
  target=$1 name=$2 what=$3
  if [ -L "$name" ] && [ "$(readlink "$name")" = "$target" ]; then
    say "$what: $name"
    return
  fi
  [ -e "$name" ] || [ -L "$name" ] && fail "$name exists and is not the $what of oriko; move it away and run this script again."
  mkdir -p "$(dirname "$name")"
  ln -s "$target" "$name"
  say "$what: $name"
}

path_hint() {
  case ":$PATH:" in
    *":$BIN_DIR:"*) say 'run oriko schema to see every command' ;;
    *) say "add $BIN_DIR to your PATH, then run oriko schema to see every command" ;;
  esac
}

main "$@"
