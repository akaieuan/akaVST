#!/usr/bin/env bash
#
# Cross-repo helper for the akaVST parent.
#
# The three plugins are submodules, so each one is a real repo with its own
# remote: `cd bleep && git push` already goes to akaBleep-VST. This script is
# for the things that span all three, plus the one submodule chore that is easy
# to forget (restaging the parent's pointers after a child moves).
#
#   ./scripts/vst.sh status            working tree + ahead/behind for each plugin
#   ./scripts/vst.sh pull              fast-forward every plugin's main
#   ./scripts/vst.sh push              push every plugin that is ahead of origin
#   ./scripts/vst.sh sync              restage parent pointers to each plugin's HEAD
#   ./scripts/vst.sh foreach <cmd...>  run a command in each plugin repo

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGINS=(bleep enzyme i4)

cd "$ROOT"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
dim() { printf '\033[2m%s\033[0m\n' "$1"; }

cmd_status() {
  for p in "${PLUGINS[@]}"; do
    bold "$p"
    if [ ! -e "$p/.git" ]; then
      dim "  not initialised — run: git submodule update --init $p"
      continue
    fi
    local branch dirty ahead behind
    branch="$(git -C "$p" rev-parse --abbrev-ref HEAD)"
    dirty="$(git -C "$p" status --porcelain | wc -l | tr -d ' ')"
    git -C "$p" fetch --quiet origin 2>/dev/null || dim "  (fetch failed, counts may be stale)"
    ahead="$(git -C "$p" rev-list --count "origin/$branch..$branch" 2>/dev/null || echo '?')"
    behind="$(git -C "$p" rev-list --count "$branch..origin/$branch" 2>/dev/null || echo '?')"
    echo "  branch     $branch"
    echo "  changes    $dirty file(s)"
    echo "  vs origin  $ahead ahead / $behind behind"
    echo "  remote     $(git -C "$p" remote get-url origin)"
  done

  bold "parent"
  # A "modified" submodule entry here means the plugin's HEAD has moved away
  # from the commit this repo records. `sync` is what resolves it.
  local drift
  drift="$(git diff --name-only -- "${PLUGINS[@]}" | wc -l | tr -d ' ')"
  echo "  pointer drift  $drift plugin(s) — run: ./scripts/vst.sh sync"
}

cmd_pull() {
  for p in "${PLUGINS[@]}"; do
    bold "$p"
    git -C "$p" pull --ff-only || dim "  not fast-forwardable, resolve by hand"
  done
}

cmd_push() {
  for p in "${PLUGINS[@]}"; do
    local branch ahead
    branch="$(git -C "$p" rev-parse --abbrev-ref HEAD)"
    ahead="$(git -C "$p" rev-list --count "origin/$branch..$branch" 2>/dev/null || echo 0)"
    if [ "$ahead" = "0" ]; then
      dim "$p — nothing to push"
      continue
    fi
    bold "$p — pushing $ahead commit(s) to $(git -C "$p" remote get-url origin)"
    git -C "$p" push origin "$branch"
  done
  dim "now run: ./scripts/vst.sh sync   (records the new commits in the parent)"
}

cmd_sync() {
  git add -- "${PLUGINS[@]}"
  local staged
  staged="$(git diff --cached --name-only -- "${PLUGINS[@]}")"
  if [ -z "$staged" ]; then
    dim "parent pointers already match every plugin HEAD"
    return
  fi
  bold "staged new pointers:"
  for p in $staged; do echo "  $p → $(git -C "$p" rev-parse --short HEAD)"; done
  dim "commit the parent to record them"
}

cmd_foreach() {
  [ "$#" -gt 0 ] || { echo "usage: vst.sh foreach <cmd...>" >&2; exit 2; }
  local failed=0
  for p in "${PLUGINS[@]}"; do
    bold "$p"
    ( cd "$p" && "$@" ) || failed=1
  done
  return $failed
}

case "${1:-status}" in
  status) cmd_status ;;
  pull) cmd_pull ;;
  push) cmd_push ;;
  sync) cmd_sync ;;
  foreach) shift; cmd_foreach "$@" ;;
  *) sed -n '3,16p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2 ;;
esac
