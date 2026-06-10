#!/usr/bin/env bash
# One-shot: build + commit + push to GitHub Pages, then verify the cache.
# Reads an optional token file (container deploys) but never prints it.
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-Update Costa calendar}"

# 1) build
./build.sh

# 2) commit (only the shipped + source files; data ships encrypted)
git add index.html dist/app.js data/casa.enc.json src README.md scripts .claude/skills 2>/dev/null || true

# Hard guard: never let the plaintext data slip into a commit. Check the index
# directly (git ls-files), not `git diff --cached` — the latter misses a file
# that is staged but unchanged from HEAD.
if git ls-files --cached --error-unmatch data/casa.json >/dev/null 2>&1; then
  echo "✗ refusing to commit: data/casa.json (plaintext) is staged — only data/casa.enc.json should ship" >&2
  exit 1
fi
if git diff --cached --quiet; then
  echo "› nothing to commit — already up to date"
else
  git commit -m "$MSG"
fi

# 3) push — use a token env file if one exists, else rely on the configured remote auth
TOKEN_ENV="${GITHUB_TOKEN_ENV:-/root/clawd/secrets/github-token.env}"
REMOTE_HTTPS="https://github.com/bernardo-cs/costa-calendar.git"
if [ -f "$TOKEN_ENV" ]; then
  set -a; . "$TOKEN_ENV"; set +a
  git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/bernardo-cs/costa-calendar.git"
  git push
  git remote set-url origin "$REMOTE_HTTPS"
else
  git push
fi

# 4) verify Pages picked it up (title lives in index.html)
echo "› waiting for GitHub Pages cache…"
for i in 1 2 3 4 5 6; do
  sleep 10
  if curl -L -s https://bernardo-cs.github.io/costa-calendar/ | grep -q 'Calendário da Casa'; then
    echo "✓ live at https://bernardo-cs.github.io/costa-calendar/"
    exit 0
  fi
  echo "  …not yet (attempt $i)"
done
echo "⚠ couldn't confirm cache update yet — check the site in a minute."
