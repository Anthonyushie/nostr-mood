# Payment System Documentation

## Overview

The NostrMood prediction market feature uses Lightning Network payments powered by the YakiHonne Smart Widget SDK for fast, secure, and low-fee transactions. This document explains how the payment system works for both users and developers.

## How Lightning Payments Work

### For Users

1. **When Placing a Bet**:
   - Select your position (YES or NO) and stake amount
   - Click "Place Bet" to initiate the payment process
   - The YakiHonne SDK generates a Lightning invoice for your stake amount
   - Pay the invoice using your preferred Lightning wallet
   - Once payment is confirmed, your bet is recorded and the market pools update

2. **Payment Methods**:
   - Any Lightning Network compatible wallet
   - Built-in YakiHonne wallet (when embedded)
   - Popular wallets: Strike, Cash App, Wallet of Satoshi, Phoenix, etc.

3. **Payment Confirmation**:
   - Payments are confirmed instantly on the Lightning Network
   - Your bet appears in the market immediately after payment
   - Transaction is recorded in localStorage (and will sync to database in production)

### Market Settlement & Payouts

1. **Automatic Settlement**:
   - Markets settle automatically when they expire
   - The system re-analyzes the original post's sentiment
   - Compares the new sentiment score against the prediction threshold
   - Determines winners based on whether the threshold was met

2. **Payout Distribution**:
   - Winners receive their original stake plus proportional winnings
   - Winnings come from the losing side's pool minus platform fees
   - Payouts are calculated automatically and distributed via Lightning
   - If no one wins (edge case), all bets are refunded in full

3. **Fee Structure**:
   - Platform fee: 5% of the losing pool
   - Lightning network fees: ~1-3 sats per transaction
   - No hidden fees or charges

## Technical Implementation

### YakiHonne SDK Integration

```typescript
import SWHandler from 'smart-widget-handler';

// Initialize payment handler
const paymentHandler = new SWHandler({
  widgetId: 'nostrmood-prediction-markets',
  apiEndpoint: 'wss://api.yakihonne.com'
});

// Create Lightning invoice
const invoice = await paymentHandler.createInvoice({
  amount: betAmount, // in satoshis
  description: `Bet on: ${market.question}`,
  metadata: {
    marketId: market.id,
    position: 'yes', // or 'no'
    userPubkey: user.pubkey
  }
});

// Monitor payment status
paymentHandler.onPaymentReceived((payment) => {
  // Update bet status and market pools
  confirmBetPlacement(payment);
});
```

### Payment Flow

1. **Bet Initiation**:
   ```
   User clicks "Place Bet" → 
   Form validation → 
   Generate Lightning invoice → 
   Display payment QR code/link
   ```

2. **Payment Processing**:
   ```
   User pays invoice → 
   Lightning network confirms → 
   YakiHonne SDK notifies app → 
   Bet is recorded → 
   Market pools update
   ```

3. **Settlement Process**:
   ```
   Market expires → 
   SettlementBot triggers → 
   Re-analyze sentiment → 
   Calculate payouts → 
   Distribute Lightning payments → 
   Update bet records
   ```

### Data Storage

#### During Development/Testing
- **localStorage**: Stores markets and bets for immediate testing
- **Cross-tab sync**: Updates propagate across browser tabs
- **Automatic cleanup**: Expired markets are settled and archived

#### Production Implementation
- **PostgreSQL Database**: Persistent storage for all markets and bets
- **Drizzle ORM**: Type-safe database operations
- **Real-time updates**: WebSocket connections for live market updates

### Security Considerations

1. **Payment Verification**:
   - All Lightning payments are cryptographically verified
   - Payment hashes are stored and validated
   - Double-spending is prevented by the Lightning Network protocol

2. **Market Integrity**:
   - Sentiment analysis uses deterministic algorithms
   - Settlement results are publicly verifiable
   - All bet data includes cryptographic signatures

3. **User Privacy**:
   - No personal financial information stored
   - Only public keys and payment hashes recorded
   - Lightning payments provide natural privacy

## Error Handling

### Payment Failures
- **Network issues**: Automatic retry with exponential backoff
- **Insufficient funds**: Clear error messages with suggested actions
- **Expired invoices**: Generate new invoice automatically

### Settlement Issues
- **Post unavailable**: Extend settlement window and retry
- **Sentiment analysis errors**: Fallback to manual review process
- **Payout failures**: Queue payouts for retry with notifications

## Testing & Development

### Test Environment Setup
1. Use Lightning testnet for development
2. Configure test markets with 1-minute duration
3. Mock YakiHonne SDK responses for unit testing
4. Simulate various payment scenarios

### Quality Assurance Checklist
- [ ] Bet placement with valid payment
- [ ] Payment failure handling
- [ ] Market expiration and settlement
- [ ] Payout calculation accuracy
- [ ] Cross-tab synchronization
- [ ] Error state management

## Future Enhancements

### Planned Features
1. **Batch Settlements**: Process multiple market settlements in single transactions
2. **Streaming Payments**: Real-time micropayments for live sentiment tracking
3. **Multi-Asset Support**: Support for other Lightning-compatible assets
4. **Advanced Analytics**: Detailed profit/loss tracking for users

### Scalability Considerations
1. **Channel Management**: Automated Lightning channel rebalancing
2. **Fee Optimization**: Dynamic fee calculation based on network conditions
3. **Liquidity Pools**: Shared liquidity across multiple prediction markets

## Support & Troubleshooting

### Common Issues

**"Payment not detected"**
- Check Lightning wallet connectivity
- Verify invoice hasn't expired (typically 15 minutes)
- Ensure sufficient channel capacity

**"Market settlement delayed"**
- Sentiment re-analysis may take 1-2 minutes
- Network connectivity issues can cause delays
- Contact support if delay exceeds 5 minutes

**"Payout not received"**
- Check Lightning wallet for incoming payments
- Verify wallet is online and synced
- Payouts may take up to 10 minutes to process

### Getting Help
- Discord: [YakiHonne Community](https://discord.gg/yakihonne)
- Email: support@nostrmood.com
- Documentation: [docs.nostrmood.com](https://docs.nostrmood.com/payments)

---

*This payment system is built on the Lightning Network's proven security and speed, ensuring fast, cheap, and reliable transactions for all prediction market activities.*