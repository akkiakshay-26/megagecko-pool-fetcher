/**
 * MegaGecko Pool Fetcher
 * 
 * Automated pool discovery and configuration generator for Solana DEXs
 * Fetches pools from GeckoTerminal API
 * API Docs: https://apiguide.geckoterminal.com/getting-started
 * 
 * Author: @MishaFYI (Telegram: https://t.me/MishaFYI)
 * 
 * Usage:
 *   npm run fetch              - Fetch and display pools
 *   npm run fetch:json         - Fetch and output as JSON only
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config();

const GECKO_TERMINAL_API = 'https://api.geckoterminal.com/api/v2';
const NETWORK = 'solana';

// Target tokens for arbitrage (can be configured via .env or modified here)
const TARGET_TOKENS: Record<string, string> = {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    cbBTC: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    WBTC: '5XZw2LKTyrfvfiskJ78AMpackRjPcyCif1WhUsPDuVqQ',
    // Add more tokens as needed
};

interface GeckoPool {
    id: string;
    type: string;
    attributes: {
        address: string;
        name: string;
        base_token: {
            address: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        quote_token: {
            address: string;
            name: string;
            symbol: string;
            decimals: number;
        };
        pool_created_at: string;
        reserve_in_usd: string;
        volume_usd: {
            m5?: string;
            m15?: string;
            m30?: string;
            h1?: string;
            h6?: string;
            h24: string;
        };
        price_change_percentage?: {
            m5?: string;
            m15?: string;
            m30?: string;
            h1?: string;
            h6?: string;
            h24?: string;
        };
        transactions?: {
            m5?: { buys: number; sells: number; buyers: number; sellers: number };
            m15?: { buys: number; sells: number; buyers: number; sellers: number };
            m30?: { buys: number; sells: number; buyers: number; sellers: number };
            h1?: { buys: number; sells: number; buyers: number; sellers: number };
            h6?: { buys: number; sells: number; buyers: number; sellers: number };
            h24?: { buys: number; sells: number; buyers: number; sellers: number };
        };
        base_token_price_usd?: string;
        base_token_price_native_currency?: string;
        quote_token_price_usd?: string;
        base_token_price_quote_token?: string;
        quote_token_price_base_token?: string;
        fdv_usd?: string;
        market_cap_usd?: string;
        locked_liquidity_percentage?: string;
        dex: {
            id: string;
            name: string;
        };
    };
}

interface GeckoResponse {
    data: GeckoPool[];
    meta?: {
        count: number;
    };
}

// Map GeckoTerminal DEX IDs to program IDs
const DEX_TO_PROGRAM_ID: Record<string, { programId: string; type: 'amm' | 'clmm' | 'orderbook' }> = {
    'raydium': { programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', type: 'amm' },
    'raydium_clmm': { programId: 'CLMMmwW4ardRXn1VqkVW38oywYcXoCskswJso1hHc5m', type: 'clmm' },
    'orca': { programId: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', type: 'amm' },
    'orca_whirlpool': { programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', type: 'clmm' },
    'phoenix': { programId: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', type: 'orderbook' },
    'meteora': { programId: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB', type: 'amm' },
    'meteora_dlmm': { programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', type: 'clmm' },
};

/**
 * Get pools by token address
 * Note: GeckoTerminal uses JSON:API format - token details are in the `included` array
 */
async function getPoolsByTokenAddress(tokenAddress: string): Promise<GeckoPool[]> {
    const url = `${GECKO_TERMINAL_API}/networks/${NETWORK}/tokens/${tokenAddress}/pools?include=base_token,quote_token,dex`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data: any = await response.json();
        
        // Map included tokens to their IDs
        const tokenMap = new Map<string, any>();
        const dexMap = new Map<string, any>();
        
        if (data.included) {
            for (const item of data.included) {
                if (item.type === 'token') {
                    tokenMap.set(item.id, item.attributes);
                } else if (item.type === 'dex') {
                    dexMap.set(item.id, item.attributes);
                }
            }
        }
        
        // Enrich pool data with token and dex details
        const extractAddress = (id: string): string => {
            if (id.startsWith('solana_')) {
                return id.substring(7); // Remove 'solana_' prefix
            }
            return id;
        };
        
        const enrichedPools: GeckoPool[] = (data.data || []).map((pool: any) => {
            const baseTokenId = pool.relationships?.base_token?.data?.id;
            const quoteTokenId = pool.relationships?.quote_token?.data?.id;
            const dexId = pool.relationships?.dex?.data?.id;
            
            const baseTokenData = baseTokenId ? tokenMap.get(baseTokenId) : null;
            const quoteTokenData = quoteTokenId ? tokenMap.get(quoteTokenId) : null;
            
            // Extract addresses from IDs if attributes are null
            const baseAddr = baseTokenData?.address || extractAddress(baseTokenId || '');
            const quoteAddr = quoteTokenData?.address || extractAddress(quoteTokenId || '');
            
            return {
                ...pool,
                attributes: {
                    ...pool.attributes, // Preserve all original attributes (prices, volumes, transactions, etc.)
                    base_token: {
                        address: baseAddr,
                        name: baseTokenData?.name || 'Unknown',
                        symbol: baseTokenData?.symbol || 'UNKNOWN',
                        decimals: baseTokenData?.decimals || 9,
                    },
                    quote_token: {
                        address: quoteAddr,
                        name: quoteTokenData?.name || 'Unknown',
                        symbol: quoteTokenData?.symbol || 'UNKNOWN',
                        decimals: quoteTokenData?.decimals || 9,
                    },
                    dex: dexId ? { id: dexId, name: dexMap.get(dexId)?.name || dexId } : { id: 'unknown', name: 'unknown' },
                },
            };
        });
        
        return enrichedPools.filter((p: GeckoPool) => p.attributes.base_token && p.attributes.quote_token);
    } catch (error: any) {
        console.error(`Failed to fetch pools for token ${tokenAddress}: ${error.message}`);
        return [];
    }
}

/**
 * Filter pools to only include those with our target tokens (pairs between target tokens)
 */
function filterRelevantPools(pools: GeckoPool[]): GeckoPool[] {
    const targetAddresses = new Set(Object.values(TARGET_TOKENS).map(addr => addr.toLowerCase()));
    
    return pools.filter((pool) => {
        if (!pool?.attributes?.base_token?.address || !pool?.attributes?.quote_token?.address) {
            return false;
        }
        
        const baseAddr = pool.attributes.base_token.address.toLowerCase();
        const quoteAddr = pool.attributes.quote_token.address.toLowerCase();
        
        const hasBase = targetAddresses.has(baseAddr);
        const hasQuote = targetAddresses.has(quoteAddr);
        
        return hasBase && hasQuote;
    });
}

/**
 * Filter pools to find USDC pools where the other token is NOT in target tokens
 */
function filterUSDCOnlyPools(pools: GeckoPool[]): GeckoPool[] {
    const targetAddresses = new Set(Object.values(TARGET_TOKENS).map(addr => addr.toLowerCase()));
    const usdcAddress = TARGET_TOKENS.USDC.toLowerCase();
    
    return pools.filter((pool) => {
        if (!pool?.attributes?.base_token?.address || !pool?.attributes?.quote_token?.address) {
            return false;
        }
        
        const baseAddr = pool.attributes.base_token.address.toLowerCase();
        const quoteAddr = pool.attributes.quote_token.address.toLowerCase();
        
        // Check if one token is USDC and the other is NOT in target tokens
        const isBaseUSDC = baseAddr === usdcAddress;
        const isQuoteUSDC = quoteAddr === usdcAddress;
        
        if (isBaseUSDC) {
            return !targetAddresses.has(quoteAddr); // Other token is not in target list
        }
        if (isQuoteUSDC) {
            return !targetAddresses.has(baseAddr); // Other token is not in target list
        }
        
        return false;
    });
}

/**
 * Filter pools by minimum liquidity and volume requirements
 */
function filterByLiquidityAndVolume(pools: GeckoPool[], minLiquidity: number = 1000, minVolume24h: number = 1000): GeckoPool[] {
    return pools.filter((pool) => {
        const liquidity = parseFloat(pool.attributes.reserve_in_usd || '0');
        const volume24h = parseFloat(pool.attributes.volume_usd?.h24 || '0');
        
        return liquidity >= minLiquidity && volume24h >= minVolume24h;
    });
}

/**
 * Convert GeckoTerminal pool to config format
 */
function geckoPoolToConfig(pool: GeckoPool, index: number): any {
    const dexId = pool.attributes.dex.id.toLowerCase();
    const dexInfo = DEX_TO_PROGRAM_ID[dexId] || DEX_TO_PROGRAM_ID['raydium_clmm'];
    
    const baseToken = pool.attributes.base_token;
    const quoteToken = pool.attributes.quote_token;
    
    // Determine token order (alphabetical by symbol for consistency)
    const tokens = [baseToken, quoteToken].sort((a, b) => a.symbol.localeCompare(b.symbol));
    const tokenA = tokens[0];
    const tokenB = tokens[1];
    
    const poolId = `gecko-${dexId}-${tokenA.symbol.toLowerCase()}-${tokenB.symbol.toLowerCase()}-${index}`;
    
    const config: any = {
        id: poolId,
        type: dexInfo.type,
        programId: dexInfo.programId,
        tokenA: {
            address: tokenA.address,
            decimals: tokenA.decimals,
            symbol: tokenA.symbol,
        },
        tokenB: {
            address: tokenB.address,
            decimals: tokenB.decimals,
            symbol: tokenB.symbol,
        },
        accounts: {},
        // Pool metadata
        address: pool.attributes.address,
        name: pool.attributes.name,
        pool_created_at: pool.attributes.pool_created_at,
        // Liquidity and volume
        liquidity_usd: pool.attributes.reserve_in_usd,
        volume_usd: pool.attributes.volume_usd,
        // Price data
        prices: {
            base_token_price_usd: pool.attributes.base_token_price_usd,
            base_token_price_native_currency: pool.attributes.base_token_price_native_currency,
            quote_token_price_usd: pool.attributes.quote_token_price_usd,
            base_token_price_quote_token: pool.attributes.base_token_price_quote_token,
            quote_token_price_base_token: pool.attributes.quote_token_price_base_token,
        },
        // Price changes
        price_change_percentage: pool.attributes.price_change_percentage,
        // Transaction data
        transactions: pool.attributes.transactions,
        // Market metrics
        market_metrics: {
            fdv_usd: pool.attributes.fdv_usd,
            market_cap_usd: pool.attributes.market_cap_usd,
            locked_liquidity_percentage: pool.attributes.locked_liquidity_percentage,
        },
        // DEX info
        dex: pool.attributes.dex,
    };
    
    // Set pool address based on type
    if (dexInfo.type === 'clmm') {
        config.accounts.state = pool.attributes.address;
    } else if (dexInfo.type === 'amm') {
        config.accounts.ammId = pool.attributes.address;
    } else if (dexInfo.type === 'orderbook') {
        config.accounts.market = pool.attributes.address;
    }
    
    return config;
}

/**
 * Main function
 */
async function main() {
    const jsonOnly = process.argv.includes('--json');
    
    if (!jsonOnly) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🦎 MEGAGECKO POOL FETCHER');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        console.log('Target tokens:');
        Object.entries(TARGET_TOKENS).forEach(([symbol, address]) => {
            console.log(`  ${symbol}: ${address}`);
        });
        console.log('');
    }
    
    const allPools = new Map<string, GeckoPool>();
    
    // Fetch pools for each target token
    for (const [symbol, address] of Object.entries(TARGET_TOKENS)) {
        if (!jsonOnly) {
            console.log(`Fetching pools for ${symbol} (${address})...`);
        }
        const pools = await getPoolsByTokenAddress(address);
        pools.forEach(pool => {
            allPools.set(pool.attributes.address, pool);
        });
        if (!jsonOnly) {
            console.log(`  Found ${pools.length} pools\n`);
        }
        
        // Rate limit: 30 calls per minute (wait 2 seconds between requests)
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!jsonOnly) {
        console.log(`Total unique pools: ${allPools.size}\n`);
    }
    
    // Filter to only relevant pools (involving our target tokens - pairs between target tokens)
    const relevantPools = filterRelevantPools(Array.from(allPools.values()));
    
    if (!jsonOnly) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Found ${relevantPools.length} target token pair pools (out of ${allPools.size} total)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // Filter target token pairs by minimum liquidity ($1000) and volume ($1000)
    const MIN_LIQUIDITY = 1000;
    const MIN_VOLUME_24H = 1000;
    const filteredTargetPairs = filterByLiquidityAndVolume(relevantPools, MIN_LIQUIDITY, MIN_VOLUME_24H);
    
    if (!jsonOnly) {
        console.log(`📊 Filtering target token pairs: min liquidity $${MIN_LIQUIDITY.toLocaleString()}, min 24h volume $${MIN_VOLUME_24H.toLocaleString()}`);
        console.log(`✅ ${filteredTargetPairs.length} target token pair pools passed filters (out of ${relevantPools.length} relevant pools)\n`);
    }
    
    // Find USDC-only pools (USDC paired with tokens NOT in target list)
    const usdcOnlyPools = filterUSDCOnlyPools(Array.from(allPools.values()));
    
    if (!jsonOnly) {
        console.log(`🔍 Found ${usdcOnlyPools.length} USDC pools with non-target tokens\n`);
    }
    
    // Filter USDC-only pools by minimum liquidity ($1000) and volume ($100,000)
    const MIN_VOLUME_24H_USDC_ONLY = 100000; // 100k minimum for USDC-only pools
    const filteredUSDCOnlyPools = filterByLiquidityAndVolume(usdcOnlyPools, MIN_LIQUIDITY, MIN_VOLUME_24H_USDC_ONLY);
    
    if (!jsonOnly) {
        console.log(`📊 Filtering USDC-only pools: min liquidity $${MIN_LIQUIDITY.toLocaleString()}, min 24h volume $${MIN_VOLUME_24H_USDC_ONLY.toLocaleString()}`);
        console.log(`✅ ${filteredUSDCOnlyPools.length} USDC-only pools passed filters (out of ${usdcOnlyPools.length} USDC-only pools)\n`);
    }
    
    // Combine both sets of pools
    const filteredPools = [...filteredTargetPairs, ...filteredUSDCOnlyPools];
    
    if (!jsonOnly) {
        console.log(`📊 Total filtered pools: ${filteredPools.length} (${filteredTargetPairs.length} target pairs + ${filteredUSDCOnlyPools.length} USDC-only)\n`);
    }
    
    // Group by pair
    const poolsByPair = new Map<string, GeckoPool[]>();
    filteredPools.forEach(pool => {
        const base = pool.attributes.base_token.symbol;
        const quote = pool.attributes.quote_token.symbol;
        const pair = [base, quote].sort().join('/');
        
        if (!poolsByPair.has(pair)) {
            poolsByPair.set(pair, []);
        }
        poolsByPair.get(pair)!.push(pool);
    });
    
    if (!jsonOnly) {
        // Display results
        poolsByPair.forEach((pools, pair) => {
            console.log(`\n${pair} (${pools.length} pools):`);
            pools.forEach((pool, idx) => {
                const liquidity = parseFloat(pool.attributes.reserve_in_usd || '0');
                const volume24h = parseFloat(pool.attributes.volume_usd?.h24 || '0');
                const dex = pool.attributes.dex.name;
                
                console.log(`  ${idx + 1}. ${pool.attributes.address}`);
                console.log(`     DEX: ${dex} (${pool.attributes.dex.id})`);
                console.log(`     Liquidity: $${liquidity.toLocaleString()}`);
                console.log(`     Volume 24h: $${volume24h.toLocaleString()}`);
            });
        });
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 GENERATED CONFIG ENTRIES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // Generate config entries
    const configs: any[] = [];
    let poolIndex = 0;
    
    poolsByPair.forEach((pools) => {
        pools.forEach(pool => {
            configs.push(geckoPoolToConfig(pool, poolIndex++));
        });
    });
    
    // Output JSON
    console.log(JSON.stringify(configs, null, 2));
    
    // Save to log file
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    const logFilename = `pools-${new Date().toISOString().split('T')[0]}.json`;
    const logPath = path.join(logsDir, logFilename);
    
    const logEntry = {
        timestamp,
        summary: {
            total_pools_fetched: allPools.size,
            relevant_pools: relevantPools.length,
            filtered_pools: filteredPools.length,
            configs_generated: configs.length,
            min_liquidity: MIN_LIQUIDITY,
            min_volume_24h: MIN_VOLUME_24H,
        },
        target_tokens: TARGET_TOKENS,
        configs,
        raw_pools: filteredPools.map(pool => ({
            address: pool.attributes.address,
            name: pool.attributes.name,
            dex: pool.attributes.dex,
            base_token: pool.attributes.base_token,
            quote_token: pool.attributes.quote_token,
            liquidity_usd: pool.attributes.reserve_in_usd,
            volume_usd: pool.attributes.volume_usd,
            pool_created_at: pool.attributes.pool_created_at,
        })),
    };
    
    // Read existing log file if it exists and append new entry
    let logData: any[] = [];
    if (fs.existsSync(logPath)) {
        try {
            const existingData = fs.readFileSync(logPath, 'utf-8');
            logData = JSON.parse(existingData);
            if (!Array.isArray(logData)) {
                logData = [logData];
            }
        } catch (error) {
            // If file is corrupted or invalid, start fresh
            logData = [];
        }
    }
    
    logData.push(logEntry);
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf-8');
    
    // Create human-readable log file
    const humanReadableFilename = `pools-${new Date().toISOString().split('T')[0]}.txt`;
    const humanReadablePath = path.join(logsDir, humanReadableFilename);
    
    let humanLog = '';
    humanLog += '═══════════════════════════════════════════════════════════════════════════════\n';
    humanLog += '🦎 MEGAGECKO POOL FETCHER - FETCH LOG\n';
    humanLog += '═══════════════════════════════════════════════════════════════════════════════\n\n';
    humanLog += `Timestamp: ${timestamp}\n`;
    humanLog += `Date: ${new Date(timestamp).toLocaleString()}\n\n`;
    
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    humanLog += '📊 SUMMARY\n';
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    humanLog += `Total Pools Fetched:     ${allPools.size}\n`;
    humanLog += `Relevant Pools:           ${relevantPools.length}\n`;
    humanLog += `Filtered Pools:           ${filteredPools.length}\n`;
    humanLog += `Configs Generated:        ${configs.length}\n`;
    humanLog += `Min Liquidity Filter:     $${MIN_LIQUIDITY.toLocaleString()}\n`;
    humanLog += `Min 24h Volume Filter:    $${MIN_VOLUME_24H.toLocaleString()}\n\n`;
    
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    humanLog += '🎯 TARGET TOKENS\n';
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    Object.entries(TARGET_TOKENS).forEach(([symbol, address]) => {
        humanLog += `${symbol.padEnd(10)} ${address}\n`;
    });
    humanLog += '\n';
    
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    humanLog += '💧 FILTERED POOLS\n';
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    poolsByPair.forEach((pools, pair) => {
        humanLog += `\n${pair} (${pools.length} pool${pools.length > 1 ? 's' : ''}):\n`;
        humanLog += '─'.repeat(80) + '\n';
        
        pools.forEach((pool, idx) => {
            const liquidity = parseFloat(pool.attributes.reserve_in_usd || '0');
            const volume24h = parseFloat(pool.attributes.volume_usd?.h24 || '0');
            const volume1h = parseFloat(pool.attributes.volume_usd?.h1 || '0');
            const priceChange24h = pool.attributes.price_change_percentage?.h24 || 'N/A';
            const buys24h = pool.attributes.transactions?.h24?.buys || 0;
            const sells24h = pool.attributes.transactions?.h24?.sells || 0;
            const dex = pool.attributes.dex.name;
            
            humanLog += `\n${idx + 1}. Pool Address: ${pool.attributes.address}\n`;
            humanLog += `   Name:           ${pool.attributes.name}\n`;
            humanLog += `   DEX:            ${dex} (${pool.attributes.dex.id})\n`;
            humanLog += `   Created:        ${pool.attributes.pool_created_at}\n`;
            humanLog += `   Liquidity:      $${liquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            humanLog += `   Volume 24h:     $${volume24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            humanLog += `   Volume 1h:      $${volume1h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
            humanLog += `   Price Change:   ${priceChange24h}% (24h)\n`;
            humanLog += `   Transactions:   ${buys24h} buys, ${sells24h} sells (24h)\n`;
            humanLog += `   Base Token:     ${pool.attributes.base_token.symbol} (${pool.attributes.base_token.address})\n`;
            humanLog += `   Quote Token:    ${pool.attributes.quote_token.symbol} (${pool.attributes.quote_token.address})\n`;
            
            if (pool.attributes.base_token_price_usd) {
                const basePrice = parseFloat(pool.attributes.base_token_price_usd);
                humanLog += `   Base Price:     $${basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}\n`;
            }
            if (pool.attributes.quote_token_price_usd) {
                const quotePrice = parseFloat(pool.attributes.quote_token_price_usd);
                humanLog += `   Quote Price:    $${quotePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}\n`;
            }
        });
        humanLog += '\n';
    });
    
    humanLog += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    humanLog += '⚙️  GENERATED CONFIGS\n';
    humanLog += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    
    configs.forEach((config, idx) => {
        humanLog += `${idx + 1}. ${config.id}\n`;
        humanLog += `   Type:        ${config.type.toUpperCase()}\n`;
        humanLog += `   Program ID:  ${config.programId}\n`;
        humanLog += `   Token A:     ${config.tokenA.symbol} (${config.tokenA.address})\n`;
        humanLog += `   Token B:     ${config.tokenB.symbol} (${config.tokenB.address})\n`;
        if (config.accounts.state) {
            humanLog += `   State:       ${config.accounts.state}\n`;
        } else if (config.accounts.ammId) {
            humanLog += `   AMM ID:      ${config.accounts.ammId}\n`;
        } else if (config.accounts.market) {
            humanLog += `   Market:      ${config.accounts.market}\n`;
        }
        humanLog += '\n';
    });
    
    humanLog += '═══════════════════════════════════════════════════════════════════════════════\n';
    humanLog += `End of log - ${timestamp}\n`;
    humanLog += '═══════════════════════════════════════════════════════════════════════════════\n';
    
    // Append to human-readable log file
    fs.appendFileSync(humanReadablePath, humanLog, 'utf-8');
    
    if (!jsonOnly) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Done! Copy the config entries above to your pool config file');
        console.log(`📝 Saved JSON log to:     ${logPath}`);
        console.log(`📄 Saved readable log to: ${humanReadablePath}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
}

main().catch(console.error);
