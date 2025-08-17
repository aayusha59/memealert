import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { supabase, savePhoneVerification } from "@/lib/supabase"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Generate a verification code
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      })

    // Save the verification attempt to Supabase
    await savePhoneVerification(userId, phoneNumber)

    // Update verification attempts
    await supabase
      .from('phone_verifications')
      .update({
        verification_attempts: 1, // Increment by 1 for now
        last_verification_attempt: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)

    return NextResponse.json({ success: true, status: verification.status })
  } catch (error) {
    console.error("Twilio verification error:", error)
    return NextResponse.json({ error: "Failed to send verification" }, { status: 500 })
  }
}
