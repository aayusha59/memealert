import { type NextRequest, NextResponse } from "next/server"
import { savePhoneVerification } from "@/lib/supabase"
import { verifyCode } from "@/services/twilioService"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code, userId } = await request.json()
    
    console.log('📡 /api/verify-code received:', { phoneNumber, userId, code: '******' })

    if (!userId) {
      console.log('❌ Missing userId in request')
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (!phoneNumber) {
      console.log('❌ Missing phoneNumber in request')
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }
    
    // Sanitize phone number and ensure it is in E.164 format
    const sanitizedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '')
    if (!/^\+[1-9]\d{1,14}$/.test(sanitizedPhoneNumber)) {
      console.error('❌ Phone number is not in valid E.164 format:', phoneNumber)
      return NextResponse.json({
        error: "Invalid phone number format. Phone number must be digits only and start with a + sign."
      }, { status: 400 })
    }

    if (!code) {
      console.log('❌ Missing verification code in request')
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 })
    }

    console.log('✅ Input validation passed, calling Twilio service to verify code')
    
    // Verify the code using Twilio service
    const verificationCheck = await verifyCode(sanitizedPhoneNumber, code)
    console.log('📊 Verification check response:', {
      status: verificationCheck.status,
      valid: verificationCheck.valid,
      sid: verificationCheck.sid,
      to: verificationCheck.to
    })

    const isApproved = verificationCheck.status === "approved"

    if (isApproved) {
      console.log('✅ Code verified successfully, updating phone verification status in database')
      // Update phone verification status in Supabase
      await savePhoneVerification(userId, sanitizedPhoneNumber, true)
      console.log('✅ Phone verification successful for user:', userId)
    } else {
      console.log('❌ Phone verification failed for user:', userId, 'Status:', verificationCheck.status)
    }

    console.log('📤 Sending response to client:', { success: isApproved, status: verificationCheck.status })
    return NextResponse.json({
      success: isApproved,
      status: verificationCheck.status,
    })
  } catch (error) {
    console.error("❌ Twilio verification check error:", error)
    
    // Check if it's a Twilio error
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as any
      console.error('🔍 Twilio error details:', {
        code: twilioError.code,
        message: twilioError.message,
        moreInfo: twilioError.moreInfo
      })
      
      // Handle specific Twilio error codes
      if (twilioError.code === 20404) {
        return NextResponse.json({ 
          error: "Invalid verification code or the code has expired" 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 })
  }
}