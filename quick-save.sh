#!/bin/bash
# Auto-save progress with timestamp
# Run: ./quick-save.sh "what you just did"

if [ -z "$1" ]; then
    echo "Usage: ./quick-save.sh 'description of work'"
    exit 1
fi

VERSION=$(grep "CACHE_VERSION = " service-worker.js | cut -d"'" -f2)
DATE=$(date "+%Y-%m-%d %H:%M")

git add .
git commit -m "[$VERSION] $DATE - $1"

echo "✅ Saved: $1"
echo "📝 Logged with version: $VERSION"
