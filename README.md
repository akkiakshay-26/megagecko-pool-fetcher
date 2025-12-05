# 🦎 MegaGecko Pool Fetcher

> **Automated pool discovery and configuration generator for Solana DEXs**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solana](https://img.shields.io/badge/Solana-14F46B?logo=solana&logoColor=white)](https://solana.com/)
[![DeFi](https://img.shields.io/badge/DeFi-000000?logo=ethereum&logoColor=white)](https://defipulse.com/)

A powerful tool that automatically discovers, filters, and generates ready-to-use pool configurations using the [GeckoTerminal API](https://www.geckoterminal.com/dex-api) across multiple Solana DEXs. Perfect for arbitrage bots, trading automation, and DeFi research.

## ✨ Why This Fetcher is Super Useful

### 🎯 **Arbitrage Trading**
Discover pools with sufficient liquidity across multiple DEXs (Raydium, Orca, Meteora, etc.) to identify arbitrage opportunities. Automatically filters pools by liquidity and volume, ensuring you only get pools that can handle meaningful trade sizes.

### 🤖 **Automated Trading Bot Setup**
Get ready-to-use pool configurations in seconds. Instead of manually researching and configuring each pool, this tool generates complete configs with all necessary information (program IDs, token addresses, pool addresses) that your trading bot can use immediately.

### 📊 **Market Research & Analysis**
Analyze trading volumes, liquidity levels, and price movements across different DEXs. Comprehensive data includes transaction counts, price changes, and market metrics to help you understand market dynamics.

### 💧 **Liquidity Discovery**
Find pools with optimal liquidity for your trading strategy. Filter by minimum liquidity and volume thresholds to discover pools that match your risk tolerance and trading size requirements.

### 🔍 **Pool Discovery**
Quickly discover all available pools for specific token pairs across multiple DEXs. Perfect for finding alternative trading routes or identifying new market opportunities.

### 📈 **Market Monitoring**
Track pool metrics over time using the built-in logging system. Historical data helps you identify trends, monitor pool health, and make informed trading decisions.

### ⚡ **Time-Saving Automation**
Manually researching pools across multiple DEXs is time-consuming and error-prone. This tool automates the entire process, fetching, filtering, and formatting data in a single command.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/megagecko-pool-fetcher.git
cd megagecko-pool-fetcher

# Install dependencies
npm install
```

### Usage

```bash
# Fetch and display pools with details
npm run fetch

# Fetch and output JSON only (for automation)
npm run fetch:json
```

### First Run

On first run, the script will:
1. Fetch pools from GeckoTerminal API
2. Filter by liquidity and volume thresholds
3. Generate pool configurations
4. Save logs to `logs/` directory

## ⚙️ Configuration

**Fully customizable** - All settings can be modified in `fetchPools.ts`:

### Target Tokens

Edit the `TARGET_TOKENS` constant to specify which tokens you want to search for:

```typescript
const TARGET_TOKENS: Record<string, string> = {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    // Add your tokens here
};
```

> **Note:** The example tokens (USDC, WBTC, cbBTC) are provided as examples only. Replace them with any Solana token addresses you want to track.

### Filter Thresholds

Modify the minimum liquidity and volume filters in the `main()` function:

```typescript
const MIN_LIQUIDITY = 1000;  // Minimum liquidity in USD
const MIN_VOLUME_24H = 1000; // Minimum 24h volume in USD
```

> **Note:** The current values ($1,000) are examples. Adjust them based on your requirements.

## 📋 Features

- ✅ **Multi-DEX Support** - Raydium, Orca, Phoenix, Meteora, and more
- ✅ **Smart Filtering** - Automatic filtering by liquidity and volume
- ✅ **Complete Data** - Prices, volumes, transactions, market metrics
- ✅ **Ready-to-Use Configs** - Generated pool configurations for your bot
- ✅ **Dual Logging** - JSON logs for automation + human-readable logs
- ✅ **Fully Customizable** - All settings can be modified to match your strategy

## 📊 Output

The script generates:

1. **Console Output** - Formatted pool information and configs
2. **JSON Log** (`logs/pools-YYYY-MM-DD.json`) - Machine-readable data
3. **Text Log** (`logs/pools-YYYY-MM-DD.txt`) - Human-readable summary

Each pool config includes:
- Pool ID, type, and program ID
- Token details (addresses, decimals, symbols)
- Account addresses (state, ammId, or market)
- Liquidity, volume, prices, and market metrics

## 💡 Example Use Case

**Scenario:** You want to find all USDC/SOL pools with at least $10,000 liquidity for your arbitrage bot.

1. Edit `TARGET_TOKENS` to include USDC and SOL addresses
2. Set `MIN_LIQUIDITY = 10000` in the code
3. Run `npm run fetch`
4. Copy the generated configs to your bot
5. Start trading! 🚀

## 🔧 Example Output

```json
{
  "id": "gecko-orca-cbbtc-usdc-0",
  "type": "amm",
  "programId": "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
  "tokenA": {
    "address": "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    "decimals": 8,
    "symbol": "cbBTC"
  },
  "tokenB": {
    "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "decimals": 6,
    "symbol": "USDC"
  },
  "accounts": {
    "ammId": "HxA6SKW5qA4o12fjVgTpXdq2YnZ5Zv1s7SB4FFomsyLM"
  },
  "liquidity_usd": "4341059.523",
  "volume_usd": { "h24": "20463475.1896452" },
  "prices": { ... },
  "transactions": { ... }
}
```

## ⚠️ API Usage Notice & Limits

### GeckoTerminal API

This tool uses the [GeckoTerminal API](https://www.geckoterminal.com/dex-api) to fetch pool data.

**Rate Limits:**
- **30 calls per minute** (public API)
- The script includes a 2-second delay between requests to respect rate limits
- For higher rate limits, consider [CoinGecko API paid plans](https://www.coingecko.com/en/api/pricing)

**API Status:**
- Currently in **Beta** - subject to changes
- Free for public use
- Paid plans available for commercial use and higher limits

**Usage Terms:**
- Review [GeckoTerminal Terms and Conditions](https://www.geckoterminal.com/terms-conditions)
- For commercial applications, consider contacting GeckoTerminal or subscribing to a paid API plan
- Attribution to GeckoTerminal is appreciated

**Best Practices:**
- ✅ Respect rate limits (30 calls/minute)
- ✅ Use responsibly and don't abuse the API
- ✅ Consider paid plans for production/commercial use
- ✅ Don't resell or redistribute their data

## 📚 Documentation

For detailed information about:
- All available pool config fields
- Logging system details
- Supported DEXs

See [DOCUMENTATION.md](./DOCUMENTATION.md)

## 🛠️ Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **GeckoTerminal API** - Pool data source
- **ts-node** - TypeScript execution

## 📈 Use Cases

- **Arbitrage Bots** - Find profitable trading opportunities across DEXs
- **Liquidity Analysis** - Research pool liquidity and volume trends
- **Trading Automation** - Generate configs for automated trading systems
- **Market Research** - Analyze DeFi market dynamics on Solana
- **Pool Monitoring** - Track pool health and performance over time

## 🌟 Key Highlights

- ⚡ **Fast** - Fetches and processes pools in seconds
- 🔒 **Reliable** - Built-in rate limiting and error handling
- 📊 **Comprehensive** - Complete pool data with prices, volumes, transactions
- 🎯 **Focused** - Smart filtering ensures only relevant pools
- 🔧 **Flexible** - Fully customizable to match your strategy

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [GeckoTerminal](https://www.geckoterminal.com/) for providing the API
- Solana DEXs (Raydium, Orca, Meteora, Phoenix) for pool data

## 👤 Author

**MishaFYI**
- Telegram: [@MishaFYI](https://t.me/MishaFYI)

---

**Built for Solana DeFi** 🚀

⭐ **Star this repo if you find it useful!**
