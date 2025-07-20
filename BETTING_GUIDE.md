# NostrMood Betting Guide

## How the Betting System Works

### 1. Market Creation
- Markets are created based on Nostr posts with sentiment analysis
- Each market asks: "Will this post's sentiment score be above 0.6?"
- Markets automatically settle after 1 minute (for testing purposes)

### 2. Betting Process
1. **Choose Position**: Bet YES (sentiment will be above 0.6) or NO (sentiment will be below 0.6)
2. **Enter Amount**: Specify how many sats you want to bet (minimum: 100 sats)
3. **Connect Wallet**: Choose WebLN or NWC (Nostr Wallet Connect)
4. **Pay Invoice**: Complete Lightning payment to place bet
5. **Wait for Settlement**: Market settles automatically after 1 minute

### 3. How to Earn Sats

#### Winning Scenarios:
- **Bet YES + Sentiment > 0.6**: You win! Get your bet amount + share of losing bets
- **Bet NO + Sentiment ≤ 0.6**: You win! Get your bet amount + share of losing bets

#### Payout Calculation:
```
Your Payout = Your Bet Amount + (Your Bet / Total Winning Bets) × Total Losing Bets
```

#### Example:
- You bet 1000 sats on YES
- Total YES bets: 2000 sats (you + 1 other person)
- Total NO bets: 3000 sats
- Sentiment score: 0.7 (above 0.6 = YES wins)
- Your payout: 1000 + (1000/2000) × 3000 = 1000 + 1500 = 2500 sats

### 4. Wallet Connection Options

#### WebLN (Browser Extension)
- Install Alby, Zeus, or other WebLN wallet
- Automatic payment processing
- Best user experience

#### NWC (Nostr Wallet Connect)
- Works with any NWC-compatible wallet
- Connection string format: `nostr+walletconnect://pubkey?relay=wss://...&secret=...`
- Get from: Alby Hub, Zeus, Mutiny, Phoenix, etc.

### 5. Market Settlement

Markets settle automatically by:
1. Re-analyzing the original Nostr post sentiment
2. Comparing final sentiment score to 0.6 threshold
3. Distributing payouts to winning bets
4. Sending Lightning payments to winners

### 6. Testing the System

To test earning sats:
1. Create a market with positive sentiment post
2. Bet NO (expecting it to fail since sentiment is positive)
3. Have someone else bet YES
4. Wait 1 minute for settlement
5. YES bettor wins and gets payout

## Current Status

- ✅ Market creation working
- ✅ Bet placement working
- ✅ Lightning invoice generation
- ⚠️ NWC connection needs testing
- ⚠️ Settlement payouts in development mode