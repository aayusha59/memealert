"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWallet } from "@/contexts/WalletContext"
import { Loader2, Check, X, Phone } from "lucide-react"
import { toast } from "sonner"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import "@/styles/phone-input.css"

export default function PhoneVerification() {
  const { userId, phoneNumber: contextPhoneNumber, isPhoneVerified, setPhoneVerified } = useWallet()
  
  const [phoneNumber, setPhoneNumber] = useState(contextPhoneNumber || "")
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationStep, setVerificationStep] = useState<"phone" | "code" | "verified">(
    isPhoneVerified ? "verified" : "phone"
  )
  const [isVerifying, setIsVerifying] = useState(false)
  const [phoneNumberError, setPhoneNumberError] = useState("")

  // Update local state when context changes
  useEffect(() => {
    setPhoneNumber(contextPhoneNumber || "")
    if (isPhoneVerified) {
      setVerificationStep("verified")
    }
  }, [contextPhoneNumber, isPhoneVerified])

  // Phone number validation and formatting
  const validatePhoneNumber = (phone: string) => {
    // The phone input component already validates the phone number
    // and ensures it's in the correct format with country code
    if (!phone) {
      return "Phone number is required"
    }
    
    // Make sure the phone number starts with a +
    if (!phone.startsWith('+')) {
      return "Phone number must include country code"
    }
    
    // Remove all non-digit characters except the leading +
    const digitsWithPlus = phone.replace(/(?!^\+)[^0-9]/g, '')
    
    if (digitsWithPlus.length < 8) { // +country_code + number (min 7 digits)
      return "Phone number is too short"
    }
    
    if (digitsWithPlus.length > 16) { // +country_code + number (max 15 digits)
      return "Phone number is too long"
    }
    
    return ""
  }

  const formatPhoneNumber = (phone: string) => {
    // PhoneInput component already returns the number in international format
    // but we need to make sure it starts with a + for E.164 format
    if (!phone.startsWith('+')) {
      return `+${phone}`
    }
    
    return phone
  }

  const sendVerificationCode = async () => {
    console.log('🔍 sendVerificationCode called with:', { phoneNumber, userId })
    
    if (!phoneNumber) {
      console.log('❌ No phone number provided')
      return
    }
    
    if (!userId) {
      console.log('❌ No userId available')
      toast.error("Please connect your wallet first")
      return
    }

    setIsVerifying(true)
    console.log('✅ Starting verification code send...')
    
    try {
      // Format phone number for Twilio (E.164 format)
      const twilioPhoneNumber = formatPhoneNumber(phoneNumber)
      console.log('📱 Formatted phone number:', twilioPhoneNumber)
      
      console.log('📡 Making API call to /api/send-verification')
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: twilioPhoneNumber, userId }),
      })
      
      console.log('📡 API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ API success:', data)
        setVerificationStep("code")
        toast.success("Verification code sent")
      } else {
        const errorData = await response.json()
        console.log('❌ API error:', errorData)
        toast.error(errorData.error || "Failed to send verification code")
      }
    } catch (error) {
      console.log('❌ Fetch error:', error)
      toast.error("Error sending verification code")
      console.error("Error sending verification code:", error)
    } finally {
      console.log('🏁 Setting isVerifying to false')
      setIsVerifying(false)
    }
  }

  const verifyCode = async () => {
    if (!verificationCode) return
    
    if (!userId) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsVerifying(true)
    
    try {
      // Format phone number for Twilio (E.164 format)
      const twilioPhoneNumber = formatPhoneNumber(phoneNumber)
      
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: twilioPhoneNumber, code: verificationCode, userId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setVerificationStep("verified")
          setPhoneVerified(true, phoneNumber)
          toast.success("Phone number verified successfully!")
        } else {
          toast.error("Invalid verification code")
        }
      } else {
        const data = await response.json()
        toast.error(data.error || "Failed to verify code")
      }
    } catch (error) {
      toast.error("Error verifying code")
      console.error("Error verifying code:", error)
    } finally {
      setIsVerifying(false)
    }
  }

  const changePhoneNumber = () => {
    setPhoneNumber("")
    setVerificationCode("")
    setVerificationStep("phone")
    setPhoneNumberError("")
    setPhoneVerified(false, "")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Phone className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Phone Verification</h3>
      </div>

      {verificationStep === "phone" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone-input" className="text-sm font-medium mb-1 block">
              Phone Number
            </Label>
            <div className={`phone-input-container ${phoneNumberError ? 'error' : ''}`}>
              <PhoneInput
                country={"us"}
                value={phoneNumber.replace(/^\+/, '')}
                onChange={(value) => {
                  const formattedValue = `+${value}`
                  setPhoneNumber(formattedValue)
                  setPhoneNumberError(validatePhoneNumber(formattedValue))
                }}
                inputProps={{
                  id: "phone-input",
                  name: "phone",
                  required: true,
                }}
                containerClass="phone-input-container"
                dropdownClass="phone-dropdown"
                searchClass="phone-search"
                enableSearch={true}
                disableSearchIcon={false}
                countryCodeEditable={false}
                specialLabel={""}
                preferredCountries={["us", "ca", "gb", "au"]}
              />
            </div>
            {phoneNumberError ? (
              <p className="text-xs text-red-500 mt-1">{phoneNumberError}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Select your country code and enter your phone number
              </p>
            )}
          </div>
          <Button
            onClick={sendVerificationCode}
            disabled={isVerifying || !phoneNumber || !!phoneNumberError || (phoneNumber ? phoneNumber.replace(/\D/g, '').length < 10 : true)}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending Code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </div>
      )}

      {verificationStep === "code" && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="code-input" className="text-sm font-medium mb-1 block">
              Verification Code
            </Label>
            <Input
              id="code-input"
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              maxLength={6}
              className="w-full text-center text-lg font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setVerificationStep("phone")
                setVerificationCode("")
              }}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={verifyCode}
              disabled={isVerifying || !verificationCode || verificationCode.length !== 6}
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </div>
          <div className="text-center">
            <Button
              onClick={sendVerificationCode}
              disabled={isVerifying}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Didn't receive code? Resend
            </Button>
          </div>
        </div>
      )}

      {verificationStep === "verified" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-500">
            <Check className="h-5 w-5" />
            <span className="font-medium">Phone number verified: {phoneNumber}</span>
          </div>
          <Button
            onClick={changePhoneNumber}
            variant="outline"
            className="w-full"
          >
            Change Phone Number
          </Button>
        </div>
      )}
    </div>
  )
}
