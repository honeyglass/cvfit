#!/bin/sh
# @file install.sh
# @brief Installs oriko, its command and its agent skill; run it again to update.
# @description Clones oriko into ~/.local/share/oriko, installs its dependencies with the pnpm
# that package.json pins and links the command oriko into ~/.local/bin. The skill comes from the
# skills CLI behind skills.sh; --no-skill leaves it out. A PDF needs LibreOffice: the script says
# how to get it, and --pdf installs it too. The script never replaces a file it did not write.
#
# @example curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh
# @example curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh -s -- --no-skill
# @example curl -fsSL https://raw.githubusercontent.com/honeyglass/oriko/main/install.sh | sh -s -- --pdf
set -eu

# ORIKO_REPOSITORY points the script at another copy, as the install test does with its checkout.
REPOSITORY="${ORIKO_REPOSITORY:-https://github.com/honeyglass/oriko.git}"
DIR="${XDG_DATA_HOME:-$HOME/.local/share}/oriko"
BIN_DIR="$HOME/.local/bin"
# The skills CLI of skills.sh, pinned to a version at least three days old.
SKILLS_CLI='skills@1.8.1'

# The whole script sits in functions, and main runs last: a download cut short runs nothing.
main() {
  with_skill=yes with_pdf=no
  for option in "$@"; do
    case "$option" in
      --no-skill) with_skill=no ;;
      --pdf) with_pdf=yes ;;
      *) fail "unknown option: $option; the options are --no-skill and --pdf." ;;
    esac
  done
  need_node
  need_command git
  fetch_oriko
  install_dependencies
  link "$DIR/bin/oriko.ts" "$BIN_DIR/oriko" 'command'
  "$BIN_DIR/oriko" schema >/dev/null || fail "oriko does not start; see the output above. Nothing else was changed."
  say "installed in $DIR"
  if [ "$with_skill" = yes ]; then install_skill; fi
  pdf_support "$with_pdf"
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

# The skills CLI installs the skill for every agent it finds, Claude Code among them, and a later
# run updates it. With ORIKO_REPOSITORY it installs the skill of that copy instead of GitHub's.
install_skill() {
  need_command npx
  source='honeyglass/oriko'
  if [ -n "${ORIKO_REPOSITORY:-}" ]; then source="$DIR"; fi
  say "adding the skill with the skills CLI of skills.sh ($SKILLS_CLI)"
  npx --yes "$SKILLS_CLI" add "$source" -g -y ||
    fail "the skills CLI could not add the skill; the command oriko works. Add the skill later with: npx skills add honeyglass/oriko -g -y"
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

# oriko knows where LibreOffice keeps its program on each system, so the script asks oriko; an
# answer it cannot give counts as no LibreOffice.
has_libreoffice() {
  node --input-type=module -e "
    import { existsSync } from 'node:fs';
    import { pathToFileURL } from 'node:url';
    const pdf = pathToFileURL(process.argv[1] + '/pdf/convert.ts').href;
    const { sofficePaths } = await import(pdf);
    process.exit(sofficePaths().some(path => existsSync(path)) ? 0 : 1);" "$DIR" 2>/dev/null
}

# A .docx needs nothing more; a PDF needs LibreOffice, which only --pdf installs, as it is large.
pdf_support() {
  if has_libreoffice; then
    say 'LibreOffice found: oriko build --out cv.pdf writes the PDF'
    return
  fi
  command=$(libreoffice_command)
  if [ -z "$command" ]; then
    say 'a PDF needs LibreOffice: get it from https://www.libreoffice.org/download'
    return
  fi
  if [ "$1" = no ]; then
    say "a PDF needs LibreOffice: $command, or run this script again with --pdf"
    return
  fi
  say "installing LibreOffice: $command"
  sh -c "$command" || fail "LibreOffice could not be installed; the command oriko works and writes the .docx."
}

# The command of the system's package manager; empty when the script knows none.
libreoffice_command() {
  if [ "$(uname -s)" = Darwin ] && command -v brew >/dev/null 2>&1; then
    echo 'brew install --cask libreoffice'
  elif command -v apt-get >/dev/null 2>&1; then
    echo 'sudo apt-get install -y libreoffice-writer'
  elif command -v dnf >/dev/null 2>&1; then
    echo 'sudo dnf install -y libreoffice-writer'
  fi
}

path_hint() {
  case ":$PATH:" in
    *":$BIN_DIR:"*) say 'run oriko schema to see every command' ;;
    *) say "add $BIN_DIR to your PATH, then run oriko schema to see every command" ;;
  esac
}

main "$@"
