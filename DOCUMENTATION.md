# MegaGecko Pool Fetcher - Detailed Documentation

This document contains detailed information about the MegaGecko Pool Fetcher, including all available fields, configuration options, and advanced usage.

## Table of Contents

- [Pool Config Fields](#pool-config-fields)
- [Logging Details](#logging-details)
- [API Rate Limits](#api-rate-limits)
- [Supported DEXs](#supported-dexs)

## Pool Config Fields

The script outputs pool configurations in JSON format that can be copied to your bot's pool config file.

### Core Pool Information
- `id` - Unique pool identifier
- `type` - DEX type (AMM, CLMM, or Orderbook)
- `programId` - Solana program ID for the DEX
- `address` - Pool address on-chain
- `name` - Pool name
- `pool_created_at` - Pool creation timestamp

### Token Information
- `tokenA` / `tokenB` - Token details (address, decimals, symbol)
- `accounts` - Account addresses (state, ammId, or market depending on DEX type)

### Liquidity & Volume
- `liquidity_usd` - Total liquidity in USD (`reserve_in_usd`)
- `volume_usd` - Trading volume across multiple timeframes:
  - `m5` - 5-minute volume
  - `m15` - 15-minute volume
  - `m30` - 30-minute volume
  - `h1` - 1-hour volume
  - `h6` - 6-hour volume
  - `h24` - 24-hour volume

### Price Data
- `prices.base_token_price_usd` - Base token price in USD
- `prices.base_token_price_native_currency` - Base token price in SOL
- `prices.quote_token_price_usd` - Quote token price in USD
- `prices.base_token_price_quote_token` - Exchange rate (base/quote)
- `prices.quote_token_price_base_token` - Reverse exchange rate (quote/base)

### Price Changes
- `price_change_percentage` - Price change % across timeframes:
  - `m5`, `m15`, `m30` - Short-term changes
  - `h1`, `h6`, `h24` - Medium to long-term changes

### Transaction Data
- `transactions` - Transaction statistics per timeframe:
  - `buys` - Number of buy transactions
  - `sells` - Number of sell transactions
  - `buyers` - Unique buyer count
  - `sellers` - Unique seller count

### Market Metrics
- `market_metrics.fdv_usd` - Fully diluted valuation
- `market_metrics.market_cap_usd` - Market capitalization
- `market_metrics.locked_liquidity_percentage` - Percentage of locked liquidity

### DEX Information
- `dex.id` - DEX identifier
- `dex.name` - DEX name

## Logging Details

All fetched pool data is automatically saved to log files in the `logs/` directory. Two log files are created for each fetch:

### JSON Log (`pools-YYYY-MM-DD.json`)
Machine-readable JSON format containing:
- **timestamp** - When the fetch was performed
- **summary** - Statistics about the fetch (total pools, filtered pools, etc.)
- **target_tokens** - The tokens that were searched
- **configs** - Generated pool configurations
- **raw_pools** - Raw pool data with key information

### Human-Readable Log (`pools-YYYY-MM-DD.txt`)
Human-friendly text format containing:
- Summary statistics
- Target tokens list
- Detailed pool information (liquidity, volume, prices, transactions)
- Generated configs in readable format

Log files are organized by date, with all fetches from the same day appended to the same file.

## API Rate Limits & Usage

### Rate Limits

- **Public API**: 30 calls per minute
- The script includes a 2-second delay between requests to respect rate limits
- For higher rate limits, consider [CoinGecko API paid plans](https://www.coingecko.com/en/api/pricing)

### API Status

- Currently in **Beta** - subject to changes
- Free for public use
- Paid plans available for commercial use and higher limits

### Usage Terms

- Review [GeckoTerminal Terms and Conditions](https://www.geckoterminal.com/terms-conditions)
- For commercial applications, consider contacting GeckoTerminal or subscribing to a paid API plan
- Attribution to GeckoTerminal is appreciated

### Best Practices

- Respect rate limits (30 calls/minute)
- Use responsibly and don't abuse the API
- Consider paid plans for production/commercial use
- Don't resell or redistribute their data

## Supported DEXs

- Raydium (AMM & CLMM)
- Orca (AMM & Whirlpool)
- Phoenix (Orderbook)
- Meteora (AMM & DLMM)

## References

- [GeckoTerminal API Docs](https://apiguide.geckoterminal.com/getting-started)
