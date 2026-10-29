#!/usr/bin/env bash
# Copy an export folder into parity/r_outputs/<name>/, recompressing files over 100 KB with xz.
# Usage: bash parity/r/collect_exports.sh <source dir> <name>
# The MD5 list of the uncompressed originals is kept in <name>/uncompressed.md5.
set -euo pipefail
src="$1"; name="$2"
dst="parity/r_outputs/$name"
mkdir -p "$dst"
for f in "$src"/*; do
  base="$(basename "$f")"
  size=$(stat -f %z "$f")
  case "$base" in
    *.gz) if (( size > 100000 )); then gzip -dc "$f" | xz -9e -c > "$dst/${base%.gz}.xz"; else cp "$f" "$dst/$base"; fi ;;
    *) if (( size > 100000 )); then xz -9e -c "$f" > "$dst/$base.xz"; else cp "$f" "$dst/$base"; fi ;;
  esac
done
(cd "$src" && find . -type f | sort | while read -r f; do
  case "$f" in *.gz) printf "%s  %s\n" "$(gzip -dc "$f" | md5 -q)" "${f#./}" ;; *) printf "%s  %s\n" "$(md5 -q "$f")" "${f#./}" ;; esac
done) > "$dst/uncompressed.md5"
du -sh "$dst"
