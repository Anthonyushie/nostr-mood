import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
      });
    }

    const openai = new OpenAI({ apiKey });
    const { messages, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Create system message with context
    const systemMessage = {
      role: 'system' as const,
      content: `You are an AI assistant integrated into NostrMood, a Lightning-powered prediction market app that analyzes sentiment of Nostr posts. 

Key features of NostrMood:
- Analyzes sentiment of Nostr social media posts
- Users can bet on whether posts are positive/negative
- Uses Lightning Network for instant payments
- Threshold for positive sentiment: > 0.6
- Threshold for negative sentiment: ≤ 0.6

Your role:
- Provide insights about sentiment analysis results
- Suggest trading strategies for prediction markets
- Explain sentiment patterns and market psychology
- Help users understand their analysis results
- Be helpful, accurate, and focused on sentiment/trading topics

${context?.analysisResult ? `
Current Analysis Context:
- Post content: "${context.postContent}"
- Sentiment score: ${context.analysisResult.sentiment.comparative}
- Classification: ${context.analysisResult.sentiment.comparative > 0.6 ? 'Positive' : context.analysisResult.sentiment.comparative < -0.6 ? 'Negative' : 'Neutral'}
- Positive words: ${context.analysisResult.sentiment.positive.join(', ') || 'None'}
- Negative words: ${context.analysisResult.sentiment.negative.join(', ') || 'None'}
` : ''}

Keep responses helpful, concise, and relevant to sentiment analysis and prediction markets.`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    res.json({ response });

  } catch (error) {
    console.error('ChatGPT API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(401).json({ 
          error: 'Invalid OpenAI API key. Please check your key at https://platform.openai.com/api-keys' 
        });
      }
      if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
        return res.status(429).json({ 
          error: 'OpenAI API quota exceeded. Please check your billing and usage at https://platform.openai.com/usage',
          code: 'quota_exceeded',
          suggestion: 'Add credits to your OpenAI account or wait for your quota to reset.'
        });
      }
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again in a few minutes.' 
        });
      }
    }

    res.status(500).json({ 
      error: 'Failed to get response from ChatGPT. Please try again.' 
    });
  }
}