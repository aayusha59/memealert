#!/usr/bin/env node

/**
 * Real-time Token Alert Monitor
 * 
 * Monitors all tokens being tracked for a specific wallet address
 * Refreshes every 10 seconds with live countdown
 * Displays: Ticker, Market Cap, Volume, % Gain, Price
 */

const { createClient } = require('@supabase/supabase-js')
const chalk = require('chalk')
const readline = require('readline')
const fetch = require('node-fetch')

// Configuration
const REFRESH_INTERVAL = 10000 // 10 seconds
const WALLET_ADDRESS = process.argv[2] // Get wallet address from command line

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('❌ Supabase credentials not found in environment variables'))
  process.exit(1)
}

if (!WALLET_ADDRESS) {
  console.error(chalk.red('❌ Please provide a wallet address as an argument'))
  console.log(chalk.yellow('Usage: node token-monitor.js <wallet_address>'))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Global state
let countdownSeconds = 0
let monitoringActive = true
let currentAlerts = []

// Clear screen and move cursor to top
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f')
}

// Format numbers for display
function formatNumber(num) {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B'
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K'
  }
  return num?.toFixed(2) || '0.00'
}

// Format percentage with color
function formatPercentage(change) {
  if (!change) return chalk.gray('0.00%')
  
  const formatted = change.toFixed(2) + '%'
  if (change > 0) {
    return chalk.green('▲ ' + formatted)
  } else if (change < 0) {
    return chalk.red('▼ ' + formatted)
  }
  return chalk.gray('● ' + formatted)
}

// Format price
function formatPrice(price) {
  if (!price) return '$0.00'
  
  if (price < 0.01) {
    return '$' + price.toFixed(6)
  } else if (price < 1) {
    return '$' + price.toFixed(4)
  }
  return '$' + price.toFixed(2)
}

// Fetch user data by wallet address
async function getUserByWallet(walletAddress) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()
  
  if (error) {
    console.error('Error fetching user:', error)
    return null
  }
  
  return data
}

// Fetch all alerts for a user
async function getUserAlerts(userId) {
  const { data: alertsData, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('notifications_enabled', true) // Only get active alerts

  if (alertsError) {
    console.error('Error fetching alerts:', alertsError)
    return []
  }

  return alertsData
}

// Fetch live token data from DexScreener API
async function fetchLiveTokenData(tokenAddress) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.pairs || data.pairs.length === 0) {
      throw new Error('No pairs found for token')
    }
    
    // Find the best Solana pair (highest liquidity/volume)
    const solanaPairs = data.pairs.filter(pair => pair.chainId === "solana")
    if (solanaPairs.length === 0) {
      throw new Error('No Solana pairs found')
    }
    
    // Sort by volume and take the highest
    const bestPair = solanaPairs.sort((a, b) => {
      const volumeA = parseFloat(a.volume?.h24 || '0')
      const volumeB = parseFloat(b.volume?.h24 || '0')
      return volumeB - volumeA
    })[0]
    
    return {
      price: parseFloat(bestPair.priceUsd) || 0,
      change24h: parseFloat(bestPair.priceChange?.h24) || 0,
      marketCap: parseFloat(bestPair.marketCap) || 0,
      volume24h: parseFloat(bestPair.volume?.h24) || 0,
      liquidity: parseFloat(bestPair.liquidity?.usd) || 0,
      dexName: bestPair.dexId || 'Unknown',
      pairAddress: bestPair.pairAddress || ''
    }
  } catch (error) {
    console.error(`Error fetching data for ${tokenAddress}:`, error.message)
    // Return null data instead of random data on error
    return {
      price: 0,
      change24h: 0,
      marketCap: 0,
      volume24h: 0,
      liquidity: 0,
      dexName: 'Error',
      pairAddress: ''
    }
  }
}

// Update alert data with live token metrics
async function updateAlertWithLiveData(alert) {
  try {
    const liveData = await fetchLiveTokenData(alert.token_address)
    
    return {
      ...alert,
      live_price: liveData.price,
      live_change24h: liveData.change24h,
      live_market_cap: liveData.marketCap,
      live_volume24h: liveData.volume24h,
      live_liquidity: liveData.liquidity,
      live_dexName: liveData.dexName,
      live_pairAddress: liveData.pairAddress,
      last_updated: new Date()
    }
  } catch (error) {
    console.error(`Error fetching live data for ${alert.token_symbol}:`, error)
    return {
      ...alert,
      live_dexName: 'Error',
      last_updated: new Date()
    }
  }
}

// Display the monitoring interface
function displayMonitoringInterface() {
  clearScreen()
  
  console.log(chalk.cyan.bold('🚀 MEMEALERT TOKEN MONITOR'))
  console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log()
  
  console.log(chalk.yellow(`📱 Monitoring wallet: ${WALLET_ADDRESS}`))
  console.log(chalk.yellow(`🔄 Next refresh in: ${countdownSeconds}s`))
  console.log(chalk.yellow(`📊 Active alerts: ${currentAlerts.length}`))
  console.log()
  
  if (currentAlerts.length === 0) {
    console.log(chalk.gray('No active alerts found for this wallet.'))
    console.log(chalk.gray('Add some token alerts in the dashboard to start monitoring!'))
    return
  }
  
  // Header
  console.log(chalk.white.bold('TICKER'.padEnd(12) + 'PRICE'.padEnd(15) + 'MARKET CAP'.padEnd(15) + 'VOLUME 24H'.padEnd(15) + '24H CHANGE'.padEnd(15) + 'LIQUIDITY'.padEnd(15) + 'STATUS'))
  console.log(chalk.gray('─'.repeat(110)))
  
  // Alert rows
  currentAlerts.forEach(alert => {
    const ticker = chalk.cyan.bold(alert.token_symbol?.padEnd(12) || 'UNKNOWN'.padEnd(12))
    const price = formatPrice(alert.live_price || alert.price).padEnd(15)
    const marketCap = formatNumber(alert.live_market_cap || alert.market_cap).padEnd(15)
    const volume = formatNumber(alert.live_volume24h || alert.volume_24h).padEnd(15)
    const change = formatPercentage(alert.live_change24h || alert.change_24h).padEnd(25)
    const liquidity = formatNumber(alert.live_liquidity || 0).padEnd(15)
    
    let status = ''
    if (alert.status === 'active') {
      status = chalk.green('🟢 ACTIVE')
    } else if (alert.status === 'paused') {
      status = chalk.yellow('🟡 PAUSED')
    } else {
      status = chalk.gray('⚪ UNKNOWN')
    }
    
    // Add error indicator if data fetch failed
    if (alert.live_dexName === 'Error') {
      status = chalk.red('🔴 ERROR')
    }
    
    console.log(ticker + price + marketCap + volume + change + liquidity + status)
    
    // Show additional info for each token
    if (alert.live_dexName && alert.live_dexName !== 'Error') {
      console.log(chalk.gray('         │ ' + `DEX: ${alert.live_dexName} | Contract: ${alert.token_address.slice(0, 8)}...${alert.token_address.slice(-8)}`))
    }
  })
  
  console.log()
  console.log(chalk.gray('─'.repeat(110)))
  console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`))
  console.log(chalk.gray(`Total value tracked: ${formatNumber(currentAlerts.reduce((sum, alert) => sum + (alert.live_market_cap || alert.market_cap || 0), 0))}`))
  console.log()
  console.log(chalk.gray('Press Ctrl+C to exit'))
}

// Main monitoring loop
async function startMonitoring() {
  console.log(chalk.blue('🔍 Looking up wallet...'))
  
  // Get user data
  const user = await getUserByWallet(WALLET_ADDRESS)
  if (!user) {
    console.error(chalk.red('❌ Wallet not found in database'))
    process.exit(1)
  }
  
  console.log(chalk.green(`✅ Found user: ${user.id}`))
  
  // Initial load
  await refreshAlerts(user.id)
  
  // Start countdown timer
  const countdownTimer = setInterval(() => {
    if (countdownSeconds > 0) {
      countdownSeconds--
      displayMonitoringInterface()
    }
  }, 1000)
  
  // Start refresh cycle
  const refreshTimer = setInterval(async () => {
    if (monitoringActive) {
      countdownSeconds = 10
      await refreshAlerts(user.id)
    }
  }, REFRESH_INTERVAL)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down monitor...'))
    clearInterval(countdownTimer)
    clearInterval(refreshTimer)
    monitoringActive = false
    process.exit(0)
  })
  
  // Initial countdown
  countdownSeconds = 10
  displayMonitoringInterface()
}

// Add delay between API calls to respect rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Refresh alerts data
async function refreshAlerts(userId) {
  try {
    console.log(chalk.blue('🔄 Refreshing token data...'))
    
    const alerts = await getUserAlerts(userId)
    
    // Update each alert with live data (with rate limiting)
    const updatedAlerts = []
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i]
      const updatedAlert = await updateAlertWithLiveData(alert)
      updatedAlerts.push(updatedAlert)
      
      // Add small delay between API calls to respect rate limits
      if (i < alerts.length - 1) {
        await delay(200) // 200ms delay between calls
      }
    }
    
    currentAlerts = updatedAlerts
    displayMonitoringInterface()
    
  } catch (error) {
    console.error(chalk.red('❌ Error refreshing alerts:'), error)
  }
}

// Start the monitor
console.log(chalk.green.bold('🚀 Starting Token Monitor...'))
console.log(chalk.blue(`📱 Wallet Address: ${WALLET_ADDRESS}`))
console.log(chalk.blue(`⏱️  Refresh Interval: ${REFRESH_INTERVAL / 1000}s`))
console.log()

startMonitoring().catch(error => {
  console.error(chalk.red('❌ Monitor failed to start:'), error)
  process.exit(1)
})
