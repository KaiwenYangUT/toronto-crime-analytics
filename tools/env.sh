# Source this file from the repository root before installing or running tools.
export TCA_ROOT="$(pwd -P)"
export PIP_CACHE_DIR="$TCA_ROOT/.cache/pip"
export npm_config_cache="$TCA_ROOT/.cache/npm"
export PLAYWRIGHT_BROWSERS_PATH="$TCA_ROOT/.cache/playwright"
export TECTONIC_CACHE_DIR="$TCA_ROOT/.cache/tectonic"
export XDG_CACHE_HOME="$TCA_ROOT/.cache/xdg"
export XDG_CONFIG_HOME="$TCA_ROOT/.cache/config"
export XDG_DATA_HOME="$TCA_ROOT/.cache/data"
export R_USER_CACHE_DIR="$TCA_ROOT/.cache/R/cache"
export R_USER_DATA_DIR="$TCA_ROOT/.cache/R/data"
export R_USER_CONFIG_DIR="$TCA_ROOT/.cache/R/config"
export R_LIBS_USER="$TCA_ROOT/.r-lib"
export TMPDIR="$TCA_ROOT/.cache/tmp"
export PYTHONPYCACHEPREFIX="$TCA_ROOT/.cache/python"
export HOMEBREW_CACHE="$TCA_ROOT/.cache/homebrew"
export HOMEBREW_LOGS="$TCA_ROOT/.cache/homebrew/logs"
export HOMEBREW_TEMP="$TCA_ROOT/.cache/homebrew/tmp"
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_ANALYTICS=1
export PATH="$TCA_ROOT/.venv/bin:$TCA_ROOT/.cache/tools/bin:$PATH"
mkdir -p "$PIP_CACHE_DIR" "$npm_config_cache" "$PLAYWRIGHT_BROWSERS_PATH" \
  "$TECTONIC_CACHE_DIR" "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" \
  "$R_USER_CACHE_DIR" "$R_USER_DATA_DIR" "$R_USER_CONFIG_DIR" "$R_LIBS_USER" \
  "$TMPDIR" "$HOMEBREW_CACHE" "$HOMEBREW_LOGS" "$HOMEBREW_TEMP" \
  "$TCA_ROOT/.cache/logs" "$TCA_ROOT/.cache/tools/bin"
