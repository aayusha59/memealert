import { createClient } from '@supabase/supabase-js'
import { sendMultiChannelAlert, AlertNotification } from './notificationService'
import { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

interface TokenData {
  address: string
  price: number
  change24h: number
  marketCap: number
  volume24h: number
}

interface AlertWithMetrics {
  id: string
  user_id: string
  token_address: string
  token_symbol: string
  token_name: string
  notifications_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  calls_enabled: boolean
  metrics: {
    market_cap_enabled: boolean
    price_change_enabled: boolean
    volume_enabled: boolean
    market_cap_high: number
    market_cap_low: number
    price_change_threshold: number
    price_change_direction?: string
    volume_threshold: number
    volume_period: string
    volume_comparison?: string
  }
  user_phone?: string
}

interface AlertTrigger {
  alertId: string
  userId: string
  tokenSymbol: string
  tokenName: string
  alertType: 'market_cap' | 'price_change' | 'volume'
  message: string
  currentValue: number
  thresholdValue?: number
  channels: {
    pushEnabled: boolean
    smsEnabled: boolean
    callsEnabled: boolean
  }
  userPhone?: string
}

// Alert throttling - prevent spam notifications
const alertCooldowns = new Map<string, number>()
const COOLDOWN_PERIOD = 15 * 60 * 1000 // 15 minutes

// Fetch live token data from DexScreener
async function fetchTokenData(tokenAddress: string): Promise<TokenData | null> {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)
    const data = await response.json()

    if (!data.pairs || data.pairs.length === 0) {
      console.log(`No pairs found for token: ${tokenAddress}`)
      return null
    }

    // Find the best pair (highest liquidity)
    const solanaPairs = data.pairs.filter((pair: any) => pair.chainId === 'solana')
    if (solanaPairs.length === 0) {
      console.log(`No Solana pairs found for token: ${tokenAddress}`)
      return null
    }

    const bestPair = solanaPairs.reduce((best: any, current: any) => {
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
    console.error(`Error fetching token data for ${tokenAddress}:`, error)
    return null
  }
}

// Get all active alerts with their metrics
async function getActiveAlerts(): Promise<AlertWithMetrics[]> {
  try {
    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('notifications_enabled', true)

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError)
      return []
    }

    if (!alerts || alerts.length === 0) {
      return []
    }

    // Get metrics for each alert
    const alertIds = alerts.map(alert => alert.id)
    const { data: metrics, error: metricsError } = await supabase
      .from('alert_metrics')
      .select('*')
      .in('alert_id', alertIds)

    if (metricsError) {
      console.error('Error fetching alert metrics:', metricsError)
      return []
    }

    // Get user phone numbers
    const userIds = alerts.map(alert => alert.user_id)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, phone_number')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching user data:', usersError)
    }

    const userPhones = new Map(users?.map(user => [user.id, user.phone_number]) || [])

    // Combine alerts with their metrics
    const alertsWithMetrics: AlertWithMetrics[] = alerts.map(alert => {
      const alertMetrics = metrics?.find(m => m.alert_id === alert.id)
      
      return {
        ...alert,
        metrics: alertMetrics ? {
          market_cap_enabled: alertMetrics.market_cap_enabled || false,
          price_change_enabled: alertMetrics.price_change_enabled || false,
          volume_enabled: alertMetrics.volume_enabled || false,
          market_cap_high: alertMetrics.market_cap_high || 0,
          market_cap_low: alertMetrics.market_cap_low || 0,
          price_change_threshold: alertMetrics.price_change_threshold || 0,
          price_change_direction: alertMetrics.price_change_direction || 'both',
          volume_threshold: alertMetrics.volume_threshold || 0,
          volume_period: alertMetrics.volume_period || '24h',
          volume_comparison: alertMetrics.volume_comparison || 'greater'
        } : {
          market_cap_enabled: false,
          price_change_enabled: false,
          volume_enabled: false,
          market_cap_high: 0,
          market_cap_low: 0,
          price_change_threshold: 0,
          price_change_direction: 'both',
          volume_threshold: 0,
          volume_period: '24h',
          volume_comparison: 'greater'
        },
        user_phone: userPhones.get(alert.user_id)
      }
    })

    return alertsWithMetrics
  } catch (error) {
    console.error('Error getting active alerts:', error)
    return []
  }
}

// Evaluate if an alert should be triggered
function evaluateAlert(alert: AlertWithMetrics, tokenData: TokenData): AlertTrigger[] {
  const triggers: AlertTrigger[] = []

  // Market Cap Alerts
  if (alert.metrics.market_cap_enabled) {
    const { market_cap_high, market_cap_low } = alert.metrics
    
    if (market_cap_high > 0 && tokenData.marketCap > market_cap_high) {
      triggers.push({
        alertId: alert.id,
        userId: alert.user_id,
        tokenSymbol: alert.token_symbol,
        tokenName: alert.token_name || alert.token_symbol,
        alertType: 'market_cap',
        message: `Market cap exceeded ${formatNumber(market_cap_high)}`,
        currentValue: tokenData.marketCap,
        thresholdValue: market_cap_high,
        channels: {
          pushEnabled: alert.push_enabled || false,
          smsEnabled: alert.sms_enabled || false,
          callsEnabled: alert.calls_enabled || false
        },
        userPhone: alert.user_phone
      })
    }
    
    if (market_cap_low > 0 && tokenData.marketCap < market_cap_low) {
      triggers.push({
        alertId: alert.id,
        userId: alert.user_id,
        tokenSymbol: alert.token_symbol,
        tokenName: alert.token_name || alert.token_symbol,
        alertType: 'market_cap',
        message: `Market cap dropped below ${formatNumber(market_cap_low)}`,
        currentValue: tokenData.marketCap,
        thresholdValue: market_cap_low,
        channels: {
          pushEnabled: alert.push_enabled || false,
          smsEnabled: alert.sms_enabled || false,
          callsEnabled: alert.calls_enabled || false
        },
        userPhone: alert.user_phone
      })
    }
  }

  // Price Change Alerts
  if (alert.metrics.price_change_enabled && alert.metrics.price_change_threshold > 0) {
    const threshold = alert.metrics.price_change_threshold
    const direction = alert.metrics.price_change_direction || 'both'
    const change = tokenData.change24h
    
    let shouldTrigger = false
    let directionText = ''
    
    if (direction === 'both' && Math.abs(change) >= threshold) {
      shouldTrigger = true
      directionText = change > 0 ? 'pumped' : 'dumped'
    } else if (direction === 'up' && change >= threshold) {
      shouldTrigger = true
      directionText = 'pumped'
    } else if (direction === 'down' && Math.abs(change) >= threshold && change < 0) {
      shouldTrigger = true
      directionText = 'dumped'
    }
    
    if (shouldTrigger) {
      triggers.push({
        alertId: alert.id,
        userId: alert.user_id,
        tokenSymbol: alert.token_symbol,
        tokenName: alert.token_name || alert.token_symbol,
        alertType: 'price_change',
        message: `Price ${directionText} by ${Math.abs(tokenData.change24h).toFixed(2)}%`,
        currentValue: tokenData.change24h,
        thresholdValue: threshold,
        channels: {
          pushEnabled: alert.push_enabled || false,
          smsEnabled: alert.sms_enabled || false,
          callsEnabled: alert.calls_enabled || false
        },
        userPhone: alert.user_phone
      })
    }
  }

  // Volume Alerts
  if (alert.metrics.volume_enabled && alert.metrics.volume_threshold > 0) {
    const comparison = alert.metrics.volume_comparison || 'greater'
    const threshold = alert.metrics.volume_threshold
    const currentVolume = tokenData.volume24h
    
    let shouldTrigger = false
    let comparisonText = ''
    
    if (comparison === 'greater' && currentVolume > threshold) {
      shouldTrigger = true
      comparisonText = 'exceeded'
    } else if (comparison === 'less' && currentVolume < threshold) {
      shouldTrigger = true
      comparisonText = 'dropped below'
    }
    
    if (shouldTrigger) {
      triggers.push({
        alertId: alert.id,
        userId: alert.user_id,
        tokenSymbol: alert.token_symbol,
        tokenName: alert.token_name || alert.token_symbol,
        alertType: 'volume',
        message: `Volume ${comparisonText} ${formatNumber(threshold)}`,
        currentValue: currentVolume,
        thresholdValue: threshold,
        channels: {
          pushEnabled: alert.push_enabled || false,
          smsEnabled: alert.sms_enabled || false,
          callsEnabled: alert.calls_enabled || false
        },
        userPhone: alert.user_phone
      })
    }
  }

  return triggers
}

// Check if alert is in cooldown period
function isInCooldown(alertId: string, alertType: string): boolean {
  const key = `${alertId}-${alertType}`
  const lastTriggered = alertCooldowns.get(key)
  
  if (!lastTriggered) {
    return false
  }
  
  return Date.now() - lastTriggered < COOLDOWN_PERIOD
}

// Set alert cooldown
function setCooldown(alertId: string, alertType: string): void {
  const key = `${alertId}-${alertType}`
  alertCooldowns.set(key, Date.now())
}

// Process all alerts and send notifications
export async function processAlerts(): Promise<{
  processed: number
  triggered: number
  sent: number
  errors: number
}> {
  console.log('🔍 Starting alert processing cycle...')
  
  const stats = {
    processed: 0,
    triggered: 0,
    sent: 0,
    errors: 0
  }

  try {
    const alerts = await getActiveAlerts()
    console.log(`📊 Found ${alerts.length} active alerts to process`)
    
    if (alerts.length === 0) {
      return stats
    }

    // Group alerts by token to minimize API calls
    const tokenGroups = new Map<string, AlertWithMetrics[]>()
    alerts.forEach(alert => {
      const existing = tokenGroups.get(alert.token_address) || []
      existing.push(alert)
      tokenGroups.set(alert.token_address, existing)
    })

    // Process each token group
    for (const [tokenAddress, tokenAlerts] of tokenGroups) {
      try {
        console.log(`🔍 Fetching data for token: ${tokenAddress}`)
        const tokenData = await fetchTokenData(tokenAddress)
        
        if (!tokenData) {
          console.log(`⚠️ No data available for token: ${tokenAddress}`)
          continue
        }

        // Evaluate each alert for this token
        for (const alert of tokenAlerts) {
          stats.processed++
          
          const triggers = evaluateAlert(alert, tokenData)
          
          for (const trigger of triggers) {
            // Check cooldown
            if (isInCooldown(trigger.alertId, trigger.alertType)) {
              console.log(`⏳ Alert ${trigger.alertId} (${trigger.alertType}) is in cooldown, skipping`)
              continue
            }

            stats.triggered++
            console.log(`🚨 Triggering alert: ${trigger.tokenSymbol} - ${trigger.alertType}`)

            try {
              // Send notification
              const results = await sendMultiChannelAlert({
                userId: trigger.userId,
                alertId: trigger.alertId,
                tokenSymbol: trigger.tokenSymbol,
                tokenName: trigger.tokenName,
                alertType: trigger.alertType,
                message: trigger.message,
                currentValue: trigger.currentValue,
                thresholdValue: trigger.thresholdValue,
                channels: trigger.channels,
                userPhone: trigger.userPhone
              })

              if (results.sms || results.voice || results.push) {
                stats.sent++
                setCooldown(trigger.alertId, trigger.alertType)
                console.log(`✅ Alert sent successfully: ${trigger.tokenSymbol}`)
                
                // Log notification to database
                await logNotification(trigger, results)
              }
            } catch (error) {
              stats.errors++
              console.error(`❌ Failed to send alert for ${trigger.tokenSymbol}:`, error)
            }
          }
        }

        // Add delay between token processing to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        stats.errors++
        console.error(`❌ Error processing token ${tokenAddress}:`, error)
      }
    }

    console.log(`✅ Alert processing complete:`, stats)
    return stats
    
  } catch (error) {
    console.error('❌ Fatal error in alert processing:', error)
    stats.errors++
    return stats
  }
}

// Log notification to database for tracking
async function logNotification(
  trigger: AlertTrigger, 
  results: { sms: boolean; voice: boolean; push: boolean }
): Promise<void> {
  try {
    const channels = []
    if (results.push) channels.push('push')
    if (results.sms) channels.push('sms')
    if (results.voice) channels.push('voice')

    // This would insert into a notifications log table
    // For now, just console log
    console.log('📝 Notification logged:', {
      alertId: trigger.alertId,
      userId: trigger.userId,
      tokenSymbol: trigger.tokenSymbol,
      alertType: trigger.alertType,
      channels: channels.join(', '),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Error logging notification:', error)
  }
}

// Format numbers for display
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`
  }
  return `$${num.toFixed(2)}`
}

// Start continuous monitoring
export function startAlertMonitoring(intervalMinutes: number = 1): NodeJS.Timeout {
  console.log(`🚀 Starting alert monitoring with ${intervalMinutes} minute interval`)
  
  // Run immediately
  processAlerts()
  
  // Then run on interval
  return setInterval(() => {
    processAlerts()
  }, intervalMinutes * 60 * 1000)
}
