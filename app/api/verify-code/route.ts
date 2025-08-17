import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { savePhoneVerification, saveNotificationSettings } from "@/lib/supabase"

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code, userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID as string)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      })

    const isApproved = verificationCheck.status === "approved"

    if (isApproved) {
      // Update phone verification status in Supabase
      await savePhoneVerification(userId, phoneNumber, true)
      
      // Enable SMS notifications by default when phone is verified
      await saveNotificationSettings(userId, {
        pushEnabled: true,
        smsEnabled: true,
        callsEnabled: false
      })
    }

    return NextResponse.json({
      success: isApproved,
      status: verificationCheck.status,
    })
  } catch (error) {
    console.error("Twilio verification check error:", error)
    return NextResponse.json({ error: "Failed to verify code" }, { status: 500 })
  }
}
