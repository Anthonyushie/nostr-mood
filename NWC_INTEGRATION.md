# Nostr Wallet Connect (NWC) Lightning Integration Guide

This document explains how NostrMood integrates with Nostr Wallet Connect (NWC) for Lightning payments in prediction markets.

## Overview

The NWC integration provides:
- ✅ **Invoice Creation**: Generate Lightning invoices using connected wallets
- ✅ **Payment Detection**: WebLN integration for automatic payment detection
- ✅ **Multi-Wallet Support**: Compatible with Alby, Zeus, and other NWC wallets
- ✅ **Self-Custodial**: Users maintain full custody of funds in their wallets
- ✅ **Decentralized**: No custodial services or API keys required
- ✅ **Nostr Protocol**: Built on open Nostr protocol standards

## Architecture

### Core Components

#### 1. NWCService (`server/nwcService.ts`)
Central service handling all NWC operations:

```typescript
class NWCService {
  // Initialize NWC with connection string
  async initialize(nwcConnectionString?: string): Promise<void>
  
  // Create Lightning invoice for bets
  async createInvoice(amountSats: number, description?: string): Promise<NWCInvoice>
  
  // Get wallet balance
  async getWalletInfo(): Promise<WalletBalance>
  
  // Send payouts to winners
  async sendPayout(bolt11: string): Promise<NWCPayment>
}
```

#### 2. useNWCPayments Hook (`client/src/hooks/useNWCPayments.ts`)
Frontend hook for NWC operations:

```typescript
function useNWCPayments() {
  return {
    // Payment methods
    createBet: (marketId, position, amount, userPubkey) => Promise<any>
    checkBetStatus: (betId) => Promise<any>
    fetchBalance: () => Promise<WalletBalance>
    
    // Connection methods
    connectNWC: (connectionString) => Promise<void>
    disconnectWallet: () => void
    checkWeblnEnabled: () => Promise<void>
    
    // State
    walletConnection: 'none' | 'webln' | 'nwc'
    isWeblnEnabled: boolean
    balance: WalletBalance | null
    isLoading: boolean
  }
}
```

#### 3. NWCPaymentModal Component (`client/src/components/PredictionMarket/NWCPaymentModal.tsx`)
Payment modal with wallet connection options:
- WebLN wallet connection (Alby extension, Zeus, etc.)
- NWC connection string input
- Payment status display
- Real-time payment detection

### Database Schema Updates

NWC-compatible payment tracking fields:

```sql
-- Enhanced bet records with NWC fields
CREATE TABLE prediction_bets (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES prediction_markets(id),
  user_pubkey TEXT NOT NULL,
  position TEXT CHECK (position IN ('yes', 'no')),
  amount INTEGER NOT NULL,
  
  -- NWC Payment Fields
  invoice_id TEXT UNIQUE,
  payment_request TEXT,
  payment_hash TEXT,
  
  -- Payment Status
  is_paid BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Settlement Fields
  is_settled BOOLEAN DEFAULT FALSE,
  payout INTEGER DEFAULT 0,
  payout_status TEXT DEFAULT 'pending',
  payout_retries INTEGER DEFAULT 0,
  payout_error TEXT,
  payout_tx_id TEXT,
  payout_invoice TEXT
);
```

## Wallet Connection Options

### 1. WebLN Integration
For browser extension wallets (Alby, Zeus, etc.):
- Automatic wallet detection
- One-click payments
- Real-time balance fetching
- Seamless user experience

```javascript
// WebLN connection example
if (window.webln) {
  await window.webln.enable();
  const invoice = await window.webln.makeInvoice({ amount: 1000 });
  await window.webln.sendPayment(paymentRequest);
}
```

### 2. Nostr Wallet Connect (NWC)
For mobile wallets and advanced users:
- Connection string format: `nostr+walletconnect://pubkey@relay?relay=relay&secret=secret`
- Encrypted communication via Nostr relays
- Works with any NWC-compatible wallet

```javascript
// NWC connection example
const nwcConnection = "nostr+walletconnect://abc123...@relay.example.com?secret=xyz789";
await nwcService.initialize(nwcConnection);
```

## Payment Flow

### Bet Placement Flow
1. **User Action**: Click YES/NO bet button
2. **Wallet Check**: Detect available wallets (WebLN/NWC)
3. **Connection**: Connect to user's preferred wallet
4. **Invoice Creation**: Generate Lightning invoice via NWC
5. **Payment**: User pays through connected wallet
6. **Confirmation**: Real-time payment detection
7. **Settlement**: Automatic market settlement when expired

### Mock Development Mode
When no wallet is connected, the system operates with mock data:
- Mock invoices for testing UI
- Simulated payment flows
- Development-friendly fallbacks
- No real Lightning Network interaction

## Environment Variables

```bash
# Optional: NWC connection string for server-side operations
NWC_CONNECTION_STRING=nostr+walletconnect://...

# No API keys required (unlike centralized solutions)
# No custodial services needed
# No external dependencies on payment providers
```

## Security Considerations

### Self-Custodial Design
- **No Fund Storage**: App never holds user funds
- **Metadata Only**: Database stores only payment metadata
- **User Control**: Users retain full private key control
- **Audit Trail**: Complete payment history tracking

### Privacy Features
- **No KYC Required**: Anonymous Lightning payments
- **Minimal Data**: Only essential payment metadata stored
- **Nostr Privacy**: Encrypted communication via Nostr relays
- **Local Storage**: Connection data stored locally in browser

## Error Handling

### Connection Failures
- Graceful fallback to mock mode
- Clear error messages to user
- Multiple connection options available

### Payment Detection
- WebLN automatic detection
- Manual payment confirmation options
- Invoice expiry handling (1 hour default)

### Payout Failures
- Retry logic with exponential backoff
- Error logging with detailed messages
- Manual payout capabilities

## Development Setup

### Local Development
1. **No API Keys**: No external API keys required
2. **Mock Payments**: Automatic mock payment fallbacks
3. **WebLN Testing**: Use Alby extension for testing
4. **NWC Testing**: Use testnet NWC connections

### Testing Wallets
- **Alby Extension**: Best for WebLN testing
- **Zeus Mobile**: Excellent for NWC testing
- **Mutiny Wallet**: Web-based Lightning wallet
- **Phoenix Wallet**: Mobile Lightning wallet

### Production Deployment
1. **No External APIs**: Self-contained Lightning integration
2. **Wallet Compatibility**: Works with any NWC-compatible wallet
3. **Relay Selection**: Configure reliable Nostr relays
4. **Performance**: Optimized for real-time payment detection

## Supported Wallets

### WebLN Compatible
- ✅ Alby Browser Extension
- ✅ Zeus (Desktop/Mobile)
- ✅ Joule Browser Extension
- ✅ LndHub.io wallets

### NWC Compatible
- ✅ Alby (with NWC connection)
- ✅ Zeus (with NWC support)
- ✅ Mutiny Wallet
- ✅ Phoenix Wallet (upcoming)
- ✅ Any wallet implementing NIP-47

## Migration from Breez SDK

### Key Improvements
- **No API Keys**: Eliminated dependency on Breez API keys
- **More Wallets**: Support for any NWC-compatible wallet
- **Decentralized**: No reliance on centralized payment processors
- **Self-Custodial**: Users maintain full fund custody
- **Open Protocol**: Built on open Nostr standards

### Breaking Changes
- Environment variable changed from `BREEZ_API_KEY` to `NWC_CONNECTION_STRING`
- Payment modal updated to support multiple connection methods
- Database schema remains compatible (only field names changed)

## Troubleshooting

### Common Issues

#### "Wallet not detected"
- Install a WebLN-compatible browser extension
- Enable the wallet extension
- Refresh the page and try again

#### "NWC connection failed"
- Verify the NWC connection string format
- Check that the Nostr relay is accessible
- Ensure the wallet supports NWC (NIP-47)

#### "Payment not detected"
- Wait a few seconds for payment confirmation
- Check if the invoice has expired
- Verify the Lightning payment was successful

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## Resources

- [NIP-47 Wallet Connect Specification](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [WebLN API Documentation](https://webln.guide/)
- [Nostr Protocol Documentation](https://nostr.com/)
- [Alby NWC Guide](https://guides.getalby.com/developer-guide/wallet-connect)

## Support

For NWC integration issues:
- [Nostr Developer Community](https://njump.me/npub1...)
- [WebLN GitHub Issues](https://github.com/joule-labs/webln)
- [Alby Developer Support](https://getalby.com/developers)

---

**Note**: This implementation prioritizes decentralization, user privacy, and self-custody over centralized convenience. Users maintain full control of their funds while enjoying seamless Lightning payments.