import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

console.log('🔗 Supabase config:', { 
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET',
  hasKey: !!supabaseAnonKey 
})

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Test the connection
supabase.from('users').select('count').limit(1).then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase connection test failed:', error)
  } else {
    console.log('✅ Supabase connection test successful')
  }
})

// Helper function to create a user record when a wallet connects
export async function createUserIfNotExists(walletAddress: string) {
  console.log('🔍 Creating/getting user for wallet:', walletAddress)
  
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single()

  if (error && error.code !== 'PGSQL_ERROR_UNIQUE_VIOLATION') {
    console.log('👤 User not found, creating new user...')
    // If user doesn't exist, create one
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ wallet_address: walletAddress }])
      .select('id')
      .single()

    if (createError) {
      console.error('❌ Error creating user:', createError)
      throw createError
    }

    console.log('✅ New user created:', newUser)
    return newUser
  }

  console.log('✅ Existing user found:', data)
  return data
}

// Helper function to get user by wallet address
export async function getUserByWalletAddress(walletAddress: string) {
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

// Helper function to save alerts for a user
export async function saveUserAlerts(userId: string, alerts: any[]) {
  console.log('💾 saveUserAlerts called with:', { userId, alertsCount: alerts.length })
  
  if (alerts.length === 0) {
    console.log('ℹ️ No alerts to save')
    return []
  }
  
  try {
    // Check for existing alerts to prevent duplicates
    const { data: existingAlerts, error: fetchError } = await supabase
      .from('alerts')
      .select('token_address')
      .eq('user_id', userId)
    
    if (fetchError) {
      console.error('❌ Error fetching existing alerts:', fetchError)
      throw fetchError
    }
    
    const existingTokenAddresses = new Set(existingAlerts?.map(a => a.token_address) || [])
    
    // Filter out alerts that already exist
    const newAlerts = alerts.filter(alert => !existingTokenAddresses.has(alert.contractAddress))
    
    if (newAlerts.length === 0) {
      console.log('ℹ️ All alerts already exist, nothing to save')
      return []
    }
    
    console.log('📝 Filtered to new alerts:', newAlerts.length, 'out of', alerts.length)
    
    const alertsWithUserId = newAlerts.map(alert => ({
      user_id: userId,
      token_address: alert.contractAddress,
      token_symbol: alert.ticker,
      token_name: alert.tokenName,
      status: alert.status,
      market_cap: alert.marketCap,
      change_24h: alert.change24h,
      volume_24h: alert.volume24h,
      price: alert.price,
      notifications_enabled: alert.notificationsEnabled,
      push_enabled: alert.notificationChannels?.pushEnabled ?? true,
      sms_enabled: alert.notificationChannels?.smsEnabled ?? false,
      calls_enabled: alert.notificationChannels?.callsEnabled ?? false
    }))

    console.log('📝 Inserting new alerts:', alertsWithUserId)

    // Insert new alerts
    const { data, error } = await supabase
      .from('alerts')
      .insert(alertsWithUserId)
      .select('*')

    if (error) {
      console.error('❌ Error inserting alerts:', error)
      throw error
    }

    console.log('✅ Alerts inserted successfully:', data)

    // Handle alert metrics
    if (data && data.length > 0) {
      // Insert new metrics
      for (let i = 0; i < data.length; i++) {
        const alertId = data[i].id
        const metrics = newAlerts[i].metrics

        if (metrics) {
          console.log('📊 Saving metrics for alert:', alertId, metrics)

          await supabase
            .from('alert_metrics')
            .insert({
              alert_id: alertId,
              market_cap_enabled: metrics.marketCapEnabled,
              price_change_enabled: metrics.priceChangeEnabled,
              volume_enabled: metrics.volumeEnabled,
              market_cap_high: metrics.marketCapHigh,
              market_cap_low: metrics.marketCapLow,
              price_change_threshold: metrics.priceChangeThreshold,
              volume_threshold: metrics.volumeThreshold,
              volume_period: metrics.volumePeriod
            })
        }
      }
    }

    // Return the saved alerts with their database IDs
    return await getUserAlerts(userId)
  } catch (error) {
    console.error('❌ Error in saveUserAlerts:', error)
    throw error
  }
}

// Helper function to get all alerts for a user
export async function getUserAlerts(userId: string) {
  const { data: alertsData, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)

  if (alertsError) {
    console.error('Error fetching alerts:', alertsError)
    return []
  }

  // Get metrics for each alert
  const alerts = []
  for (const alert of alertsData) {
    const { data: metricsData, error: metricsError } = await supabase
      .from('alert_metrics')
      .select('*')
      .eq('alert_id', alert.id)
      .single()

    if (metricsError && metricsError.code !== 'PGSQL_ERROR_NO_ROWS') {
      console.error('Error fetching alert metrics:', metricsError)
    }

    alerts.push({
      id: alert.id,
      ticker: alert.token_symbol,
      contractAddress: alert.token_address,
      tokenName: alert.token_name,
      status: alert.status,
      marketCap: alert.market_cap,
      change24h: alert.change_24h,
      volume24h: alert.volume_24h,
      price: alert.price,
      notificationsEnabled: alert.notifications_enabled,
      notificationChannels: {
        pushEnabled: alert.push_enabled ?? true,
        smsEnabled: alert.sms_enabled ?? false,
        callsEnabled: alert.calls_enabled ?? false
      },
      metrics: metricsData ? {
        marketCapEnabled: metricsData.market_cap_enabled || false,
        priceChangeEnabled: metricsData.price_change_enabled || false,
        volumeEnabled: metricsData.volume_enabled || false,
        marketCapHigh: metricsData.market_cap_high || 1000000,
        marketCapLow: metricsData.market_cap_low || 500000,
        priceChangeThreshold: metricsData.price_change_threshold || 20,
        volumeThreshold: metricsData.volume_threshold || 100000,
        volumePeriod: metricsData.volume_period || "24h"
      } : {
        marketCapEnabled: false,
        priceChangeEnabled: false,
        volumeEnabled: false,
        marketCapHigh: 1000000,
        marketCapLow: 500000,
        priceChangeThreshold: 20,
        volumeThreshold: 100000,
        volumePeriod: "24h"
      }
    })
  }

  return alerts
}



// Helper function to save notification settings
export async function saveNotificationSettings(userId: string, settings: any) {
  console.log('🔔 saveNotificationSettings called with:', { userId, settings })
  
  try {
    // First, clean up any existing duplicates for this user
    await cleanupDuplicateNotificationSettings(userId)
    
    // Check if notification settings already exist for this user
    const { data: existingSettings, error: selectError } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing notification settings:', selectError)
      throw selectError
    }

    if (existingSettings) {
      // Update existing settings
      const { data, error: updateError } = await supabase
        .from('notification_settings')
        .update({
          push_enabled: settings.pushEnabled,
          sms_enabled: settings.smsEnabled,
          calls_enabled: settings.callsEnabled
        })
        .eq('user_id', userId)
        .select('*')
        .single()

      if (updateError) {
        console.error('❌ Error updating existing notification settings:', updateError)
        throw updateError
      }

      console.log('✅ Existing notification settings updated successfully for user:', userId)
      return data
    } else {
      // Insert new settings
      const { data, error: insertError } = await supabase
        .from('notification_settings')
        .insert({
          user_id: userId,
          push_enabled: settings.pushEnabled,
          sms_enabled: settings.smsEnabled,
          calls_enabled: settings.callsEnabled
        })
        .select('*')
        .single()

      if (insertError) {
        console.error('❌ Error inserting new notification settings:', insertError)
        throw insertError
      }

      console.log('✅ New notification settings inserted successfully for user:', userId)
      return data
    }
  } catch (error) {
    console.error('❌ Error in saveNotificationSettings:', error)
    throw error
  }
}

// Helper function to get notification settings
export async function getNotificationSettings(userId: string) {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGSQL_ERROR_NO_ROWS') {
    console.error('Error fetching notification settings:', error)
    return {
      pushEnabled: true,
      smsEnabled: false,
      callsEnabled: false
    }
  }

  return data ? {
    pushEnabled: data.push_enabled,
    smsEnabled: data.sms_enabled,
    callsEnabled: data.calls_enabled
  } : {
    pushEnabled: true,
    smsEnabled: false,
    callsEnabled: false
  }
}

// Helper function to delete an alert and all related data
export async function deleteUserAlert(userId: string, alertId: string) {
  console.log('🗑️ deleteUserAlert called with:', { userId, alertId })
  
  try {
    // Delete in reverse order due to foreign key constraints
    
    // 1. Delete notification history records
    const { error: historyError } = await supabase
      .from('notification_history')
      .delete()
      .eq('alert_id', alertId)
      .eq('user_id', userId)
    
    if (historyError) {
      console.error('❌ Error deleting notification history:', historyError)
      throw historyError
    }
    
    console.log('✅ Notification history deleted for alert:', alertId)
    
    // 2. Delete alert metrics
    const { error: metricsError } = await supabase
      .from('alert_metrics')
      .delete()
      .eq('alert_id', alertId)
    
    if (metricsError) {
      console.error('❌ Error deleting alert metrics:', metricsError)
      throw metricsError
    }
    
    console.log('✅ Alert metrics deleted for alert:', alertId)
    
    // 3. Delete the main alert record
    const { error: alertError } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userId)
    
    if (alertError) {
      console.error('❌ Error deleting alert:', alertError)
      throw alertError
    }
    
    console.log('✅ Alert deleted successfully:', alertId)
    
    return true
  } catch (error) {
    console.error('❌ Error in deleteUserAlert:', error)
    throw error
  }
}

// Helper function to update alert metrics
export async function updateAlertMetrics(alertId: string, metrics: any) {
  console.log('📊 updateAlertMetrics called with:', { alertId, metrics })
  
  try {
    // First, clean up any existing duplicates for this alert
    await cleanupDuplicateAlertMetrics(alertId)
    
    // Check if metrics already exist for this alert
    const { data: existingMetrics, error: selectError } = await supabase
      .from('alert_metrics')
      .select('id')
      .eq('alert_id', alertId)
      .single()

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking existing metrics:', selectError)
      throw selectError
    }

    if (existingMetrics) {
      // Update existing metrics
      const { error: updateError } = await supabase
        .from('alert_metrics')
        .update({
          market_cap_enabled: metrics.marketCapEnabled,
          price_change_enabled: metrics.priceChangeEnabled,
          volume_enabled: metrics.volumeEnabled,
          market_cap_high: metrics.marketCapHigh,
          market_cap_low: metrics.marketCapLow,
          price_change_threshold: metrics.priceChangeThreshold,
          volume_threshold: metrics.volumeThreshold,
          volume_period: metrics.volumePeriod
        })
        .eq('alert_id', alertId)

      if (updateError) {
        console.error('❌ Error updating existing alert metrics:', updateError)
        throw updateError
      }

      console.log('✅ Existing alert metrics updated successfully for alert:', alertId)
    } else {
      // Insert new metrics
      const { error: insertError } = await supabase
        .from('alert_metrics')
        .insert({
          alert_id: alertId,
          market_cap_enabled: metrics.marketCapEnabled,
          price_change_enabled: metrics.priceChangeEnabled,
          volume_enabled: metrics.volumeEnabled,
          market_cap_high: metrics.marketCapHigh,
          market_cap_low: metrics.marketCapLow,
          price_change_threshold: metrics.priceChangeThreshold,
          volume_threshold: metrics.volumeThreshold,
          volume_period: metrics.volumePeriod
        })

      if (insertError) {
        console.error('❌ Error inserting new alert metrics:', insertError)
        throw insertError
      }

      console.log('✅ New alert metrics inserted successfully for alert:', alertId)
    }

    return true
  } catch (error) {
    console.error('❌ Error in updateAlertMetrics:', error)
    throw error
  }
}

// Helper function to clean up duplicate alert metrics for a specific alert
export async function cleanupDuplicateAlertMetrics(alertId: string) {
  console.log('🧹 Cleaning up duplicate alert metrics for alert:', alertId)
  
  try {
    // Get all metrics for this alert
    const { data: allMetrics, error: selectError } = await supabase
      .from('alert_metrics')
      .select('id')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: true })

    if (selectError) {
      console.error('❌ Error selecting metrics for cleanup:', selectError)
      throw selectError
    }

    // If there's more than one metric, delete all but the first (oldest)
    if (allMetrics && allMetrics.length > 1) {
      const metricsToDelete = allMetrics.slice(1) // Keep first, delete the rest
      const idsToDelete = metricsToDelete.map(m => m.id)
      
      const { error: deleteError } = await supabase
        .from('alert_metrics')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error('❌ Error deleting duplicate metrics:', deleteError)
        throw deleteError
      }

      console.log('✅ Deleted', metricsToDelete.length, 'duplicate metrics for alert:', alertId)
    } else {
      console.log('ℹ️ No duplicates found for alert:', alertId)
    }

    return true
  } catch (error) {
    console.error('❌ Error in cleanupDuplicateAlertMetrics:', error)
    throw error
  }
}

// Helper function to clean up duplicate notification settings for a specific user
export async function cleanupDuplicateNotificationSettings(userId: string) {
  console.log('🧹 Cleaning up duplicate notification settings for user:', userId)
  
  try {
    // Get all notification settings for this user
    const { data: allSettings, error: selectError } = await supabase
      .from('notification_settings')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (selectError) {
      console.error('❌ Error selecting notification settings for cleanup:', selectError)
      throw selectError
    }

    // If there's more than one setting, delete all but the first (oldest)
    if (allSettings && allSettings.length > 1) {
      const settingsToDelete = allSettings.slice(1) // Keep first, delete the rest
      const idsToDelete = settingsToDelete.map(s => s.id)
      
      const { error: deleteError } = await supabase
        .from('notification_settings')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error('❌ Error deleting duplicate notification settings:', deleteError)
        throw deleteError
      }

      console.log('✅ Deleted', settingsToDelete.length, 'duplicate notification settings for user:', userId)
    } else {
      console.log('ℹ️ No duplicates found for user:', userId)
    }

    return true
  } catch (error) {
    console.error('❌ Error in cleanupDuplicateNotificationSettings:', error)
    throw error
  }
}



// Helper function to update alert notification status
export async function updateAlertNotificationStatus(alertId: string, notificationsEnabled: boolean) {
  console.log('🔔 updateAlertNotificationStatus called with:', { alertId, notificationsEnabled })
  
  try {
    const { error } = await supabase
      .from('alerts')
      .update({ notifications_enabled: notificationsEnabled })
      .eq('id', alertId)
    
    if (error) {
      console.error('❌ Error updating alert notification status:', error)
      throw error
    }

    console.log('✅ Alert notification status updated successfully:', alertId, notificationsEnabled)
    return true
  } catch (error) {
    console.error('❌ Error in updateAlertNotificationStatus:', error)
    throw error
  }
}

// Helper function to update user's phone number after verification
export async function updateUserPhoneNumber(userId: string, phoneNumber: string) {
  console.log('📱 updateUserPhoneNumber called with:', { userId, phoneNumber })
  
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        phone_number: phoneNumber,
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('❌ Error updating user phone number:', error)
      throw error
    }

    console.log('✅ User phone number updated successfully:', userId, phoneNumber)
    return true
  } catch (error) {
    console.error('❌ Error in updateUserPhoneNumber:', error)
    throw error
  }
}

// Helper function to get user's phone verification status
export async function getUserPhoneStatus(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('phone_number, phone_verified, phone_verified_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user phone status:', error)
    return null
  }

  return {
    phoneNumber: data.phone_number,
    phoneVerified: data.phone_verified,
    phoneVerifiedAt: data.phone_verified_at
  }
}

// Helper function to update alert notification channels
export async function updateAlertNotificationChannels(alertId: string, channels: {
  pushEnabled: boolean
  smsEnabled: boolean
  callsEnabled: boolean
}) {
  console.log('🔔 updateAlertNotificationChannels called with:', { alertId, channels })
  
  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({
        push_enabled: channels.pushEnabled,
        sms_enabled: channels.smsEnabled,
        calls_enabled: channels.callsEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select('*')
      .single()

    if (error) {
      console.error('❌ Error updating alert notification channels:', error)
      throw error
    }

    console.log('✅ Alert notification channels updated successfully:', data)
    return data
  } catch (error) {
    console.error('❌ Error in updateAlertNotificationChannels:', error)
    throw error
  }
}
