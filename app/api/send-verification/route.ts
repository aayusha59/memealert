import { NextRequest, NextResponse } from 'next/server'
import { sendVerificationCode, generateVerificationCode, storeVerificationCode } from '@/services/twilioService'
import { getUserByWalletAddress } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, phoneNumber } = await request.json()

    // Validate input
    if (!walletAddress || !phoneNumber) {
      return NextResponse.json(
        { error: 'Wallet address and phone number are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    // Get user by wallet address
    const user = await getUserByWalletAddress(walletAddress)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate verification code
    const verificationCode = generateVerificationCode()

    // Store verification code
    storeVerificationCode(user.id, phoneNumber, verificationCode)

    // Send SMS
    await sendVerificationCode(phoneNumber, verificationCode)

    console.log('✅ Verification code sent to:', phoneNumber, 'for user:', user.id)

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully'
    })

  } catch (error) {
    console.error('❌ Error sending verification code:', error)
    
    // Handle Twilio-specific errors
    if (error instanceof Error) {
      if (error.message.includes('SMS service not configured')) {
        return NextResponse.json(
          { error: 'SMS service is not configured. Please contact support.' },
          { status: 503 }
        )
      }
      
      if (error.message.includes('phone number')) {
        return NextResponse.json(
          { error: 'Invalid phone number. Please check the format and try again.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to send verification code. Please try again.' },
      { status: 500 }
    )
  }
}
