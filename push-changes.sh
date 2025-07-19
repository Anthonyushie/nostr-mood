#!/bin/bash

echo "🚀 NostrMood - GitHub Push Script"
echo "=================================="
echo ""

# Check if we have commits to push
echo "📋 Checking repository status..."
git status

echo ""
echo "📦 Recent commits:"
git log --oneline -5

echo ""
echo "🔗 Current remote:"
git remote -v

echo ""
echo "⚠️  AUTHENTICATION REQUIRED"
echo "GitHub requires a Personal Access Token for authentication."
echo ""
echo "📝 To set up authentication:"
echo "1. Go to: https://github.com/settings/tokens"
echo "2. Generate new token (classic) with 'repo' scope"
echo "3. Copy the token"
echo "4. Run: git remote set-url origin https://YOUR_TOKEN@github.com/Anthonyushie/nostr-mood.git"
echo "5. Run: git push origin main"
echo ""
echo "🎯 Your NostrMood project is ready to push!"
echo "   - YakiHonne Smart Widget integration ✅"
echo "   - Sentiment analysis functionality ✅" 
echo "   - Hackathon requirements met ✅"