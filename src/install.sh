#!/bin/zsh
set -e
TARGET="${1:-$PWD}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$TARGET/package.json" ]; then
  echo "Fout: voer dit script uit vanuit de fashion-erp projectmap, of geef die map als argument."
  exit 1
fi

cp -R "$SCRIPT_DIR/src/." "$TARGET/src/"
cp -R "$SCRIPT_DIR/supabase/." "$TARGET/supabase/"

echo "Batch 1 (klanten naar Supabase) is geplaatst."
echo "Voer nu uit:"
echo "  npx supabase db push"
echo "  npm run dev"
