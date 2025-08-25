# Token Alert Monitor

A real-time command-line monitoring tool for tracking token alerts associated with a specific wallet address.

## Features

- 🔄 **Real-time Updates**: Refreshes every 10 seconds with live countdown
- 📊 **Live Metrics**: Displays current price, market cap, volume, 24h change, and liquidity
- 🎯 **Wallet-Specific**: Monitors only tokens that have alerts set for the specified wallet
- 🌈 **Color-Coded**: Easy-to-read colored output with status indicators
- 📈 **Multiple DEX Support**: Uses DexScreener API for comprehensive Solana token data
- ⏱️ **Performance Stats**: Shows total tracked value and last update time

## Installation

First, install the required dependencies:

```bash
npm install chalk @supabase/supabase-js
```

## Usage

### Basic Usage

```bash
npm run monitor <wallet_address>
```

### Example

```bash
npm run monitor 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### Direct Node Usage

```bash
node scripts/token-monitor.js 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

## Environment Variables

Make sure these environment variables are set in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Display Columns

| Column         | Description                                   |
| -------------- | --------------------------------------------- |
| **TICKER**     | Token symbol (e.g., SOL, USDC)                |
| **PRICE**      | Current USD price                             |
| **MARKET CAP** | Total market capitalization                   |
| **VOLUME 24H** | 24-hour trading volume                        |
| **24H CHANGE** | Price change percentage with trend indicator  |
| **LIQUIDITY**  | Available liquidity on DEX                    |
| **STATUS**     | Alert status (🟢 ACTIVE, 🟡 PAUSED, 🔴 ERROR) |

## Status Indicators

- 🟢 **ACTIVE**: Alert is active and monitoring
- 🟡 **PAUSED**: Alert is temporarily disabled
- 🔴 **ERROR**: Failed to fetch current token data
- ⚪ **UNKNOWN**: Alert status unclear

## Number Formatting

- **K** = Thousands (1,000)
- **M** = Millions (1,000,000)
- **B** = Billions (1,000,000,000)

## Price Change Indicators

- ▲ Green: Positive change
- ▼ Red: Negative change
- ● Gray: No change or unknown

## Controls

- **Ctrl+C**: Exit the monitor

## Troubleshooting

### "Wallet not found in database"

- Ensure the wallet address is correct and has been used with the Memealert app
- The wallet must have created at least one alert to appear in the system

### "No active alerts found"

- The wallet exists but has no active alerts
- Add token alerts through the main dashboard to start monitoring

### API Rate Limiting

- The script uses DexScreener's public API
- If you see frequent errors, the API might be rate-limited
- Consider adding delays between requests for high-frequency monitoring

## Development

To modify the refresh interval, change the `REFRESH_INTERVAL` constant in the script:

```javascript
const REFRESH_INTERVAL = 10000; // 10 seconds
```

## Data Sources

- **Token Data**: DexScreener API
- **Alert Data**: Supabase database
- **DEX Support**: Raydium, Orca, Jupiter, and other Solana DEXs

## API Integration

The monitor integrates with:

- DexScreener API for real-time token prices and metrics
- Supabase for alert and user data
- Multiple Solana DEXs for liquidity information
