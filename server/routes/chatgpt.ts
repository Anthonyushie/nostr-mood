import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI client
let openai: OpenAI | null = null;

const initializeOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    openai = new OpenAI({
      apiKey: apiKey,
    });
    return true;
  }
  return false;
};

// Initialize on startup
initializeOpenAI();

// Check if API key is available
router.get('/check', (req: Request, res: Response) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY && !!openai;
  res.json({ hasApiKey });
});

// Chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    if (!openai) {
      const initialized = initializeOpenAI();
      if (!initialized) {
        return res.status(400).json({ 
          error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
        });
      }
    }

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

    const completion = await openai!.chat.completions.create({
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
      // Handle specific OpenAI errors
      if (error.message.includes('API key')) {
        return res.status(401).json({ error: 'Invalid OpenAI API key' });
      }
      if (error.message.includes('quota')) {
        return res.status(429).json({ error: 'OpenAI API quota exceeded' });
      }
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
      }
    }

    res.status(500).json({ 
      error: 'Failed to get response from ChatGPT. Please try again.' 
    });
  }
});

// Get conversation suggestions based on analysis
router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(400).json({ error: 'OpenAI API key not configured' });
    }

    const { analysisResult, postContent } = req.body;

    const prompt = `Based on this sentiment analysis of a Nostr post, provide 3-5 short conversation starters or questions a user might want to ask about this analysis:

Post: "${postContent}"
Sentiment Score: ${analysisResult.sentiment.comparative}
Classification: ${analysisResult.sentiment.comparative > 0.6 ? 'Positive' : analysisResult.sentiment.comparative < -0.6 ? 'Negative' : 'Neutral'}

Provide only the questions/prompts, one per line, without numbering or explanations.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.8,
    });

    const suggestions = completion.choices[0]?.message?.content
      ?.split('\n')
      .filter(line => line.trim())
      .slice(0, 5) || [];

    res.json({ suggestions });

  } catch (error) {
    console.error('ChatGPT suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;