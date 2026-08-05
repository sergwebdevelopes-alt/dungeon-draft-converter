#!/bin/bash

cd "$(dirname "$0")" || exit 1

finish() {
  echo ""
  read -r -p "Press Enter to close this window..."
  exit "$1"
}

if ! command -v npm >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ Node.js was not found on this computer."
  echo "   Please install it from https://nodejs.org and try again."
  finish 1
fi

shopt -s nullglob nocaseglob
maps=(source/*.dd2vtt)
shopt -u nullglob nocaseglob

if [ ${#maps[@]} -eq 0 ]; then
  echo "❌ No map files found."
  echo "   Put your .dd2vtt files into the 'source' folder, then run this again."
  open source 2>/dev/null
  finish 1
fi

echo "Found ${#maps[@]} map file(s) to convert."
echo ""

if [ ! -d node_modules ]; then
  echo "First run — installing dependencies (this happens only once)..."
  if ! npm install --no-fund --no-audit; then
    echo ""
    echo "❌ Installing dependencies failed. Check your internet connection and try again."
    finish 1
  fi
  echo ""
fi

echo "Converting maps... this can take a few minutes."
echo ""

if npm run --silent convert; then
  echo ""
  echo "✅ All done! The converted maps are in the 'dist' folder."
  finish 0
else
  echo ""
  echo "❌ Something went wrong — see the messages above."
  finish 1
fi
