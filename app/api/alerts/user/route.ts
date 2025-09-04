import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

    console.log('🔍 Fetching alerts for userId:', userId)

    const supabase = createClient()

    // First, let's check all alerts for this user (including disabled ones for debugging)
    const { data: allAlerts, error: allError } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)

    console.log('📊 All alerts for user:', allAlerts?.length || 0, allAlerts)

    // Fetch user's active alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('id, token_symbol, token_name, token_address, notifications_enabled, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching user alerts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user alerts', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Filtered alerts:', alerts?.length || 0, alerts)

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      debug: {
        totalAlerts: allAlerts?.length || 0,
        activeAlerts: alerts?.length || 0,
        userId
      }
    })

  } catch (error) {
    console.error('Error in user alerts API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
