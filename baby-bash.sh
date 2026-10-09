#!/usr/bin/env bash
# Launch Baby Bash full screen in a throwaway Chromium window.
# The app requests fullscreen + keyboard lock on the first key press; hold Esc to exit.
DIR="$(cd "$(dirname "$0")" && pwd)"
exec chromium \
  --app="file://$DIR/index.html" \
  --start-fullscreen \
  --user-data-dir="${XDG_CACHE_HOME:-$HOME/.cache}/baby-bash-profile" \
  --autoplay-policy=no-user-gesture-required \
  --no-first-run --disable-translate --disable-features=Translate \
  "$@"
