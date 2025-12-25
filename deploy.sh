#!/bin/bash
# EZCubic ERP - Deploy Script
# This deploys to BOTH GitHub (backup) and Netlify (live site)

echo "🚀 Deploying EZCubic ERP..."
echo ""

# Get commit message
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh \"commit message\""
    echo "Example: ./deploy.sh \"v2.1.22: Fix bug\""
    exit 1
fi

COMMIT_MSG="$1"

# Step 1: Commit to GitHub (backup)
echo "📦 Step 1: Committing to GitHub..."
git add -A
git commit -m "$COMMIT_MSG"
git push origin main
echo "✅ GitHub updated"
echo ""

# Step 2: Deploy to Netlify (live site)
echo "🌐 Step 2: Deploying to Netlify..."
netlify deploy --prod --dir=.
echo "✅ Netlify deployed"
echo ""

echo "🎉 Deployment complete!"
echo "   GitHub: https://github.com/LazyHumanBegin/a-lazy-human-erp"
echo "   Live:   https://lazyhumanbegin-erp.netlify.app"
