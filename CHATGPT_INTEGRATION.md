# ChatGPT Integration Guide

## Overview

NostrMood now includes ChatGPT AI assistance to provide intelligent insights about sentiment analysis, market psychology, and trading strategies. This feature enhances the user experience by offering contextual AI guidance.

## Features

### AI-Powered Analysis
- **Contextual Understanding**: ChatGPT receives the current sentiment analysis context
- **Market Insights**: Get expert analysis on trading strategies for prediction markets  
- **Educational Support**: Learn about sentiment analysis patterns and market psychology
- **Interactive Chat**: Natural conversation interface with memory of the current context

### Integration Points
- **Automatic Context**: When analyzing a Nostr post, ChatGPT knows the content and sentiment scores
- **Quick Prompts**: Pre-built conversation starters for common questions
- **Real-time Analysis**: Ask questions about current analysis results immediately

## Setup

### 1. Get OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account if you don't have one
3. Generate a new API key
4. Copy the key (starts with `sk-...`)

### 2. Configure Environment
Add your API key to your environment variables:

```bash
# In your .env file
OPENAI_API_KEY="sk-your-actual-api-key-here"
```

### 3. Restart Application
Restart your development server to load the new environment variable:

```bash
npm run dev
```

## Usage

### Basic Chat
1. Analyze any Nostr post to get sentiment results
2. The ChatGPT Assistant will appear with context automatically loaded
3. Click "Analyze Current Sentiment" for immediate insights
4. Or type your own questions in the chat input

### Example Conversations

#### Getting Market Insights
**You**: "What trading strategies would work for this sentiment?"

**ChatGPT**: "Based on the neutral sentiment score of 0.1, this post sits right at the decision boundary. Here are some strategies:

1. **Wait and See**: With borderline sentiment, wait for more data before betting
2. **Small Hedge Bets**: Place small bets on both sides to minimize risk
3. **Time-based Strategy**: Sentiment can shift quickly on social media, monitor for changes"

#### Understanding Analysis Results
**You**: "Why did this positive post get a low sentiment score?"

**ChatGPT**: "Looking at your analysis, the post contains positive words like 'good' and 'nice', but the overall sentiment library considers several factors:

- **Context Words**: Modifiers like 'pretty good' vs 'absolutely amazing'
- **Intensity**: Simple positive words have lower weight than emotional ones
- **Negations**: Words like 'not bad' can confuse sentiment analysis
- **Length**: Longer posts may dilute strong sentiment"

### Quick Prompts
The assistant provides ready-made prompts for common questions:
- "Explain this sentiment analysis in simple terms"
- "What trading strategies would work for this sentiment?"
- "How reliable is this sentiment score?"
- "What factors could change this sentiment?"
- "Suggest improvements for sentiment analysis accuracy"

## Features in Detail

### Context Awareness
ChatGPT automatically receives:
- **Post Content**: The actual Nostr post text
- **Sentiment Score**: Numerical sentiment analysis result
- **Classification**: Positive/Negative/Neutral categorization
- **Word Analysis**: Lists of positive and negative words detected
- **Market Threshold**: Understanding of the 0.6 betting threshold

### Specialized Knowledge
The AI assistant is trained to understand:
- **NostrMood App**: Knows how your prediction market works
- **Lightning Payments**: Understands the betting and payout system
- **Sentiment Analysis**: Can explain technical aspects in simple terms
- **Market Psychology**: Provides insights on trading strategies

### Safety and Reliability
- **Rate Limiting**: Built-in protection against API overuse
- **Error Handling**: Graceful fallbacks when API is unavailable
- **Cost Management**: Optimized prompts to minimize token usage
- **Privacy**: No user data stored, all conversations are ephemeral

## API Endpoints

### Check API Status
```
GET /api/chatgpt/check
```
Returns whether ChatGPT is available and properly configured.

### Send Chat Message
```
POST /api/chatgpt/chat
Body: {
  "messages": [{"role": "user", "content": "Your question"}],
  "context": {
    "analysisResult": {...},
    "postContent": "..."
  }
}
```

## Cost Considerations

### Token Usage
- **Average conversation**: 100-300 tokens per response
- **Cost**: Approximately $0.0002-0.0006 per message
- **Daily usage**: For typical use, expect $1-5 per month

### Optimization
- Responses limited to 500 tokens maximum
- System prompts optimized for brevity
- Context provided efficiently to minimize token usage

## Troubleshooting

### API Key Issues
**Problem**: "OpenAI API key not configured"
**Solution**: 
1. Check your .env file has `OPENAI_API_KEY="sk-..."`
2. Restart your development server
3. Ensure the key is valid and active

### Rate Limiting
**Problem**: "Rate limit exceeded"
**Solution**:
1. Wait a few minutes before trying again
2. Consider upgrading your OpenAI plan for higher limits
3. Reduce frequency of requests

### No Response
**Problem**: ChatGPT not responding
**Solution**:
1. Check your internet connection
2. Verify API key is still valid
3. Check OpenAI service status
4. Look at server logs for specific error messages

## Advanced Usage

### Custom Prompts
You can ask specialized questions like:
- "Compare this sentiment to market sentiment indicators"
- "What would cause this sentiment to flip to the opposite?"
- "Generate a market analysis report for this post"
- "Explain why humans might disagree with this sentiment score"

### Integration with Prediction Markets
- Ask about optimal betting strategies
- Get insights on market timing
- Understand risk management for sentiment-based trading
- Learn about market psychology and crowd behavior

## Privacy and Security

### Data Handling
- **No Storage**: Conversations are not stored permanently
- **Context Only**: Only current analysis results are shared with OpenAI
- **No Personal Data**: User identity and wallet information are never sent
- **Ephemeral**: Each conversation starts fresh with no memory of previous chats

### API Security
- API key stored as environment variable (never in code)
- Server-side validation of all requests
- Rate limiting to prevent abuse
- Error messages don't expose sensitive information

## Future Enhancements

### Planned Features
- **Conversation Memory**: Remember context across multiple messages
- **Market Predictions**: AI-powered market outcome predictions
- **Sentiment Trends**: Analysis of sentiment patterns over time
- **Custom Training**: Fine-tuned models for better Nostr/Bitcoin understanding

### Community Features
- **Shared Insights**: Option to share interesting AI insights with the community
- **Strategy Sharing**: Collaborative development of trading strategies
- **Educational Content**: AI-generated tutorials and explanations