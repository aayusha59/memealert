#!/usr/bin/env node

/**
 * Fix Notification Channels Script
 * 
 * Enables notification channels for all user alerts
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

async function fixNotificationChannels() {
  try {
    console.log('🔧 Fixing notification channels for all alerts...')
    
    // Get all alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
    
    if (error) {
      console.error('❌ Error fetching alerts:', error)
      return
    }
    
    console.log(`📊 Found ${alerts.length} alerts`)
    
    for (const alert of alerts) {
      console.log(`🔧 Fixing alert: ${alert.token_symbol} (${alert.id})`)
      console.log(`   Current channels: Push=${alert.push_enabled}, SMS=${alert.sms_enabled}, Calls=${alert.calls_enabled}`)
      
      // Enable all notification channels
      const { error: updateError } = await supabase
        .from('alerts')
        .update({
          push_enabled: true,
          sms_enabled: true,
          calls_enabled: true,
          notifications_enabled: true
        })
        .eq('id', alert.id)
      
      if (updateError) {
        console.error(`❌ Error updating alert ${alert.token_symbol}:`, updateError)
      } else {
        console.log(`✅ Fixed alert: ${alert.token_symbol}`)
      }
    }
    
    console.log('🎉 All alerts have been updated with enabled notification channels!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixNotificationChannels()
