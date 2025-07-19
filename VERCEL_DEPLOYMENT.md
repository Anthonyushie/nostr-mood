# Vercel Deployment Guide for NostrMood

This guide explains how to deploy your NostrMood Lightning prediction market application to Vercel with Breez Nodeless integration.

## Quick Deployment Steps

### 1. Add Environment Variables

In your Vercel dashboard, add these environment variables:

**Required for Lightning Payments:**
```
BREEZ_API_KEY=MIIBfjCCATCgAwIBAgIHPh1T9W3eozAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjUwNTI3MTgxMTM5WhcNMzUwNTI1MTgxMTM5WjArMRAwDgYDVQQKEwdpUGF5QlRDMRcwFQYDVQQDEw5BbnRob255ICBVc2hpZTAqMAUGAytlcAMhANCD9cvfIDwcoiDKKYdT9BunHLS2/OuKzV8NS0SzqV13o4GNMIGKMA4GA1UdDwEB/wQEAwIFoDAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBTaOaPuXmtLDTJVv++VYBiQr9gHCTAfBgNVHSMEGDAWgBTeqtaSVvON53SSFvxMtiCyayiYazAqBgNVHREEIzAhgR9hbnRob255dHdhbjc1b2ZmaWNpYWxAZ21haWwuY29t
```

**Optional (Database - uses memory storage if not provided):**
```
DATABASE_URL=postgresql://your-db-connection-string
```

**Environment:**
```
NODE_ENV=production
```

### 2. Deploy Steps

#### Option A: Deploy from Replit
1. In Replit, click "Deploy" button
2. Choose "Vercel" as deployment target
3. Environment variables will be prompted - add your Breez API key
4. Deploy!

#### Option B: Deploy from GitHub
1. Push your code to GitHub repository
2. Connect your GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### 3. Verify Deployment

After deployment:
1. Check that the app loads correctly
2. Try creating a prediction market
3. Test bet placement (will show Lightning invoices)
4. Verify wallet balance appears
5. Check browser console for any errors

## Environment Variable Setup in Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:

   **Name:** `BREEZ_API_KEY`
   **Value:** `[Your full API key from above]`
   **Environment:** Production, Preview, Development

   **Name:** `NODE_ENV`
   **Value:** `production`
   **Environment:** Production

4. Click **Save** for each variable
5. Redeploy your application

## Testing Your Deployment

### 1. Basic Functionality Test
- Visit your deployed URL
- Navigate through the sentiment analysis features
- Create a new prediction market
- Verify UI components load correctly

### 2. Lightning Payment Test
- Click "YES" or "NO" on a prediction market
- Verify Lightning invoice appears in modal
- Copy the invoice and test with a Lightning wallet
- Check that payment detection works

### 3. Wallet Integration Test  
- Check that wallet balance displays correctly
- Try the "Open Wallet" button functionality
- Verify clipboard copy works for invoices

## Troubleshooting

### Common Issues

**Issue: "Breez SDK not available" in logs**
- **Solution:** Ensure `BREEZ_API_KEY` is correctly set in Vercel environment variables
- **Check:** Variable name is exactly `BREEZ_API_KEY` (case-sensitive)
- **Verify:** No extra spaces or characters in the API key

**Issue: "Failed to fetch wallet balance"**
- **Solution:** This is normal if Breez SDK isn't initialized
- **Check:** Application still works with mock payments
- **Note:** Real balance will show once API key is properly configured

**Issue: Database errors**
- **Solution:** App uses memory storage by default (fine for testing)
- **Production:** Add `DATABASE_URL` for persistent data storage
- **Note:** Memory storage resets on each deployment

### Debug Steps

1. **Check Vercel Function Logs:**
   - Go to Vercel dashboard → Functions tab
   - Look for any error messages in the logs

2. **Verify Environment Variables:**
   - Settings → Environment Variables
   - Ensure all variables are set correctly
   - No typos in variable names

3. **Test Locally First:**
   - Set environment variables locally: `export BREEZ_API_KEY="your-key"`
   - Run `npm run dev` and test functionality
   - Fix any issues before deploying

## Production Considerations

### 1. Database Setup
For production, consider using a persistent PostgreSQL database:

```bash
# Add to environment variables:
DATABASE_URL=postgresql://user:password@host:port/dbname
```

Popular options:
- **Neon**: Free PostgreSQL with excellent Vercel integration
- **Supabase**: PostgreSQL with additional features
- **Railway**: Simple PostgreSQL hosting

### 2. Monitoring
Set up monitoring for:
- Failed Lightning payments
- Invoice expiry rates  
- Payout success/failure rates
- API response times

### 3. Security
- Keep API keys secure in Vercel environment variables
- Consider rate limiting for production
- Monitor for unusual payment patterns
- Set up error alerting

## Support

If you encounter issues:

1. **Check Console Logs:** Browser developer tools console
2. **Verify API Key:** Ensure it's the complete key without truncation
3. **Test Locally:** Replicate the issue in development
4. **Check Documentation:** Review `BREEZ_INTEGRATION.md` for technical details

## Success Indicators

Your deployment is working correctly when you see:

✅ Application loads without errors  
✅ Prediction markets can be created  
✅ Lightning invoices generate correctly  
✅ Wallet balance displays  
✅ Payment modal functions properly  
✅ No console errors related to Breez SDK  

The app is designed to work even without the API key (using mock payments), so basic functionality should always work. Real Lightning payments require the proper API key configuration.