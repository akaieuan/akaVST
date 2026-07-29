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
#   ./scripts/vst.sh build [target..]  configure + build (plugins, or `skeleton`)
#   ./scripts/vst.sh build --clean t   wipe a stale build cache first
#   ./scripts/vst.sh run <plugin|all>  launch Standalone apps, several at once
#
# `build` and `run` exist because a reskin you cannot look at is a reskin you
# cannot verify. The plugins are native apps, not servers, so they are outside
# .claude/launch.json — that is for the web dev server, which is the only actual
# server here.

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

# The Standalone target each plugin's CMake produces. Not derivable from the
# directory name: CMake uses the project() name, which is capitalised and, for
# bleep, differs from both the directory and the PRODUCT_NAME ("akaBleep").
target_of() {
  case "$1" in
    bleep) echo "Bleep" ;;
    enzyme) echo "Enzyme" ;;
    i4) echo "i4" ;;
    *) echo "" ;;
  esac
}

cmd_build() {
  local clean=0
  local targets=()
  for a in "$@"; do
    case "$a" in
      --clean) clean=1 ;;
      *) targets+=("$a") ;;
    esac
  done
  [ "${#targets[@]}" -gt 0 ] || targets=("${PLUGINS[@]}")
  local failed=0

  for t in "${targets[@]}"; do
    bold "$t"
    if [ ! -d "$t" ]; then
      dim "  no such directory"
      failed=1
      continue
    fi

    # A CMake cache records the absolute source path it was generated from, and
    # refuses to be reused if that path moved. Moving the plugins into this
    # parent as submodules invalidated all three at once — and because the
    # failure is a configure error, the previously-built .app just sits there
    # looking fine. That is how a binary ends up two months behind its source
    # with nothing obviously broken, so name it loudly rather than dumping
    # CMake's wording.
    local cache="$t/build/CMakeCache.txt"
    if [ -f "$cache" ]; then
      local was now
      was="$(sed -n 's/^CMAKE_HOME_DIRECTORY:INTERNAL=//p' "$cache")"
      now="$(cd "$t" && pwd)"
      if [ -n "$was" ] && [ "$was" != "$now" ]; then
        if [ "$clean" = "1" ]; then
          dim "  stale cache from $was — clearing"
          rm -rf "$t/build"
        else
          dim "  STALE BUILD CACHE — nothing has compiled here since the move."
          dim "    cache was generated from: $was"
          dim "    source is now at:         $now"
          dim "    any .app in $t/build is older than that and is NOT your source."
          dim "    fix: ./scripts/vst.sh build --clean $t   (re-downloads JUCE, a few minutes)"
          failed=1
          continue
        fi
      fi
    fi

    # First configure downloads ~150MB of JUCE and takes a while; after that it
    # is a no-op, so this is safe to run every time.
    cmake -S "$t" -B "$t/build" -DCMAKE_BUILD_TYPE=Release >/dev/null \
      || { dim "  configure failed"; failed=1; continue; }
    cmake --build "$t/build" --config Release \
      || { dim "  build failed"; failed=1; continue; }
  done
  return $failed
}

cmd_run() {
  local args=("$@")
  [ "${#args[@]}" -gt 0 ] || { echo "usage: vst.sh run <bleep|enzyme|i4|all>" >&2; exit 2; }
  [ "${args[0]}" = "all" ] && args=("${PLUGINS[@]}")

  # Several at once is the point: these are ordinary processes, not servers, so
  # nothing collides and each keeps its own settings under its own bundle id.
  # Comparing all three side by side is the only way to tell whether they read
  # as one family.
  local failed=0
  for p in "${args[@]}"; do
    run_one "$p" || failed=1
  done
  return $failed
}

run_one() {
  local p="${1:-}"
  local target
  target="$(target_of "$p")"
  [ -n "$target" ] || { echo "unknown plugin: $p" >&2; return 1; }

  # Glob rather than construct the bundle name. The artefacts DIRECTORY uses the
  # CMake target ("Bleep_artefacts") but the bundle uses PRODUCT_NAME
  # ("akaBleep.app") — they differ, and they have differed at different times:
  # pre-rebrand builds left a Bleep.app sitting next to today's akaBleep.app.
  # Guessing the name finds the wrong one and reports success, which is the
  # single worst outcome for a tool whose whole job is "show me the new build".
  #
  # Release first, then the debug configs, since `build` writes Release.
  local app
  for cfg in Release RelWithDebInfo Debug; do
    local dir="$p/build/${target}_artefacts/$cfg/Standalone"
    [ -d "$dir" ] || continue

    # Newest first, so a leftover bundle from an older naming scheme loses.
    app="$(find "$dir" -maxdepth 1 -name '*.app' -print0 2>/dev/null \
           | xargs -0 -I{} stat -f '%m %N' {} 2>/dev/null \
           | sort -rn | head -1 | cut -d' ' -f2-)"
    [ -n "$app" ] || continue

    local others
    others="$(find "$dir" -maxdepth 1 -name '*.app' | wc -l | tr -d ' ')"

    # Time the EXECUTABLE, not the bundle directory. A .app's mtime only moves
    # when entries are added to or removed from it, so relinking in place leaves
    # the directory reading hours old while the binary inside is a minute old.
    # Reporting that stale number is precisely the lie this command exists to
    # prevent, so read the Mach-O that will actually run.
    local exe
    exe="$app/Contents/MacOS/$(/usr/libexec/PlistBuddy -c 'Print CFBundleExecutable' \
                                 "$app/Contents/Info.plist" 2>/dev/null)"
    [ -f "$exe" ] || exe="$app"

    bold "$p — launching $cfg build"
    dim "  $app"
    dim "  built $(date -r "$exe" '+%Y-%m-%d %H:%M:%S')"
    [ "$others" -gt 1 ] && dim "  ($((others - 1)) older bundle(s) alongside it — stale, ignored)"
    open "$app"
    return 0
  done

  echo "no Standalone build found for $p — run: ./scripts/vst.sh build $p" >&2
  return 1
}

case "${1:-status}" in
  status) cmd_status ;;
  pull) cmd_pull ;;
  push) cmd_push ;;
  sync) cmd_sync ;;
  foreach) shift; cmd_foreach "$@" ;;
  build) shift; cmd_build "$@" ;;
  run) shift; cmd_run "$@" ;;
  *) sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2 ;;
esac
