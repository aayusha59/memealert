import { NextRequest, NextResponse } from 'next/server'
import { sendMultiChannelAlert } from '@/services/notificationService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, tokenSymbol, tokenName, alertId, alertType, channels, userPhone } = body

    if (!userId || !tokenSymbol || !alertType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, tokenSymbol, alertType' },
        { status: 400 }
      )
    }
    
    const displayName = tokenName || tokenSymbol

    // Send test notification
    const results = await sendMultiChannelAlert({
      userId,
      alertId: alertId || 'test-alert',
      tokenSymbol,
      tokenName: displayName,
      alertType,
      message: `Test ${alertType.replace('_', ' ')} alert for ${displayName}`,
      currentValue: alertType === 'market_cap' ? 1000000 : alertType === 'price_change' ? 25.5 : 500000,
      thresholdValue: alertType === 'market_cap' ? 800000 : alertType === 'price_change' ? 20 : 400000,
      channels: {
        pushEnabled: channels?.push || false,
        smsEnabled: channels?.sms || false,
        callsEnabled: channels?.calls || false
      },
      userPhone
    })

    return NextResponse.json({
      success: true,
      results,
      message: 'Test notification sent successfully'
    })

  } catch (error) {
    console.error('❌ Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
