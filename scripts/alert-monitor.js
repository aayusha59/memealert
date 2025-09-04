#!/usr/bin/env node

/**
 * Background Alert Monitor Service
 * 
 * Continuously monitors all active token alerts and sends notifications
 * when conditions are met. Runs independently of the main application.
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Import chalk with fallback for compatibility
let chalk
try {
  chalk = require('chalk')
} catch (error) {
  // Fallback if chalk is not available
  chalk = {
    red: (text) => text,
    green: (text) => text,
    blue: (text) => text,
    yellow: (text) => text,
    cyan: (text) => text,
    gray: (text) => text,
    magenta: (text) => text,
    bold: (text) => text
  }
  chalk.green.bold = (text) => text
  chalk.cyan.bold = (text) => text
}

// Load environment variables
dotenv.config({ path: '../.env.local' })
dotenv.config({ path: '../.env' })

// Configuration
const MONITOR_INTERVAL = 5000 // 5 seconds
const API_DELAY = 200 // 200ms between token API calls

console.log('🔍 Environment check:')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing')
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Found' : 'Missing')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('❌ Supabase credentials not found in environment variables'))
  console.log('Please create a .env.local file in the project root with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Global state
let isMonitoring = true
let monitoringStats = {
  cyclesRun: 0,
  alertsProcessed: 0,
  notificationsSent: 0,
  errors: 0,
  lastRun: null
}

// Import the alert processing logic
async function processAlerts() {
  try {
    // This would call the alert engine from the services
    // For now, we'll implement a simplified version here
    
    console.log(chalk.blue('🔍 Processing alerts...'))
    
    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        *,
        alert_metrics (*),
        users (phone_number)
      `)
      .eq('notifications_enabled', true)

    if (alertsError) {
      console.error(chalk.red('❌ Error fetching alerts:'), alertsError)
      return { processed: 0, triggered: 0, sent: 0, errors: 1 }
    }

    if (!alerts || alerts.length === 0) {
      console.log(chalk.yellow('ℹ️ No active alerts found'))
      return { processed: 0, triggered: 0, sent: 0, errors: 0 }
    }

    console.log(chalk.green(`📊 Found ${alerts.length} active alerts`))

    const stats = { processed: 0, triggered: 0, sent: 0, errors: 0 }

    // Group alerts by token to minimize API calls
    const tokenGroups = new Map()
    alerts.forEach(alert => {
      const existing = tokenGroups.get(alert.token_address) || []
      existing.push(alert)
      tokenGroups.set(alert.token_address, existing)
    })

    // Process each token group
    for (const [tokenAddress, tokenAlerts] of tokenGroups) {
      try {
        console.log(chalk.cyan(`🔍 Processing ${tokenAlerts.length} alerts for token: ${tokenAddress.slice(0, 8)}...`))
        
        // Fetch token data
        const tokenData = await fetchTokenData(tokenAddress)
        
        if (!tokenData) {
          console.log(chalk.yellow(`⚠️ No data available for token: ${tokenAddress}`))
          continue
        }

        // Process each alert for this token
        for (const alert of tokenAlerts) {
          stats.processed++
          
          const triggers = evaluateAlert(alert, tokenData)
          
          if (triggers.length > 0) {
            stats.triggered += triggers.length
            console.log(chalk.red(`🚨 ${triggers.length} alert(s) triggered for ${alert.token_symbol}`))
            
            for (const trigger of triggers) {
              try {
                await sendNotification(trigger)
                stats.sent++
                console.log(chalk.green(`✅ Notification sent: ${trigger.type} for ${trigger.tokenSymbol}`))
              } catch (error) {
                stats.errors++
                console.error(chalk.red(`❌ Failed to send notification:`, error.message))
              }
            }
          }
        }

        // Respect API rate limits
        await delay(API_DELAY)
        
      } catch (error) {
        stats.errors++
        console.error(chalk.red(`❌ Error processing token ${tokenAddress}:`), error.message)
      }
    }

    return stats
    
  } catch (error) {
    console.error(chalk.red('❌ Fatal error in alert processing:'), error)
    return { processed: 0, triggered: 0, sent: 0, errors: 1 }
  }
}

// Fetch live token data from DexScreener
async function fetchTokenData(tokenAddress) {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)
    const data = await response.json()

    if (!data.pairs || data.pairs.length === 0) {
      return null
    }

    // Find the best Solana pair
    const solanaPairs = data.pairs.filter(pair => pair.chainId === 'solana')
    if (solanaPairs.length === 0) {
      return null
    }

    const bestPair = solanaPairs.reduce((best, current) => {
      const bestLiquidity = parseFloat(best.liquidity?.usd) || 0
      const currentLiquidity = parseFloat(current.liquidity?.usd) || 0
      return currentLiquidity > bestLiquidity ? current : best
    })

    return {
      address: tokenAddress,
      price: parseFloat(bestPair.priceUsd) || 0,
      change24h: parseFloat(bestPair.priceChange?.h24) || 0,
      marketCap: parseFloat(bestPair.marketCap) || 0,
      volume24h: parseFloat(bestPair.volume?.h24) || 0
    }
  } catch (error) {
    console.error(`Error fetching token data for ${tokenAddress}:`, error.message)
    return null
  }
}

// Evaluate if alert should be triggered
function evaluateAlert(alert, tokenData) {
  const triggers = []
  const metrics = alert.alert_metrics?.[0] || {}

  // Market Cap Alerts
  if (metrics.market_cap_enabled) {
    if (metrics.market_cap_high > 0 && tokenData.marketCap > metrics.market_cap_high) {
      triggers.push({
        type: 'market_cap_high',
        tokenSymbol: alert.token_symbol,
        currentValue: tokenData.marketCap,
        thresholdValue: metrics.market_cap_high,
        alert,
        message: `Market cap exceeded $${formatNumber(metrics.market_cap_high)}`
      })
    }
    
    if (metrics.market_cap_low > 0 && tokenData.marketCap < metrics.market_cap_low) {
      triggers.push({
        type: 'market_cap_low',
        tokenSymbol: alert.token_symbol,
        currentValue: tokenData.marketCap,
        thresholdValue: metrics.market_cap_low,
        alert,
        message: `Market cap dropped below $${formatNumber(metrics.market_cap_low)}`
      })
    }
  }

  // Price Change Alerts
  if (metrics.price_change_enabled && metrics.price_change_threshold > 0) {
    const threshold = metrics.price_change_threshold
    const direction = metrics.price_change_direction || 'both'
    const change = tokenData.change24h
    
    let shouldTrigger = false
    let directionText = ''
    
    if (direction === 'both' && Math.abs(change) >= threshold) {
      shouldTrigger = true
      directionText = change > 0 ? 'pumped' : 'dumped'
    } else if ((direction === 'pump' || direction === 'up') && change >= threshold) {
      shouldTrigger = true
      directionText = 'pumped'
    } else if ((direction === 'dump' || direction === 'down') && Math.abs(change) >= threshold && change < 0) {
      shouldTrigger = true
      directionText = 'dumped'
    }
    
    if (shouldTrigger) {
      triggers.push({
        type: 'price_change',
        tokenSymbol: alert.token_symbol,
        currentValue: tokenData.change24h,
        thresholdValue: metrics.price_change_threshold,
        alert,
        message: `Price ${directionText} by ${Math.abs(tokenData.change24h).toFixed(2)}%`
      })
    }
  }

  // Volume Alerts
  if (metrics.volume_enabled && metrics.volume_threshold > 0) {
    const comparison = metrics.volume_direction || metrics.volume_comparison || 'increase'
    const threshold = metrics.volume_threshold
    const currentVolume = tokenData.volume24h
    
    let shouldTrigger = false
    let comparisonText = ''
    
    if ((comparison === 'increase' || comparison === 'greater') && currentVolume > threshold) {
      shouldTrigger = true
      comparisonText = 'exceeded'
    } else if ((comparison === 'decrease' || comparison === 'less') && currentVolume < threshold) {
      shouldTrigger = true
      comparisonText = 'dropped below'
    }
    
    if (shouldTrigger) {
      triggers.push({
        type: 'volume',
        tokenSymbol: alert.token_symbol,
        currentValue: tokenData.volume24h,
        thresholdValue: metrics.volume_threshold,
        alert,
        message: `Volume ${comparisonText} $${formatNumber(threshold)}`
      })
    }
  }

  return triggers
}

// Send notification via API
async function sendNotification(trigger) {
  const { alert } = trigger
  const userPhone = alert.users?.phone_number

  console.log(chalk.magenta('📱 SENDING NOTIFICATION:'), {
    user: alert.user_id,
    token: trigger.tokenSymbol,
    type: trigger.type,
    message: trigger.message,
    channels: {
      push: alert.push_enabled,
      sms: alert.sms_enabled && userPhone,
      calls: alert.calls_enabled && userPhone
    }
  })

  try {
    // Call the notification API endpoint
    const notificationData = {
      userId: alert.user_id,
      alertId: alert.id,
      tokenSymbol: trigger.tokenSymbol,
      tokenName: alert.token_name || trigger.tokenSymbol,
      alertType: trigger.type,
      message: trigger.message,
      currentValue: trigger.currentValue,
      thresholdValue: trigger.thresholdValue,
      channels: {
        pushEnabled: alert.push_enabled || false,
        smsEnabled: alert.sms_enabled || false,
        callsEnabled: alert.calls_enabled || false
      },
      userPhone: userPhone
    }

    // Make HTTP request to notification API
    const response = await fetch('http://localhost:3000/api/alerts/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send_notification',
        notification: notificationData
      })
    })

    if (response.ok) {
      console.log(chalk.green('✅ Notification sent successfully'))
      return true
    } else {
      console.log(chalk.yellow('⚠️ Notification API returned error:', response.status))
      return false
    }
  } catch (error) {
    console.log(chalk.red('❌ Failed to send notification:', error.message))
    return false
  }
}

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function formatNumber(num) {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`
  }
  return num.toString()
}

// Display monitoring status
function displayStatus() {
  console.clear()
  
  console.log(chalk.cyan.bold('🚀 MEMEALERT BACKGROUND MONITOR'))
  console.log(chalk.gray('=' .repeat(50)))
  console.log()
  
  console.log(chalk.green('📊 MONITORING STATISTICS'))
  console.log(chalk.gray('-'.repeat(30)))
  console.log(`Cycles Run: ${chalk.white(monitoringStats.cyclesRun)}`)
  console.log(`Alerts Processed: ${chalk.white(monitoringStats.alertsProcessed)}`)
  console.log(`Notifications Sent: ${chalk.white(monitoringStats.notificationsSent)}`)
  console.log(`Errors: ${chalk.red(monitoringStats.errors)}`)
  console.log(`Last Run: ${chalk.white(monitoringStats.lastRun || 'Never')}`)
  console.log()
  
  console.log(chalk.blue('⚙️ CONFIGURATION'))
  console.log(chalk.gray('-'.repeat(30)))
  console.log(`Monitor Interval: ${chalk.white(MONITOR_INTERVAL / 1000)}s`)
  console.log(`API Delay: ${chalk.white(API_DELAY)}ms`)
  console.log(`Status: ${isMonitoring ? chalk.green('ACTIVE') : chalk.red('PAUSED')}`)
  console.log()
  
  console.log(chalk.gray('Press Ctrl+C to stop monitoring'))
}

// Main monitoring loop
async function startMonitoring() {
  console.log(chalk.green.bold('🚀 Starting Memealert Background Monitor...'))
  
  // Initial status display
  displayStatus()
  
  // Start monitoring loop
  const monitorTimer = setInterval(async () => {
    if (!isMonitoring) return
    
    try {
      const stats = await processAlerts()
      
      // Update global stats
      monitoringStats.cyclesRun++
      monitoringStats.alertsProcessed += stats.processed
      monitoringStats.notificationsSent += stats.sent
      monitoringStats.errors += stats.errors
      monitoringStats.lastRun = new Date().toLocaleTimeString()
      
      // Update display
      displayStatus()
      
    } catch (error) {
      monitoringStats.errors++
      console.error(chalk.red('❌ Error in monitoring cycle:'), error)
    }
  }, MONITOR_INTERVAL)
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n👋 Shutting down monitor...'))
    isMonitoring = false
    clearInterval(monitorTimer)
    
    console.log(chalk.green('📊 Final Statistics:'))
    console.log(`  Cycles: ${monitoringStats.cyclesRun}`)
    console.log(`  Alerts: ${monitoringStats.alertsProcessed}`)
    console.log(`  Notifications: ${monitoringStats.notificationsSent}`)
    console.log(`  Errors: ${monitoringStats.errors}`)
    
    process.exit(0)
  })
  
  // Run first cycle immediately
  setTimeout(async () => {
    const stats = await processAlerts()
    monitoringStats.cyclesRun++
    monitoringStats.alertsProcessed += stats.processed
    monitoringStats.notificationsSent += stats.sent
    monitoringStats.errors += stats.errors
    monitoringStats.lastRun = new Date().toLocaleTimeString()
    displayStatus()
  }, 2000)
}

// Start the monitor
startMonitoring()
