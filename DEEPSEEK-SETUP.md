# 🤖 DeepSeek AI Setup Guide for Ez.Smart

## Overview
Ez.Smart now supports AI-powered chat using DeepSeek API. This guide shows you how to set it up.

---

## Step 1: Get DeepSeek API Key

1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up / Log in
3. Navigate to **API Keys**
4. Click **Create new API key**
5. Copy the key (starts with `sk-...`)

---

## Step 2: Add API Key to Netlify

### Option A: Via Netlify Dashboard (Recommended)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: **lazyhumanbegin-erp**
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Enter:
   - **Key:** `DEEPSEEK_API_KEY`
   - **Value:** `sk-your-api-key-here`
6. Click **Save**

### Option B: Via Netlify CLI

```bash
cd "/Users/jeremy/Desktop/EZ CUBIC/Balance Sheet/Ez.Smart.v2.1"
netlify env:set DEEPSEEK_API_KEY "sk-your-api-key-here"
```

---

## Step 3: Deploy

After adding the environment variable, deploy again:

```bash
./deploy.sh "Add DeepSeek AI integration"
```

---

## Step 4: Test

1. Open Ez.Smart in browser
2. Click the AI Chat button (bottom right)
3. Try asking:
   - "What's my profit this month?"
   - "Who are my top customers?"
   - "Help me understand SST"

---

## How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Browser    │ --> │ Netlify Function │ --> │  DeepSeek   │
│  (Chatbot)  │     │  (ai-chat.js)    │     │    API      │
└─────────────┘     └──────────────────┘     └─────────────┘
                    (API key stored here)
```

1. User types message in chatbot
2. Frontend sends message + business context to Netlify Function
3. Function adds API key and calls DeepSeek
4. Response flows back to chatbot
5. If API fails, fallback to rule-based responses

---

## Pricing

DeepSeek is very affordable:
- Input: ~$0.14 per million tokens
- Output: ~$0.28 per million tokens

**Example:** 1000 chat messages ≈ $0.05 - $0.10

---

## Troubleshooting

### "AI service not configured"
- Check if `DEEPSEEK_API_KEY` is set in Netlify environment variables
- Redeploy after adding the key

### "AI service unavailable"
- DeepSeek API might be temporarily down
- System will automatically use fallback responses

### Testing locally
For local development, create a `.env` file:
```
DEEPSEEK_API_KEY=sk-your-key-here
```

Then use `netlify dev` to run locally with functions.

---

## Files Created

| File | Purpose |
|------|---------|
| `netlify.toml` | Netlify configuration |
| `netlify/functions/ai-chat.js` | Serverless function (API proxy) |
| `js/chatbot.js` | Updated with AI integration |

---

## Security Notes

✅ API key is stored server-side (Netlify environment)
✅ Key is never exposed to browser
✅ CORS headers configured properly
✅ Fallback system for API failures
