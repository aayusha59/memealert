import { NextRequest, NextResponse } from 'next/server'
import { processAlerts } from '@/services/alertEngine'
import { sendMultiChannelAlert, AlertNotification } from '@/services/notificationService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle notification sending action
    if (body.action === 'send_notification' && body.notification) {
      console.log('📱 Sending notification via API:', body.notification)
      
      const notification: AlertNotification = body.notification
      const success = await sendMultiChannelAlert(notification)
      
      return NextResponse.json({
        success,
        message: success ? 'Notification sent successfully' : 'Failed to send notification'
      })
    }
    
    // Default: process alerts
    console.log('🔄 Manual alert processing triggered via API')
    
    const stats = await processAlerts()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Alert processing completed successfully'
    })

  } catch (error) {
    console.error('❌ Error processing request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Allow GET requests for health checks
export async function GET() {
  return NextResponse.json({
    status: 'Alert processing endpoint is active',
    timestamp: new Date().toISOString()
  })
}
