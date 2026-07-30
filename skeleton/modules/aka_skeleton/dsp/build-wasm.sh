#!/usr/bin/env bash
# Compile the engines to WebAssembly for Socket.
#
# The plugins do not need this — they compile the same headers as plain C++.
# This target exists so Socket previews the exact DSP the plugin ships rather
# than a JavaScript approximation of it, which is the whole reason the DSP is
# written without JUCE.
#
# Two flags here are about the AudioWorklet, not about the DSP.
#
# No EXPORT_ES6: a worklet has no module loader, so the glue is evaluated as
# source text — and the ES6 flavour emits `import.meta.url` and a top-level
# `export`, both syntax errors in that position. The plain MODULARIZE build is a
# bare function declaration, which is exactly what can be evaluated.
#
# SINGLE_FILE embeds the wasm in the glue. A worklet cannot fetch, and handing
# the bytes across by postMessage means relying on emscripten to notice them —
# which it did not, and the failure it reports is "both async and sync fetching
# failed", with no hint that the binary you supplied was the thing ignored.
# Embedding removes the whole class of problem for about 15KB.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
# Socket sits beside akaVST, not inside it.
out="${1:-$here/../../../../../Socket/public/engine}"
mkdir -p "$out"

emcc "$here/wasm.cpp" \
  -std=c++17 -O3 -flto \
  -ffast-math -fno-exceptions -fno-rtti \
  -s WASM=1 \
  -s SINGLE_FILE=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME=createEngine \
  -s ENVIRONMENT=web,worker \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16MB \
  -s EXPORTED_RUNTIME_METHODS='["HEAPF32","HEAPU8"]' \
  -s EXPORTED_FUNCTIONS='["_aka_prepare","_aka_begin_blocks","_aka_push_block","_aka_commit_blocks","_aka_set_param","_aka_note_on","_aka_note_off","_aka_all_notes_off","_aka_process","_aka_active_voices","_malloc","_free"]' \
  -o "$out/engine.js"

rm -f "$out/engine.wasm"   # SINGLE_FILE embeds it; a stale copy only confuses
echo "✓ $out/engine.js ($(du -h "$out/engine.js" | cut -f1), wasm embedded)"
