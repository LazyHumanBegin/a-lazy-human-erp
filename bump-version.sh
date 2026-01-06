#!/bin/bash
# EZCubic Version Bump Script
# Run this before git push to auto-increment version

VERSION_FILE="js/data.js"

# Extract current version
CURRENT=$(grep "const APP_VERSION" "$VERSION_FILE" | sed "s/.*'\([^']*\)'.*/\1/")

if [ -z "$CURRENT" ]; then
    echo "❌ Could not find version in $VERSION_FILE"
    exit 1
fi

echo "📌 Current version: v$CURRENT"

# Split version into parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

# Increment patch
PATCH=$((PATCH + 1))

# If patch > 10, roll to next minor
if [ "$PATCH" -gt 10 ]; then
    MINOR=$((MINOR + 1))
    PATCH=0
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "🆕 New version: v$NEW_VERSION"

# Update version in data.js
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/const APP_VERSION = '$CURRENT'/const APP_VERSION = '$NEW_VERSION'/" "$VERSION_FILE"
else
    # Linux
    sed -i "s/const APP_VERSION = '$CURRENT'/const APP_VERSION = '$NEW_VERSION'/" "$VERSION_FILE"
fi

echo "✅ Version updated in $VERSION_FILE"

# Optional: Auto-commit and push
read -p "Commit and push? (y/n): " CONFIRM
if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
    git add -A
    git commit -m "v$NEW_VERSION - Auto version bump"
    git push
    echo "🚀 Pushed to remote!"
else
    echo "💡 Run 'git add -A && git commit -m \"v$NEW_VERSION\" && git push' to deploy"
fi
