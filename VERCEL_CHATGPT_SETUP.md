# ChatGPT Setup for Vercel Deployment

## Step-by-Step Setup Guide

### 1. Add API Routes to Vercel

The ChatGPT API routes are already created in the `/api/chatgpt/` directory:
- `/api/chatgpt/check.ts` - Checks if API key is configured
- `/api/chatgpt/chat.ts` - Handles chat requests

These will automatically work on Vercel without additional configuration.

### 2. Get OpenAI API Key

1. **Create OpenAI Account**
   - Visit [OpenAI Platform](https://platform.openai.com/signup)
   - Sign up with your email or use Google/Microsoft login

2. **Add Billing Credits**
   - Go to [Billing Settings](https://platform.openai.com/settings/organization/billing)
   - Click "Add to credit balance"
   - Add at least $5 (this covers thousands of conversations)
   - **Important**: Free trial credits may have expired, you need paid credits

3. **Generate API Key**
   - Visit [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Name it something like "NostrMood-Production"
   - Copy the key (starts with `sk-`)
   - **Warning**: Save this key securely, you can't view it again

### 3. Configure Vercel Environment Variables

1. **Access Your Vercel Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your NostrMood project

2. **Add Environment Variable**
   - Go to Settings → Environment Variables
   - Click "Add New"
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-actual-api-key-here`
   - Select all environments (Production, Preview, Development)
   - Click "Save"

3. **Redeploy**
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Click "Redeploy"
   - Or push a new commit to trigger automatic deployment

### 4. Test the Integration

After deployment:

1. **Visit Your App**
   - Go to your Vercel app URL
   - Analyze a Nostr post to get sentiment results

2. **Check ChatGPT Assistant**
   - Look for the "ChatGPT Assistant" card
   - It should show "AI Powered" badge instead of "API Key Required"

3. **Test Chat**
   - Click "Analyze Current Sentiment" for automatic context
   - Or type a question like "What trading strategies work for this sentiment?"
   - You should get an intelligent AI response

### 5. Troubleshooting

#### "API Key Required" Message
- Check that `OPENAI_API_KEY` is set in Vercel environment variables
- Ensure you redeployed after adding the environment variable
- Verify the key starts with `sk-` and has no extra spaces

#### "API Quota Exceeded" Error
- Add more credits to your OpenAI account at [Billing](https://platform.openai.com/settings/organization/billing)
- Check your usage at [Usage Dashboard](https://platform.openai.com/usage)
- Free trial credits expire after 3 months

#### "Connection Error"
- Check browser console for network errors
- Verify the API routes are accessible at `your-app.vercel.app/api/chatgpt/check`
- Check Vercel function logs in the dashboard

#### Rate Limiting
- OpenAI has rate limits based on your account tier
- Wait a few minutes between requests
- Consider upgrading your OpenAI plan for higher limits

### 6. Cost Management

#### Understanding Costs
- **Model**: Uses `gpt-3.5-turbo` (cheapest option)
- **Cost**: ~$0.002 per conversation
- **Monthly Usage**: Typical users spend $1-5/month
- **Optimization**: Responses limited to 500 tokens to control costs

#### Monitoring Usage
- Check [OpenAI Usage Dashboard](https://platform.openai.com/usage)
- Set up billing alerts in OpenAI settings
- Monitor costs and adjust if needed

### 7. Advanced Configuration

#### Custom Prompts
The system prompt is optimized for NostrMood and includes:
- Context about sentiment analysis thresholds
- Understanding of prediction markets
- Lightning Network knowledge
- Trading strategy expertise

#### Response Limits
- Max 500 tokens per response
- Temperature set to 0.7 for balanced creativity/accuracy
- Context includes current analysis results

#### Error Handling
- Graceful fallbacks for API failures
- User-friendly error messages
- Detailed logging for debugging

### 8. Security Best Practices

#### Environment Variables
- Never commit API keys to code
- Use Vercel environment variables only
- Rotate keys periodically

#### CORS Configuration
- API routes include proper CORS headers
- Allows requests from your domain
- Blocks unauthorized origins

#### Rate Limiting
- Built-in protection against API abuse
- Reasonable limits for normal usage
- Error handling for quota exceeded

## Quick Checklist

- [ ] OpenAI account created with billing credits added
- [ ] API key generated and copied
- [ ] `OPENAI_API_KEY` added to Vercel environment variables
- [ ] Project redeployed
- [ ] ChatGPT assistant shows "AI Powered" badge
- [ ] Test conversation works successfully
- [ ] Monitor usage and costs

## Support

If you encounter issues:

1. Check Vercel function logs in the dashboard
2. Verify environment variables are set correctly
3. Test the API endpoints directly
4. Check OpenAI usage and billing status
5. Review browser console for client-side errors

The ChatGPT integration adds powerful AI insights to help users understand sentiment analysis and develop better trading strategies for the prediction markets.