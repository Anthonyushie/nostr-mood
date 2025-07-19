# Breez Nodeless Lightning Integration Guide

This document explains how NostrMood integrates with Breez Nodeless (Liquid) for Lightning payments in prediction markets.

## Overview

The integration provides:
- ✅ **Invoice Creation**: Generate Lightning invoices for bet placement
- ✅ **Payment Detection**: Automatically detect when invoices are settled
- ✅ **Payout System**: Send winnings/refunds via Lightning
- ✅ **Self-Custodial**: Users retain custody of funds in their Breez wallet
- ✅ **Metadata Tracking**: Record all payment metadata in PostgreSQL

## Architecture

### Backend Services

#### 1. BreezService (`server/breezService.ts`)
Central service handling all Breez SDK operations:

```typescript
class BreezService {
  // Initialize SDK with API key
  async initialize(): Promise<void>
  
  // Create Lightning invoice for bets
  async createInvoice(amountSats: number, description?: string): Promise<{
    invoiceId: string;
    paymentRequest: string;
    expiresAt: Date;
  }>
  
  // Get wallet balance
  async getWalletInfo(): Promise<{
    availableBalanceSat: number;
    pendingReceiveSat: number;
  }>
  
  // Send payouts to winners
  async sendPayout(bolt11: string): Promise<{
    paymentId: string;
    feeSat: number;
  }>
}
```

#### 2. Database Schema
Extended prediction betting schema with Breez payment tracking:

```sql
-- Prediction Bets Table (updated)
CREATE TABLE prediction_bets (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES prediction_markets(id),
  user_pubkey TEXT NOT NULL,
  position TEXT NOT NULL, -- 'yes' or 'no'
  amount INTEGER NOT NULL, -- in sats
  
  -- Breez Invoice Tracking
  invoice_id TEXT,
  payment_request TEXT, -- bolt11 invoice
  payment_hash TEXT,
  expires_at TIMESTAMP,
  is_paid BOOLEAN DEFAULT FALSE,
  
  -- Payout Tracking  
  payout INTEGER DEFAULT 0,
  payout_invoice TEXT, -- bolt11 from winner
  payout_tx_id TEXT,
  payout_status TEXT DEFAULT 'pending', -- pending, completed, failed
  payout_retries INTEGER DEFAULT 0,
  payout_error TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  is_settled BOOLEAN DEFAULT FALSE
);
```

### API Endpoints

#### Bet Placement
```
POST /api/bets
{
  "marketId": 1,
  "position": "yes",
  "amount": 1000,
  "userPubkey": "npub..."
}

Response:
{
  "bet": { ... },
  "paymentRequest": "lnbc1000u1p...",
  "invoiceId": "...",
  "expiresAt": "2025-01-20T10:00:00Z"
}
```

#### Payment Status
```
GET /api/bets/:id/status

Response:
{
  "id": 1,
  "isPaid": true,
  "paymentHash": "...",
  "payout": 1500,
  "payoutStatus": "completed"
}
```

#### Wallet Balance
```
GET /api/wallet/balance

Response:
{
  "availableBalanceSat": 100000,
  "pendingReceiveSat": 5000
}
```

## Frontend Integration

### 1. Payment Hook (`useBreezPayments.ts`)
React hook for payment operations:

```typescript
const { 
  createBet,           // Create bet and invoice
  checkBetStatus,      // Check payment status
  fetchBalance,        // Get wallet balance
  copyToClipboard,     // Copy invoice to clipboard
  openLightningWallet, // Open Lightning wallet app
  balance,             // Current wallet balance
  isLoading            // Loading state
} = useBreezPayments();
```

### 2. Payment Modal (`BreezPaymentModal.tsx`)
Comprehensive Lightning payment interface:

- **Invoice Display**: Shows bolt11 invoice with QR code
- **Auto Status Check**: Polls payment status every 2 seconds
- **Wallet Integration**: Opens Lightning wallet apps
- **Expiry Timer**: Shows countdown until invoice expires
- **Payment Confirmation**: Auto-closes on successful payment
- **Error Handling**: Retry logic for failed invoices

### 3. Market Card Integration
Updated betting interface:

- **Direct Betting**: Quick YES/NO buttons
- **Balance Display**: Shows current wallet balance
- **Integrated Flow**: Seamless payment modal integration

## Payment Flow

### 1. Bet Placement
```
User clicks YES/NO → 
Payment modal opens → 
API creates Breez invoice → 
Display payment request → 
User pays with Lightning wallet
```

### 2. Payment Detection
```
Breez SDK event listener → 
Payment received event → 
Update bet status in DB → 
Update market pools → 
Notify user via UI
```

### 3. Market Settlement
```
Admin settles market → 
Calculate winning payouts → 
Process payouts via Breez → 
Update payout status → 
Handle failed payouts with retry
```

## Configuration

### Environment Variables
```bash
# Required for Lightning payments
BREEZ_API_KEY=your_breez_api_key_here

# Optional: Database (defaults to memory storage)
DATABASE_URL=postgresql://user:password@host:port/database

# Environment
NODE_ENV=development # or production
```

### Development Mode
When `BREEZ_API_KEY` is not provided:
- App continues to work with mock invoices
- Balance shows 100k sats for testing
- Console shows helpful setup messages

## Error Handling

### Invoice Creation Failures
- Fallback to mock invoices in development
- Clear error messages to user
- Retry mechanisms for temporary failures

### Payment Detection
- Exponential backoff for status checks
- Invoice expiry handling (1 hour default)
- Failed payment cleanup

### Payout Failures
- 3-attempt retry with exponential backoff
- Error logging with detailed messages
- Manual retry capabilities
- Refund mechanisms for failed payouts

## Security Considerations

### Self-Custodial Design
- **No Fund Storage**: App never holds user funds
- **Metadata Only**: Database stores only payment metadata
- **Key Management**: Breez handles all private keys
- **Audit Trail**: Complete payment history tracking

### API Security
- Environment variable protection
- Input validation on all endpoints
- Rate limiting (recommended for production)
- Error message sanitization

## Deployment Guide

### Vercel Deployment

######################

1. Set environment variables in Vercel dashboard:
   ```
   BREEZ_API_KEY=your_api_key
   DATABASE_URL=your_postgresql_url (optional)
   ```

######################

2. Deploy normally - Breez SDK works in serverless environments

######################

### Production Checklist
- [ ] Add real Breez API key
- [ ] Configure PostgreSQL database
- [ ] Set up proper error monitoring
- [ ] Enable rate limiting
- [ ] Configure webhook endpoints (if needed)
- [ ] Test payout mechanisms
- [ ] Monitor invoice expiry handling

## Testing

### Development Testing
1. Run without `BREEZ_API_KEY` - uses mock payments
2. Create markets and test bet placement
3. Verify UI flows and error handling

### Production Testing  
1. Use Breez testnet API key first
2. Test small amounts with real Lightning payments
3. Verify payout mechanisms work correctly
4. Test edge cases (expired invoices, failed payments)

## Support

For Breez SDK issues:
- [Breez Documentation](https://docs.breez.technology/)
- [SDK GitHub Repository](https://github.com/breez/breez-sdk-liquid)
- Breez Developer Support

For NostrMood integration issues:
- Check console logs for Breez initialization
- Verify API key configuration
- Test with mock mode first
- Review database schema matches expectations