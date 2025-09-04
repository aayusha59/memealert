import { sendSMSAlert as sendSMS, makeVoiceCall } from './twilioService'

export interface AlertNotification {
  userId: string
  alertId: string
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

// SMS notification service
export async function sendSMSAlert(notification: AlertNotification): Promise<boolean> {
  if (!notification.channels.smsEnabled || !notification.userPhone) {
    console.log('📱 SMS not enabled or no phone number for user:', notification.userId)
    return false
  }

  try {
    const message = formatAlertMessage(notification)
    await sendSMS(notification.userPhone, message)
    console.log('✅ SMS alert sent successfully to:', notification.userPhone)
    return true
  } catch (error) {
    console.error('❌ Failed to send SMS alert:', error)
    return false
  }
}

// Voice call notification service
export async function sendVoiceCallAlert(notification: AlertNotification): Promise<boolean> {
  if (!notification.channels.callsEnabled || !notification.userPhone) {
    console.log('📞 Voice calls not enabled or no phone number for user:', notification.userId)
    return false
  }

  try {
    const voiceMessage = formatVoiceMessage(notification)
    
    await makeVoiceCall(notification.userPhone, voiceMessage)
    console.log('✅ Voice call initiated successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to initiate voice call:', error)
    return false
  }
}

// PWA Push notification service
export async function sendPushNotification(notification: AlertNotification): Promise<boolean> {
  if (!notification.channels.pushEnabled) {
    console.log('🔔 Push notifications not enabled for user:', notification.userId)
    return false
  }

  // This would integrate with a push notification service like Firebase FCM
  // For now, we'll use the browser's Notification API through a service worker
  try {
    const message = formatAlertMessage(notification)
    
    // In a real implementation, you'd send this to all registered devices for the user
    // through a push service like Firebase Cloud Messaging
    console.log('🔔 Push notification queued:', {
      userId: notification.userId,
      title: `${notification.tokenSymbol} Alert`,
      body: message,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `alert-${notification.alertId}`,
      data: {
        alertId: notification.alertId,
        tokenSymbol: notification.tokenSymbol,
        alertType: notification.alertType
      }
    })

    return true
  } catch (error) {
    console.error('❌ Failed to send push notification:', error)
    return false
  }
}

// Format alert message for SMS/Push
function formatAlertMessage(notification: AlertNotification): string {
  const { tokenSymbol, alertType, currentValue, thresholdValue } = notification

  switch (alertType) {
    case 'market_cap':
      const direction = currentValue > (thresholdValue || 0) ? 'above' : 'below'
      return `🚨 ${tokenSymbol} Market Cap Alert: $${formatNumber(currentValue)} (${direction} $${formatNumber(thresholdValue || 0)})`
    
    case 'price_change':
      const changeDirection = currentValue >= 0 ? 'up' : 'down'
      return `📈 ${tokenSymbol} Price Alert: ${currentValue >= 0 ? '+' : ''}${currentValue.toFixed(2)}% change (${changeDirection} ${Math.abs(thresholdValue || 0)}%)`
    
    case 'volume':
      return `📊 ${tokenSymbol} Volume Alert: $${formatNumber(currentValue)} in 24h (above $${formatNumber(thresholdValue || 0)})`
    
    default:
      return `🔔 ${tokenSymbol}: ${notification.message}`
  }
}

// Format voice message (shorter and clearer for speech)
function formatVoiceMessage(notification: AlertNotification): string {
  const { tokenSymbol, alertType, currentValue, thresholdValue } = notification

  switch (alertType) {
    case 'market_cap':
      const direction = currentValue > (thresholdValue || 0) ? 'above' : 'below'
      return `Alert for ${tokenSymbol}. Market cap is now ${formatNumberForSpeech(currentValue)}, which is ${direction} your threshold of ${formatNumberForSpeech(thresholdValue || 0)}.`
    
    case 'price_change':
      const changeDirection = currentValue >= 0 ? 'increased' : 'decreased'
      return `Alert for ${tokenSymbol}. Price has ${changeDirection} by ${Math.abs(currentValue).toFixed(1)} percent in the last 24 hours.`
    
    case 'volume':
      return `Alert for ${tokenSymbol}. Trading volume has reached ${formatNumberForSpeech(currentValue)} in the last 24 hours.`
    
    default:
      return `You have an alert for ${tokenSymbol}. Please check your Memealert dashboard for details.`
  }
}

// Format numbers for display
function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`
  }
  return num.toString()
}

// Format numbers for speech (more natural)
function formatNumberForSpeech(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)} billion dollars`
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)} million dollars`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(0)} thousand dollars`
  }
  return `${num} dollars`
}

// Send notification through all enabled channels
export async function sendMultiChannelAlert(notification: AlertNotification): Promise<{
  sms: boolean
  voice: boolean
  push: boolean
}> {
  console.log('🚨 Sending multi-channel alert for:', notification.tokenSymbol)
  
  const results = await Promise.allSettled([
    sendSMSAlert(notification),
    sendVoiceCallAlert(notification),
    sendPushNotification(notification)
  ])

  return {
    sms: results[0].status === 'fulfilled' ? results[0].value : false,
    voice: results[1].status === 'fulfilled' ? results[1].value : false,
    push: results[2].status === 'fulfilled' ? results[2].value : false
  }
}
