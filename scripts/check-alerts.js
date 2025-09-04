#!/usr/bin/env node

/**
 * Check Alert Configuration Script
 * 
 * Shows current alert settings and thresholds
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config({ path: '../.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function formatNumber(num) {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(0)}K`
  }
  return `$${num}`
}

async function checkAlerts() {
  try {
    console.log('📊 CHECKING ALERT CONFIGURATION...\n')
    
    // Get all alerts with metrics
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        *,
        alert_metrics (*)
      `)
    
    if (error) {
      console.error('❌ Error fetching alerts:', error)
      return
    }
    
    console.log(`Found ${alerts.length} alerts:\n`)
    
    for (const alert of alerts) {
      console.log(`🎯 ${alert.token_symbol} (${alert.token_name})`)
      console.log(`   Contract: ${alert.token_address}`)
      console.log(`   Status: ${alert.notifications_enabled ? '✅ ENABLED' : '❌ DISABLED'}`)
      console.log(`   Channels: Push=${alert.push_enabled}, SMS=${alert.sms_enabled}, Calls=${alert.calls_enabled}`)
      
      // Current market data
      console.log(`   Current Market Cap: ${formatNumber(alert.market_cap || 0)}`)
      console.log(`   Current 24h Change: ${(alert.change_24h || 0).toFixed(2)}%`)
      console.log(`   Current Volume: ${formatNumber(alert.volume_24h || 0)}`)
      
      // Alert metrics
      const metrics = alert.alert_metrics?.[0]
      if (metrics) {
        console.log(`   📈 ALERT THRESHOLDS:`)
        
        if (metrics.market_cap_enabled) {
          console.log(`      Market Cap High: ${formatNumber(metrics.market_cap_high)} (${alert.market_cap > metrics.market_cap_high ? '🚨 TRIGGERED' : '⏳ Waiting'})`)
          console.log(`      Market Cap Low: ${formatNumber(metrics.market_cap_low)} (${alert.market_cap < metrics.market_cap_low ? '🚨 TRIGGERED' : '⏳ Waiting'})`)
        }
        
        if (metrics.price_change_enabled) {
          const direction = metrics.price_change_direction || 'both'
          console.log(`      Price Change: ±${metrics.price_change_threshold}% (${direction}) (${Math.abs(alert.change_24h || 0) >= metrics.price_change_threshold ? '🚨 TRIGGERED' : '⏳ Waiting'})`)
        }
        
        if (metrics.volume_enabled) {
          const comparison = metrics.volume_direction || 'increase'
          console.log(`      Volume: ${formatNumber(metrics.volume_threshold)} (${comparison}) (${
            (comparison === 'increase' && alert.volume_24h > metrics.volume_threshold) ||
            (comparison === 'decrease' && alert.volume_24h < metrics.volume_threshold) ? '🚨 TRIGGERED' : '⏳ Waiting'
          })`)
        }
      } else {
        console.log(`   ⚠️ No alert metrics configured`)
      }
      
      console.log('') // Empty line
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAlerts()
