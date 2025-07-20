# NostrMood - Lightning-Powered Prediction Markets for Nostr Posts

**A decentralized prediction market platform that combines sentiment analysis, Lightning Network payments, and Nostr protocol integration.**

NostrMood allows users to create and bet on sentiment analysis outcomes for Nostr posts using Lightning Network micropayments. Built as a YakiHonne-compatible smart widget with full NWC (Nostr Wallet Connect) integration for truly decentralized operations.

## 📑 Table of Contents

- [What is NostrMood?](#-what-is-nostrmood)
- [Key Features](#-key-features)
- [How It Works](#️-how-it-works)
- [Getting Started](#-getting-started)
- [Technical Architecture](#️-technical-architecture)
- [Security & Privacy](#-security--privacy)
- [Market Examples](#-market-examples)
- [Testing & Development](#-testing--development)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

---

## 🎯 What is NostrMood?

NostrMood is a **prediction market application** where users can:

1. **Analyze sentiment** of any Nostr post using advanced sentiment analysis
2. **Create prediction markets** asking "Will this post's sentiment be above 0.6?"
3. **Place Lightning bets** on YES/NO outcomes using any NWC-compatible wallet
4. **Earn Bitcoin** by correctly predicting sentiment outcomes
5. **Share results** directly to Nostr with seamless social integration

### Core Concept

Every market asks the same question: **"Will this post's sentiment score be above 0.6?"**

- **Bet YES**: You think the post is positive (score > 0.6)
- **Bet NO**: You think the post is negative/neutral (score ≤ 0.6)
- **Win Bitcoin**: Correct predictions split the losing side's pool

---

## 🚀 Key Features

### 📊 Sentiment Analysis
- **Real-time analysis** of Nostr posts using sentiment.js library
- **Multiple ID formats**: Support for hex IDs, nevent1, and note1 formats
- **Live sentiment scoring** with positive/negative word detection
- **Deterministic results** ensuring fair market settlement

### ⚡ Lightning Network Integration
- **NWC (Nostr Wallet Connect)** for decentralized payments
- **Multi-wallet support**: Alby, Zeus, Mutiny, Phoenix, and more
- **WebLN compatibility** for browser extension wallets
- **No API keys required** - fully self-custodial approach

### 🎲 Prediction Markets
- **1-minute markets** for quick testing and feedback
- **Automatic settlement** based on sentiment re-analysis
- **Proportional payouts** with transparent fee structure
- **Real-time odds** calculation and display

### 🔗 Nostr Integration
- **YakiHonne Smart Widget** compatibility
- **Direct post sharing** of analysis results
- **User context detection** in widget mode
- **Multi-relay connectivity** for reliable post retrieval

---

## 🏗️ How It Works

### 1. Market Creation Flow
```
User enters Nostr post ID → Sentiment analysis → Market created → Betting opens
```

### 2. Betting Process
```
Choose YES/NO → Connect Lightning wallet → Pay invoice → Bet placed → Wait for settlement
```

### 3. Settlement & Payouts
```
Market expires → Re-analyze sentiment → Determine winners → Distribute Lightning payouts
```

### 4. Payout Calculation
```
Your Payout = Your Bet + (Your Bet / Total Winning Bets) × Total Losing Bets × 0.95
```
*5% platform fee deducted from losing pool*

---

## 🎮 Getting Started

### For Users

1. **Visit the app**: Open NostrMood in your browser or YakiHonne widget
2. **Analyze a post**: Enter any Nostr post ID to see its sentiment score
3. **Create or join markets**: Bet on whether sentiment will be above 0.6
4. **Connect wallet**: Use any NWC-compatible Lightning wallet
5. **Place bets**: Start with small amounts (100+ sats minimum)
6. **Earn Bitcoin**: Win by correctly predicting sentiment outcomes

### For Developers

1. **Clone repository**:
   ```bash
   git clone https://github.com/your-repo/nostrmood.git
   cd nostrmood
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your PostgreSQL DATABASE_URL
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Access application**:
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

---

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui for modern UI components
- **Wouter** for lightweight client-side routing
- **TanStack Query** for efficient server state management

### Backend Stack
- **Express.js** with TypeScript for API routes
- **PostgreSQL** with Drizzle ORM for data persistence
- **Neon Database** for serverless PostgreSQL hosting
- **Session management** with connect-pg-simple

### Lightning & Nostr Integration
- **Nostr Wallet Connect (NWC)** for decentralized Lightning payments
- **nostr-tools** for Nostr protocol interaction
- **WebLN** support for browser extension wallets
- **YakiHonne Smart Widget SDK** for seamless widget integration

### Deployment Architecture
- **Dual API support**: Express routes + Vercel serverless functions
- **Cross-platform compatibility**: Works on Replit, Vercel, and other platforms
- **Database migrations** with Drizzle Kit
- **Environment-specific configurations**

---

## 🔐 Security & Privacy

### Decentralized Design
- **No custodial services**: Users maintain full control of their Lightning wallets
- **NWC protocol**: Open standard for wallet connectivity
- **Client-side sentiment analysis**: No sensitive data sent to servers
- **Open source**: Fully auditable codebase

### Privacy Features
- **Anonymous betting**: No KYC or personal information required
- **Nostr pseudonyms**: Use Nostr public keys for identity
- **Local data storage**: Sensitive connection strings stored locally
- **Minimal data collection**: Only necessary for market operations

---

## 📈 Market Examples

### High-Confidence Positive (Likely YES wins)
```
"Bitcoin is absolutely amazing! I love this technology so much, it's fantastic!"
Sentiment Score: ~2.8 (> 0.6) → YES wins
```

### Clearly Negative (Likely NO wins)
```
"This is terrible news, really hate this awful situation"
Sentiment Score: ~-2.1 (≤ 0.6) → NO wins
```

### Neutral/Ambiguous (Likely NO wins)
```
"Bitcoin price is $45,000 today at 3pm"
Sentiment Score: ~0.0 (≤ 0.6) → NO wins
```

---

## 🧪 Testing & Development

### Built-in Testing Tools
- **Sentiment Testing Tool**: Test any text to see how it would score
- **Mock invoice generation**: Test betting flow without real payments
- **Development shortcuts**: Skip wallet connection for faster testing
- **Comprehensive test suite**: 80%+ code coverage for core features

### API Testing
```bash
# Test API connectivity
curl http://localhost:5000/api/test

# Get active markets
curl http://localhost:5000/api/markets

# Check wallet balance
curl http://localhost:5000/api/wallet/balance
```

---

## 📚 Documentation

### Comprehensive Guides
- **[Project Overview](./PROJECT_OVERVIEW.md)**: Executive summary and project vision
- **[Betting Guide](./BETTING_GUIDE.md)**: Complete betting process and strategy tips
- **[Sentiment Analysis Guide](./SENTIMENT_ANALYSIS_GUIDE.md)**: How sentiment scoring works
- **[Payment System](./PAYMENT_SYSTEM.md)**: Lightning Network integration details
- **[NWC Integration](./NWC_INTEGRATION.md)**: Wallet setup and connection guide
- **[Vercel Deployment](./VERCEL_DEPLOYMENT.md)**: Production deployment instructions

### Quick References
- **Minimum bet**: 100 sats
- **Market duration**: 1 minute (testing mode)
- **Platform fee**: 5% of losing pool
- **Sentiment threshold**: 0.6 (above = positive, at/below = negative/neutral)
- **Supported wallets**: Any NWC-compatible Lightning wallet

---

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes and test thoroughly
5. Update documentation if needed
6. Submit a pull request

### Areas for Contribution
- **Additional sentiment models**: Improve prediction accuracy
- **UI/UX enhancements**: Better user experience design
- **Wallet integrations**: Support for more Lightning wallets
- **Market mechanics**: New market types and settlement options
- **Performance optimizations**: Faster load times and responsiveness

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Live Demo**: [Your deployment URL]
- **YakiHonne Widget**: [Widget embed URL]
- **Documentation**: [Docs URL]
- **Discord**: [Community link]
- **Twitter**: [@NostrMood]

---

**Built with ⚡ by the Nostr community for the Bitcoin economy**