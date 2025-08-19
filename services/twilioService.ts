import twilio from 'twilio'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const phoneNumber = process.env.TWILIO_PHONE_NUMBER

if (!accountSid || !authToken || !phoneNumber) {
  console.warn('⚠️ Twilio credentials not found. SMS verification will not work.')
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null

// Generate a 6-digit verification code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send SMS verification code
export async function sendVerificationCode(phoneNumber: string, code: string): Promise<boolean> {
  if (!client) {
    console.error('❌ Twilio client not initialized')
    throw new Error('SMS service not configured')
  }

  try {
    const message = await client.messages.create({
      body: `Your Memealert verification code is: ${code}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })

    console.log('✅ SMS sent successfully:', message.sid)
    return true
  } catch (error) {
    console.error('❌ Error sending SMS:', error)
    throw error
  }
}

// Store verification codes in memory (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; timestamp: number; phoneNumber: string }>()

// Store verification code
export function storeVerificationCode(userId: string, phoneNumber: string, code: string): void {
  verificationCodes.set(userId, {
    code,
    timestamp: Date.now(),
    phoneNumber
  })

  // Clean up expired codes (older than 10 minutes)
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
  for (const [key, value] of verificationCodes.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      verificationCodes.delete(key)
    }
  }
}

// Verify code
export function verifyCode(userId: string, inputCode: string): { isValid: boolean; phoneNumber?: string } {
  const storedData = verificationCodes.get(userId)
  
  if (!storedData) {
    return { isValid: false }
  }

  // Check if code has expired (10 minutes)
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
  if (storedData.timestamp < tenMinutesAgo) {
    verificationCodes.delete(userId)
    return { isValid: false }
  }

  // Check if code matches
  if (storedData.code === inputCode) {
    const phoneNumber = storedData.phoneNumber
    verificationCodes.delete(userId) // Remove used code
    return { isValid: true, phoneNumber }
  }

  return { isValid: false }
}

// Clean up expired codes periodically
setInterval(() => {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
  for (const [key, value] of verificationCodes.entries()) {
    if (value.timestamp < tenMinutesAgo) {
      verificationCodes.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean up every 5 minutes
