# Vercel Deployment Guide for NostrMood

######################

## Environment Variables Setup

######################

1. In your Vercel dashboard, go to your project settings
2. Navigate to the "Environment Variables" section
3. Add the following variables:

```
BREEZ_API_KEY=your_breez_api_key_here
DATABASE_URL=your_postgresql_connection_string (optional)
NODE_ENV=production
```

######################

## Deployment Process

######################

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the Node.js project
3. The build process will run:
   - `npm run build` for the client
   - `npm run build:server` for the server
4. Static files are served from `dist/public`
5. API routes are handled by the Express server

######################

## Database Setup (Optional)

######################

If you want to use PostgreSQL instead of memory storage:

1. Create a PostgreSQL database (recommended: Neon, Supabase, or Railway)
2. Add the `DATABASE_URL` environment variable
3. The app will automatically use the database instead of memory storage

######################

## Breez API Key Setup

######################

1. Sign up for Breez Developer Account
2. Generate your API key for testnet or mainnet
3. Add `BREEZ_API_KEY` to Vercel environment variables
4. Without this key, the app runs in development mode with mock payments

######################

## Verification Steps

######################

After deployment:

1. Check that the app loads correctly
2. Test creating a prediction market
3. Try placing a bet (will use mock payments if no Breez key)
4. Verify wallet balance display works
5. Test the Lightning payment modal

######################

## Security Notes

######################

- Never commit API keys to your repository
- Use environment variables for all sensitive configuration
- The Breez SDK handles all cryptographic operations
- Users retain custody of funds in their own wallets

######################