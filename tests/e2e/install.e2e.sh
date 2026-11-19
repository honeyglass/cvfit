#!/bin/sh
# @file tests/e2e/install.e2e.sh
# @brief Runs install.sh in empty home folders: install, update, a foreign file, and the options.
# @description The script installs this checkout through ORIKO_REPOSITORY, so the test checks the
# commit it runs on, not what GitHub serves. The skills CLI runs with its telemetry off, so no
# test run counts as an install on skills.sh.
set -eu

ROOT=$(cd "$(dirname "$0")/../.." && pwd -P)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

main() {
  installs_command_and_skill
  updates_an_existing_install
  keeps_a_foreign_file
  leaves_the_skill_out_on_request
  refuses_an_unknown_option
  printf 'ok: install.sh passed all cases\n'
}

# Every case gets its own home folder; Corepack and npm share one cache, so each tool is fetched once.
run_install() {
  name=$1
  shift
  HOME="$WORK/$name" XDG_DATA_HOME='' COREPACK_HOME="$WORK/corepack" npm_config_cache="$WORK/npm" \
    DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 ORIKO_REPOSITORY="file://$ROOT" sh "$ROOT/install.sh" "$@"
}

fail() {
  printf 'not ok: %s\n' "$1" >&2
  exit 1
}

installs_command_and_skill() {
  run_install fresh >"$WORK/fresh.log" || fail 'a fresh install ends with an error'
  "$WORK/fresh/.local/bin/oriko" schema | grep -q '"ok":true' || fail 'oriko schema does not answer ok'
  grep -qx 'name: oriko' "$WORK/fresh/.agents/skills/oriko/SKILL.md" || fail 'the skills CLI did not add the skill'
  # A user gets the skill of oriko and nothing else.
  [ "$(ls "$WORK/fresh/.agents/skills")" = oriko ] || fail 'the install added more skills than oriko'
  # With LibreOffice the script says so, without it how to get it; either way a PDF is named.
  grep -q 'oriko: .*LibreOffice' "$WORK/fresh.log" || fail 'the install does not say what a PDF needs'
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

leaves_the_skill_out_on_request() {
  run_install plain --no-skill || fail 'an install with --no-skill ends with an error'
  "$WORK/plain/.local/bin/oriko" schema | grep -q '"ok":true' || fail 'oriko does not start without the skill'
  [ ! -e "$WORK/plain/.agents" ] || fail '--no-skill still added the skill'
}

refuses_an_unknown_option() {
  if run_install odd --skill-only; then fail 'an unknown option was accepted'; fi
  [ ! -e "$WORK/odd/.local" ] || fail 'a refused option still installed something'
}

main "$@"
