import { type NextRequest, NextResponse } from "next/server"
import { savePhoneVerification } from "@/lib/supabase"
import { sendVerificationCode } from "@/services/twilioService"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, userId } = await request.json()
    
    console.log('📡 /api/send-verification received:', { phoneNumber, userId })

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }
    
    // Ensure the phone number is in E.164 format (starts with +)
    // Sanitize phone number and ensure it is in E.164 format
    const sanitizedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '')
    if (!/^\+[1-9]\d{1,14}$/.test(sanitizedPhoneNumber)) {
      console.error('❌ Phone number is not in valid E.164 format:', phoneNumber)
      return NextResponse.json({
        error: "Invalid phone number format. Phone number must be digits only and start with a + sign."
      }, { status: 400 })
    }

    console.log('🔑 Twilio environment check:', {
      accountSid: !!process.env.TWILIO_ACCOUNT_SID,
      authToken: !!process.env.TWILIO_AUTH_TOKEN,
      verifyServiceSid: !!process.env.TWILIO_VERIFY_SERVICE_SID
    })

    // Generate a verification code using Twilio service
    const verification = await sendVerificationCode(sanitizedPhoneNumber)

    // Save the verification attempt to Supabase
    await savePhoneVerification(userId, sanitizedPhoneNumber)

    console.log('✅ Twilio verification created successfully:', verification.status)
    return NextResponse.json({ success: true, status: verification.status })
  } catch (error) {
    console.error("❌ Twilio verification error:", error)
    
    // Check if it's a Twilio error
    if (error && typeof error === 'object' && 'code' in error) {
      const twilioError = error as any
      console.error('🔍 Twilio error details:', {
        code: twilioError.code,
        message: twilioError.message,
        moreInfo: twilioError.moreInfo
      })
      
      if (twilioError.code === 60200) {
        // Use a generic message since phoneNumber might not be in scope here
        return NextResponse.json({ 
          error: "Invalid phone number format. Please use E.164 format (e.g., +15551234567)" 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ error: "Failed to send verification" }, { status: 500 })
  }
}