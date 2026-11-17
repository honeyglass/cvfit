#!/bin/sh
# @file tests/e2e/install.e2e.sh
# @brief Runs install.sh in empty home folders: a fresh install, an update and a foreign file.
# @description The script installs this checkout through ORIKO_REPOSITORY, so the test checks the
# commit it runs on, not what GitHub serves.
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

main() {
  installs_command_and_skill
  updates_an_existing_install
  keeps_a_foreign_file
  links_no_skill_without_claude_code
  printf 'ok: install.sh passed all cases\n'
}

# Every case gets its own home folder; Corepack shares one cache, so pnpm is fetched once.
run_install() {
  HOME="$WORK/$1" XDG_DATA_HOME='' COREPACK_HOME="$WORK/corepack" ORIKO_REPOSITORY="file://$ROOT" \
    sh "$ROOT/install.sh"
}

fail() {
  printf 'not ok: %s\n' "$1" >&2
  exit 1
}

installs_command_and_skill() {
  mkdir -p "$WORK/fresh/.claude"
  run_install fresh || fail 'a fresh install ends with an error'
  "$WORK/fresh/.local/bin/oriko" schema | grep -q '"ok":true' || fail 'oriko schema does not answer ok'
  [ -f "$WORK/fresh/.claude/skills/oriko/SKILL.md" ] || fail 'the skill is not linked'
}

updates_an_existing_install() {
  run_install fresh || fail 'a second run, the update, ends with an error'
  "$WORK/fresh/.local/bin/oriko" schema | grep -q '"ok":true' || fail 'oriko does not start after the update'
}

keeps_a_foreign_file() {
  mkdir -p "$WORK/foreign/.local/bin"
  printf 'mine\n' >"$WORK/foreign/.local/bin/oriko"
  if run_install foreign; then fail 'the install replaced a file it did not write'; fi
  [ "$(cat "$WORK/foreign/.local/bin/oriko")" = 'mine' ] || fail 'the foreign file changed'
}

links_no_skill_without_claude_code() {
  run_install plain || fail 'an install without Claude Code ends with an error'
  [ ! -e "$WORK/plain/.claude" ] || fail 'the install created ~/.claude'
}

main "$@"
