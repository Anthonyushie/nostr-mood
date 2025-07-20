# Sentiment Analysis & Market Settlement Guide

## How Sentiment Analysis Works

### 1. Sentiment Scoring System
NostrMood uses the `sentiment.js` library to analyze text and generate scores:

- **Positive Score**: Text with positive words gets a positive score
- **Negative Score**: Text with negative words gets a negative score  
- **Neutral Score**: Balanced or neutral text gets a score near 0

### 2. Key Metrics
- **Raw Score**: Sum of positive/negative word values
- **Comparative Score**: Raw score divided by word count (normalized)
- **Threshold**: Markets use **0.6** as the decision threshold

### 3. Examples of Sentiment Scores

**Positive Examples (Score > 0.6):**
- "I love Bitcoin! This is amazing and fantastic!" → Score: ~3.5
- "Great job everyone, really excellent work!" → Score: ~2.1
- "Beautiful day, feeling wonderful and happy" → Score: ~2.8

**Negative Examples (Score ≤ 0.6):**
- "This is terrible and awful, hate it" → Score: ~-3.2
- "Bad news, really disappointed" → Score: ~-1.5
- "Not good, this sucks" → Score: ~-1.8

**Neutral Examples (Score ≤ 0.6):**
- "The weather is 72 degrees today" → Score: ~0
- "Meeting at 3pm in conference room" → Score: ~0
- "Bitcoin price is $45,000" → Score: ~0

## How Markets Determine Winners

### Market Question Format
Every market asks: **"Will this post's sentiment score be above 0.6?"**

### Betting Positions
- **YES**: You think sentiment will be > 0.6 (positive)
- **NO**: You think sentiment will be ≤ 0.6 (negative/neutral)

### Settlement Process
1. **Market Expires**: After 1 minute (testing mode)
2. **Re-Analysis**: System re-analyzes the original Nostr post
3. **Score Comparison**: Final score compared to 0.6 threshold
4. **Winner Determination**:
   - If score > 0.6 → YES bets win
   - If score ≤ 0.6 → NO bets win
5. **Payout Calculation**: Winners split losing side's money proportionally

### Payout Formula
```
Your Payout = Your Bet + (Your Bet / Total Winning Bets) × Total Losing Bets
```

## How to Check Sentiment Yourself

### Method 1: Use the Main App
1. Go to the NostrMood analyzer (main page)
2. Enter any Nostr post ID (nevent1..., note1..., or hex)
3. Click "Analyze Sentiment"
4. See the exact score that markets will use

### Method 2: Predict Before Betting
Before placing a bet:
1. Read the post content carefully
2. Look for positive words: amazing, great, love, excellent, wonderful
3. Look for negative words: terrible, hate, awful, bad, disappointed
4. Consider if overall tone is clearly positive (likely > 0.6) or not

### Method 3: Check Market Settlement
After markets settle, you can see:
- Final sentiment score
- Which side won
- Payout amounts

## Strategy Tips

### For Higher Win Rates:
1. **Analyze Before Betting**: Use the sentiment analyzer first
2. **Look for Clear Sentiment**: Avoid neutral-looking posts
3. **Positive Bias**: Most social media is positive, so YES bets often win
4. **Emotional Language**: Posts with strong emotions score higher

### For Higher Profits:
1. **Bet Against the Crowd**: If everyone bets YES, bet NO for better odds
2. **Find Undervalued Posts**: Neutral-looking posts that are actually positive
3. **Early Betting**: Get in before others analyze the sentiment

## Technical Implementation

The sentiment analysis uses these steps:
1. Fetch post from Nostr relays
2. Clean and tokenize text
3. Score each word against sentiment dictionary
4. Calculate final comparative score
5. Compare to 0.6 threshold for market settlement

This system is deterministic - the same post will always get the same score, making markets fair and predictable.