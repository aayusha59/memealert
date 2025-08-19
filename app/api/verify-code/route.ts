import { NextRequest, NextResponse } from 'next/server'
import { verifyCode } from '@/services/twilioService'
import { getUserByWalletAddress, updateUserPhoneNumber } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, verificationCode } = await request.json()

    // Validate input
    if (!walletAddress || !verificationCode) {
      return NextResponse.json(
        { error: 'Wallet address and verification code are required' },
        { status: 400 }
      )
    }

    // Validate verification code format (6 digits)
    if (!/^\d{6}$/.test(verificationCode)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 digits' },
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

    // Verify the code
    const verificationResult = verifyCode(user.id, verificationCode)
    
    if (!verificationResult.isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    if (!verificationResult.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number not found for verification' },
        { status: 400 }
      )
    }

    // Update user's phone number in database
    await updateUserPhoneNumber(user.id, verificationResult.phoneNumber)

    console.log('✅ Phone verification successful for user:', user.id, 'phone:', verificationResult.phoneNumber)

    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      phoneNumber: verificationResult.phoneNumber
    })

  } catch (error) {
    console.error('❌ Error verifying code:', error)
    
    return NextResponse.json(
      { error: 'Failed to verify code. Please try again.' },
      { status: 500 }
    )
  }
}
